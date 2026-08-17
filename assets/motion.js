/* ==========================================================================
   HAHNE DIGITAL – Motion
   --------------------------------------------------------------------------
   Reine Vanilla-JS-Lösung ohne zusätzliche Abhängigkeiten (bewusst kein
   GSAP/Lenis-CDN – siehe Kopf von style.css zum No-CDN-Prinzip dieser Seite).
   Zwei Bausteine:
     1. [data-reveal]  – IntersectionObserver-Einblendung für einzelne Szenen
     2. [data-scrub]   – liest die Scrollposition eines (meist sehr hohen)
        Containers und schreibt sie als CSS-Variable --p (0..1) sowie eine
        dreieckige Ableitung --spread (0 -> 1 -> 0) auf das Element. Die
        eigentliche Bewegung übernimmt CSS über calc(var(--p)) – so bleiben
        nur transform/opacity beteiligt (GPU-freundlich, kein Layout-Thrash).
   Reduzierte Bewegung (prefers-reduced-motion) schaltet das kontinuierliche
   Scrubbing ab und zeigt sofort den Endzustand.
   ========================================================================== */
(function () {
  "use strict";

  var mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = !!(mq && mq.matches);

  /* --- Szenen-Einblendung -------------------------------------------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: .18, rootMargin: "0px 0px -10% 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* Wird true, sobald die 3D-Szene wirklich läuft. Erst dann bekommt die
     Hero-Bühne ihre Abschnittsnummern (siehe unten). */
  var heroSzenen = false;

  /* --- Scroll-Fortschritt (Sticky-Assembling-Sequenzen) -------------------- */
  var scrubEls = Array.prototype.slice.call(document.querySelectorAll("[data-scrub]"));
  if (scrubEls.length) {
    if (reduceMotion) {
      scrubEls.forEach(function (el) {
        el.style.setProperty("--p", "1");
        el.style.setProperty("--spread", "0");
        el.classList.add("is-settled");
        /* Abschnitt 0 = Ruhezustand: die Textstufen werden nicht durchlaufen,
           sondern alle Kernaussagen stehen gleichzeitig und dauerhaft da. */
        if (el.id === "start") el.dataset.abschnitt = "0";
      });
    } else {
      var ticking = false;

      /* Grenzen der sieben Hero-Abschnitte (siehe Kopf von hero3d.js).
         Der Abschnitt steuert nur die Textchoreografie – das 3D rechnet
         mit dem stufenlosen Wert weiter. */
      var ABSCHNITTE = [0.10, 0.28, 0.44, 0.56, 0.70, 0.86];

      var abschnittVon = function (p) {
        for (var i = 0; i < ABSCHNITTE.length; i++) {
          if (p < ABSCHNITTE[i]) return i + 1;
        }
        return ABSCHNITTE.length + 1;
      };

      var update = function () {
        ticking = false;
        var vh = window.innerHeight;
        scrubEls.forEach(function (el) {
          var rect = el.getBoundingClientRect();
          var total = rect.height - vh;
          var raw = total > 0 ? (-rect.top) / total : (rect.top <= 0 ? 1 : 0);
          var p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
          el.style.setProperty("--p", p.toFixed(4));

          var spread = p < .5 ? p / .5 : (1 - p) / .5;
          spread = spread < 0 ? 0 : spread > 1 ? 1 : spread;
          el.style.setProperty("--spread", spread.toFixed(4));

          /* Abschnittsnummern nur, wenn die 3D-Szene läuft – ohne sie ist die
             Bühne kurz und statisch, da wäre eine Choreografie sinnlos.
             Und nur bei Wechsel: DOM-Schreibzugriffe pro Bild wären
             Verschwendung. */
          if (el.id === "start" && heroSzenen) {
            var a = String(abschnittVon(p));
            if (el.dataset.abschnitt !== a) el.dataset.abschnitt = a;
          }
        });
      };

      var onScroll = function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      update();
    }
  }

  /* --- Nummerierte Szenen: aktuelle Nummer optisch hervorheben ------------- */
  var scenes = Array.prototype.slice.call(document.querySelectorAll("[data-scene]"));
  if (scenes.length && "IntersectionObserver" in window) {
    var sceneIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-active", entry.isIntersecting);
      });
    }, { threshold: .5 });
    scenes.forEach(function (el) { sceneIo.observe(el); });
  } else {
    scenes.forEach(function (el) { el.classList.add("is-active"); });
  }

  /* --- 3D-Systemkern (optionale Aufwertung) --------------------------------
     Ob die Szene laufen darf, wurde bereits im Inline-Skript im <head> von
     index.html entschieden (window.HD_3D_OK) – dort muss es passieren, weil
     die Bühnenhöhe vor dem ersten Layout feststehen muss. Hier wird die
     Entscheidung nur noch ausgeführt.

     Three.js liegt lokal im Projekt, ist aber rund 750 kB groß und wird
     deshalb ausschließlich dynamisch geladen. Ohne 3D bleibt die gestaltete
     CSS-Fassung stehen – die Seite ist vollständig ohne sie verständlich.
     ------------------------------------------------------------------------ */
  (function () {
    var wurzel = document.documentElement;
    var canvas = document.getElementById("heroCanvas");
    var buehne = document.getElementById("start");
    if (!canvas || !buehne || reduceMotion) return;
    if (window.HD_3D_OK !== true) return;

    /* Sparmodus für schwächere Geräte: weniger Partikel, gröbere Ringe,
       kein Antialiasing, Pixelverhältnis 1. Die Szene bleibt dieselbe. */
    var kerne = navigator.hardwareConcurrency || 4;
    var speicher = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : null;
    var sparsam = kerne <= 4 || (speicher !== null && speicher <= 4);

    /* Die Textchoreografie wird sofort aktiviert – noch vor dem asynchronen
       Import. Würde sie erst danach umschalten, änderten sich Schriftgrößen
       und Positionen mitten im Layout, und das zählte als Layout Shift. */
    heroSzenen = true;
    buehne.dataset.abschnitt = "1";

    import("./hero3d.js")
      .then(function (modul) {
        modul.default(canvas, buehne, { sparsam: sparsam });
        /* hat-3d schaltet nur Sichtbarkeit um: Canvas ein, Ersatzgrafik aus.
           Kein Layout, damit kein Sprung entsteht. */
        wurzel.classList.add("hat-3d");
      })
      .catch(function () {
        /* Bewusst still: die CSS-Fassung ist bereits gestaltet und
           vollständig. Nur die reservierte Bühnenhöhe wird zurückgenommen,
           damit keine leere Scrollstrecke stehen bleibt. */
        heroSzenen = false;
        wurzel.classList.add("kein-3d");
        buehne.dataset.abschnitt = "0";
      });
  })();
})();
