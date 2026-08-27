/* ==========================================================================
   HAHNE DIGITAL – Systemstrang
   --------------------------------------------------------------------------
   Ein durchgehender technischer Strang läuft im Seitenrand von der ersten
   bis zur letzten Sektion. Jede Sektion hat darauf einen Knoten. Was man
   bereits gelesen hat, ist verbunden und aktiv; was noch kommt, liegt
   unverbunden davor. Beim Erreichen einer Sektion läuft ein Signal vom
   vorigen Knoten zum neuen – die Seite baut sich beim Scrollen als System
   zusammen, statt aus einzelnen Effekten zu bestehen.

   Bewusste technische Entscheidungen
   · Ein einziges, bildschirmfestes Canvas – gezeichnet wird nur der
     Ausschnitt, der gerade im Bild liegt.
   · Die Knotenpositionen stammen aus den echten Sektionen im Dokument,
     werden einmal gemessen und nur bei Größenänderung neu bestimmt.
   · Die Schleife läuft ausschließlich, solange wirklich etwas in Bewegung
     ist (Signal unterwegs oder Ringe klingen aus). Sonst wird nur bei
     Scroll neu gezeichnet.
   · Unterhalb von 1180 px gibt es keinen Seitenrand für den Strang – dort
     wird er gar nicht erst aufgebaut.
   · prefers-reduced-motion: alles wird gezeichnet, aber ohne Signale und
     ohne Schleife.
   ========================================================================== */
(function () {
  "use strict";

  var leiser = window.matchMedia("(prefers-reduced-motion: reduce)");
  var platz = window.matchMedia("(min-width: 1180px)");

  function start() {
    var abschnitte = Array.prototype.slice.call(
      document.querySelectorAll("[data-strang]")
    );
    if (abschnitte.length < 3) return;

    var canvas = document.createElement("canvas");
    canvas.className = "strang";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) { canvas.remove(); return; }

    var akzent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent-ink").trim() || "#5ad3de";

    var b = 0, h = 0, dpr = 1, x = 0;
    var knoten = [];          // { el, y (Dokument-y), aktiv, ring }
    var hell = [];            // helle Szenen als Dokumentbereiche
    var signale = [];         // { von, nach, t }
    var laeuft = false, letzte = 0, geplant = false, aktivBis = -1;

    /* --- Messen ----------------------------------------------------------- */
    function messen() {
      var an = platz.matches;
      canvas.classList.toggle("ist-an", an);
      if (!an) return false;

      var bezug = document.querySelector(".wrap");
      var rand = bezug ? bezug.getBoundingClientRect().left : 0;
      x = Math.round(Math.max(18, rand - 34)) + 0.5;

      // Das Canvas ist nur so breit wie die Spalte, in der gezeichnet wird.
      // Ein bildschirmfüllendes Canvas müsste bei jedem Scroll-Bild komplett
      // geleert werden – das kostet Millisekunden für nichts.
      b = Math.ceil(x + 30);
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(b * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = b + "px";
      canvas.style.height = h + "px";

      var scroll = window.scrollY || window.pageYOffset || 0;

      // Der Strang läuft über die Flächen hinweg, damit er nicht an jeder
      // hellen Szene abreißt. Damit er dort lesbar bleibt, werden die hellen
      // Bereiche einmal ausgemessen und die Farben je Höhe umgekehrt –
      // dieselbe Regel wie beim Sektionsanzeiger.
      hell = Array.prototype.map.call(
        document.querySelectorAll(".tone-light"),
        function (el) {
          var r = el.getBoundingClientRect();
          return { von: r.top + scroll, bis: r.bottom + scroll };
        }
      );

      knoten = abschnitte.map(function (el, i) {
        var r = el.getBoundingClientRect();
        return {
          el: el,
          // Der Knoten sitzt auf Höhe der Überschrift, nicht in der Mitte des
          // Abschnitts – dort erwartet ihn das Auge.
          y: r.top + scroll + Math.min(r.height * 0.28, 150),
          nr: i + 1,
          aktiv: false,
          ring: 0
        };
      });
      aktivBis = -1;
      return true;
    }

    /* --- Zustand aus der Scrollposition ableiten -------------------------- */
    function pruefen() {
      var linie = (window.scrollY || 0) + h * 0.62;
      var neu = -1;
      for (var i = 0; i < knoten.length; i++) if (knoten[i].y <= linie) neu = i;
      if (neu === aktivBis) return false;

      var bewegt = false;
      if (neu > aktivBis) {
        for (var j = aktivBis + 1; j <= neu; j++) {
          knoten[j].aktiv = true;
          knoten[j].ring = 1;
          if (j > 0 && !leiser.matches) signale.push({ von: j - 1, nach: j, t: 0 });
          bewegt = true;
        }
      } else {
        for (var k = knoten.length - 1; k > neu; k--) knoten[k].aktiv = false;
        bewegt = true;
      }
      aktivBis = neu;
      return bewegt;
    }

    /* --- Zeichnen ---------------------------------------------------------- */
    function zeichnen() {
      if (!platz.matches || !knoten.length) return;
      var scroll = window.scrollY || 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, b, h);

      var erst = knoten[0].y - scroll;
      var letzt = knoten[knoten.length - 1].y - scroll;
      if (letzt < -40 || erst > h + 40) return;

      ctx.lineCap = "butt";

      // Grundstrang und verbundener Abschnitt: in kurzen Stücken gezeichnet,
      // damit der Farbwechsel an der Kante einer hellen Szene mitläuft.
      var vonY = Math.max(-10, erst);
      var bisY = Math.min(h + 10, letzt);
      var aktivY = aktivBis > 0 ? Math.min(bisY, knoten[aktivBis].y - scroll) : -1e9;
      var schritt = 24;
      ctx.lineWidth = 1;
      for (var sy = vonY; sy < bisY; sy += schritt) {
        var sy2 = Math.min(sy + schritt, bisY);
        var mitte = (sy + sy2) / 2 + scroll;
        var verbunden = sy2 <= aktivY;
        ctx.strokeStyle = verbunden ? hexAlpha(signal(mitte), 0.34) : grund(mitte, 0.09);
        ctx.beginPath();
        ctx.moveTo(x, sy); ctx.lineTo(x, sy2);
        ctx.stroke();
      }

      // Knoten
      for (var i = 0; i < knoten.length; i++) {
        var k = knoten[i];
        var y = k.y - scroll;
        if (y < -30 || y > h + 30) continue;

        var farbe = signal(k.y);
        if (k.ring > 0.01) {
          // Kurzer Ring beim Aktivieren – kein Dauerpuls
          ctx.strokeStyle = hexAlpha(farbe, 0.42 * k.ring);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 4 + (1 - k.ring) * 13, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (k.aktiv) {
          ctx.fillStyle = farbe;
          ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
          // Anschlussstrich zur Sektion hin
          ctx.strokeStyle = hexAlpha(farbe, 0.34);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 6, y); ctx.lineTo(x + 15, y);
          ctx.stroke();
        } else {
          ctx.strokeStyle = grund(k.y, 0.24);
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
        }
      }

      // Signale zwischen zwei Knoten
      for (var s = 0; s < signale.length; s++) {
        var sig = signale[s];
        var a = knoten[sig.von].y - scroll, z = knoten[sig.nach].y - scroll;
        var y2 = a + (z - a) * weich(sig.t);
        if (y2 < -20 || y2 > h + 20) continue;
        ctx.fillStyle = signal(y2 + scroll);
        ctx.globalAlpha = Math.min(1, Math.sin(sig.t * Math.PI) * 1.6);
        ctx.fillRect(x - 1.5, y2 - 4, 3, 8);
        ctx.globalAlpha = 1;
      }
    }

    function weich(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    // Liegt diese Dokumenthöhe über einer hellen Szene?
    function aufHell(dokY) {
      for (var i = 0; i < hell.length; i++) {
        if (dokY >= hell[i].von && dokY <= hell[i].bis) return true;
      }
      return false;
    }
    function grund(dokY, alpha) {
      return aufHell(dokY)
        ? "rgba(15,20,23," + alpha + ")"
        : "rgba(243,245,246," + alpha + ")";
    }
    function signal(dokY) { return aufHell(dokY) ? "#0a545d" : akzent; }

    function hexAlpha(hex, a) {
      var c = hex.replace("#", "");
      if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      var n = parseInt(c, 16);
      if (isNaN(n) || c.length !== 6) return "rgba(79,195,206," + a + ")";
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    /* --- Schleife: läuft nur, solange sich wirklich etwas bewegt ---------- */
    function schleife(jetzt) {
      var dt = Math.max(0, Math.min((jetzt - letzte) / 1000, 0.05));
      letzte = jetzt;
      var i;
      for (i = signale.length - 1; i >= 0; i--) {
        signale[i].t += dt / 0.62;
        if (signale[i].t >= 1) signale.splice(i, 1);
      }
      var ringe = false;
      for (i = 0; i < knoten.length; i++) {
        if (knoten[i].ring > 0) {
          knoten[i].ring = Math.max(0, knoten[i].ring - dt / 0.9);
          if (knoten[i].ring > 0) ringe = true;
        }
      }
      zeichnen();
      if (signale.length || ringe) requestAnimationFrame(schleife);
      else laeuft = false;
    }

    function anstossen() {
      if (laeuft || leiser.matches || document.hidden) { zeichnen(); return; }
      laeuft = true;
      letzte = performance.now();
      requestAnimationFrame(schleife);
    }

    function beiScroll() {
      if (geplant) return;
      geplant = true;
      requestAnimationFrame(function () {
        geplant = false;
        if (!platz.matches) return;
        var bewegt = pruefen();
        if (bewegt) anstossen(); else zeichnen();
      });
    }

    function aufbauen() {
      if (!messen()) return;
      pruefen();
      // Beim ersten Aufbau ohne Signale und ohne Ringe starten: die Seite
      // soll ruhig beginnen, nicht mit einem Feuerwerk.
      signale.length = 0;
      for (var i = 0; i < knoten.length; i++) knoten[i].ring = 0;
      zeichnen();
    }

    window.addEventListener("scroll", beiScroll, { passive: true });
    window.addEventListener("resize", function () {
      if (messen()) { pruefen(); zeichnen(); }
    }, { passive: true });
    if (platz.addEventListener) {
      platz.addEventListener("change", function () { aufbauen(); });
    }
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) zeichnen();
    });
    // Sektionen können nachwachsen (Modulkatalog, Sprachwechsel): neu messen,
    // aber ohne Signalfeuer.
    document.addEventListener("sprachwechsel", function () {
      window.setTimeout(function () { if (messen()) { pruefen(); zeichnen(); } }, 60);
    });

    aufbauen();
    // Nach dem Laden der Bilder/Schriften kann sich die Höhe noch ändern
    window.addEventListener("load", function () {
      if (messen()) { pruefen(); zeichnen(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
