/* ==========================================================================
   HAHNE DIGITAL – Bewegungssystem
   --------------------------------------------------------------------------
   Ergänzt die bestehende Interaktionslogik (assets/main.js) um die
   scrollgetriebenen Teile der Inszenierung. Bewusst modular aufgebaut:
   jede Funktion prüft zuerst, ob ihre Elemente überhaupt vorhanden sind,
   damit auf Unterseiten keine Fehler entstehen.

     initMotionPreferences()  – respektiert prefers-reduced-motion
     initNavState()           – Navigation wird beim Scrollen ruhig dunkler
     initParallax()           – sehr zurückhaltende Tiefenbewegung im Hero
     initScrollScenes()       – Fortschritt der Prozess-Timeline
     initSectionTransitions() – weiche Übergänge zwischen den Seiten

   Es gibt genau einen Scroll-Zuhörer; alle Messungen laufen gebündelt in
   einem requestAnimationFrame.
   ========================================================================== */
(function () {
  "use strict";

  var leiser = window.matchMedia("(prefers-reduced-motion: reduce)");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var aufgaben = [];        // Funktionen, die bei jedem Scroll-Frame laufen
  var geplant = false;

  function planen() {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(function () {
      geplant = false;
      for (var i = 0; i < aufgaben.length; i++) aufgaben[i]();
    });
  }

  function beiScroll(fn) {
    aufgaben.push(fn);
    fn();
  }

  /* --- Navigation ---------------------------------------------------------- */
  function initNavState() {
    var nav = $(".nav");
    if (!nav) return;
    var an = false;
    beiScroll(function () {
      var soll = window.scrollY > 10;
      if (soll !== an) { an = soll; nav.classList.toggle("is-scrolled", soll); }
    });
  }

  /* --- Hero-Parallaxe ------------------------------------------------------ */
  function initParallax() {
    if (leiser.matches) return;
    var hero = $(".hero");
    if (!hero) return;
    var ebenen = $$("[data-parallax]", hero);
    if (!ebenen.length) return;
    beiScroll(function () {
      var y = window.scrollY;
      if (y > window.innerHeight * 1.4) return;      // außerhalb des Blicks: nichts tun
      for (var i = 0; i < ebenen.length; i++) {
        var f = parseFloat(ebenen[i].getAttribute("data-parallax")) || 0;
        ebenen[i].style.transform = "translate3d(0," + (y * f).toFixed(2) + "px,0)";
      }
    });
  }

  /* --- Prozess-Timeline ---------------------------------------------------- */
  function initScrollScenes() {
    var liste = $("[data-process]");
    if (!liste) return;
    var schritte = $$(".process-step", liste);
    if (!schritte.length) return;

    if (leiser.matches) {
      liste.style.setProperty("--p", "100%");
      schritte.forEach(function (s) { s.classList.add("is-passed"); });
      return;
    }

    beiScroll(function () {
      var r = liste.getBoundingClientRect();
      var hoehe = window.innerHeight || 800;
      // Auch außerhalb des Bildes wird der Endwert gesetzt, damit der
      // Fortschritt beim Zurückscrollen nie auf einem alten Stand hängt.
      var start = hoehe * 0.82;
      var strecke = r.height + hoehe * 0.35;
      var p = Math.max(0, Math.min(1, (start - r.top) / strecke));
      liste.style.setProperty("--p", (p * 100).toFixed(1) + "%");
      for (var i = 0; i < schritte.length; i++) {
        schritte[i].classList.toggle("is-passed", p >= (i + 0.35) / schritte.length);
      }
    });
  }

  /* --- Seitenübergänge (nur als Verbesserung, nie als Voraussetzung) ------- */
  function initSectionTransitions() {
    if (leiser.matches) return;
    if (!document.body) return;

    var schleier = document.createElement("div");
    schleier.className = "page-fade";
    schleier.setAttribute("aria-hidden", "true");
    document.body.appendChild(schleier);

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      var href = a.getAttribute("href") || "";
      if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return;
      var ziel;
      try { ziel = new URL(a.href, window.location.href); } catch (fehler) { return; }
      if (ziel.origin !== window.location.origin) return;
      if (ziel.pathname === window.location.pathname && ziel.search === window.location.search) return;

      e.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(function () { window.location.href = a.href; }, 180);
    });

    // Zurück-Navigation aus dem Verlaufsspeicher darf nie verschleiert bleiben
    window.addEventListener("pageshow", function () {
      document.body.classList.remove("is-leaving");
    });
  }

  /* --- Zeigerlicht auf Premium-Flächen -------------------------------------
     Nur auf Geräten mit echtem Zeiger (Maus/Trackpad) und ohne reduzierte
     Bewegung. Ohne JavaScript oder auf Touch bleibt die Fläche unverändert –
     die Karten sind vollständig ohne dieses Extra bedienbar.
     Ein einziger delegierter Zuhörer statt vieler: funktioniert dadurch auch
     für Karten, die später neu gerendert werden (z. B. der Modulkatalog nach
     einer Suche), ohne dass Zuhörer neu angemeldet werden müssten. */
  function initSpotlight() {
    if (leiser.matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    var hängt = false, ziel = null, x = 50, y = 50;
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".spotlight");
      if (!el) return;
      var r = el.getBoundingClientRect();
      ziel = el;
      x = ((e.clientX - r.left) / r.width) * 100;
      y = ((e.clientY - r.top) / r.height) * 100;
      if (hängt) return;
      hängt = true;
      requestAnimationFrame(function () {
        if (ziel) { ziel.style.setProperty("--mx", x + "%"); ziel.style.setProperty("--my", y + "%"); }
        hängt = false;
      });
    }, { passive: true });
  }

  /* --- Hero-Bühne neigt sich minimal zur Zeigerposition --------------------
     Reine Zugabe für Maus/Trackpad: sehr kleiner Winkel, weich gedämpft. */
  function initHeroTilt() {
    if (leiser.matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    var buehne = $(".hero-stage");
    if (!buehne) return;
    var hängt = false, rx = 0, ry = 0;
    buehne.addEventListener("pointermove", function (e) {
      var r = buehne.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5;
      var py = (e.clientY - r.top) / r.height - .5;
      ry = px * 7; rx = py * -7;
      if (hängt) return;
      hängt = true;
      requestAnimationFrame(function () {
        buehne.style.transform = "perspective(1200px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
        hängt = false;
      });
    });
    buehne.addEventListener("pointerleave", function () {
      buehne.style.transform = "";
    });
  }

  /* --- Decode-Effekt auf den technischen Beschriftungen ---------------------
     Die Mono-Labels (Kicker, Eyebrow) laufen einmalig aus zufälligen Zeichen
     in den echten Text. Bewusst nur auf diesen kurzen technischen Marken –
     nie auf Fließtext oder Überschriften, damit nichts unleserlich wird.
     Der echte Text steht durchgehend im DOM-Knoten, sobald der Lauf endet. */
  var GLYPHEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+=<>_";
  var laufende = [];        // aktuell laufende Läufe, damit sie abbrechbar sind

  function decodeText(el) {
    var ziel = el.textContent;
    if (!ziel || ziel.length > 42) return;
    var schritte = 0, gesamt = 14 + ziel.length;
    var lauf = { el: el, ziel: ziel };
    lauf.timer = window.setInterval(function () {
      schritte++;
      var fest = Math.floor((schritte / gesamt) * ziel.length);
      var raus = "", i;
      for (i = 0; i < ziel.length; i++) {
        var z = ziel.charAt(i);
        if (i < fest || z === " " || z === "·") raus += z;
        else raus += GLYPHEN.charAt(Math.floor(Math.random() * GLYPHEN.length));
      }
      el.textContent = raus;
      if (schritte >= gesamt) {
        beenden(lauf);
        el.textContent = ziel;          // immer der echte Text am Ende
      }
    }, 28);
    laufende.push(lauf);
  }

  function beenden(lauf) {
    window.clearInterval(lauf.timer);
    var i = laufende.indexOf(lauf);
    if (i > -1) laufende.splice(i, 1);
  }

  // Beim Sprachwechsel würde ein noch laufender Lauf den frisch übersetzten
  // Text mit der alten Sprache überschreiben. Alle Läufe werden deshalb hier
  // abgebrochen. Wem i18n den Text gesetzt hat (data-t), der behält den neuen
  // Text; alle übrigen bekommen ihren echten Text zurück, damit nie eine
  // halb verwürfelte Beschriftung stehen bleibt.
  document.addEventListener("sprachwechsel", function () {
    while (laufende.length) {
      var lauf = laufende[0];
      beenden(lauf);
      if (!lauf.el.hasAttribute("data-t")) lauf.el.textContent = lauf.ziel;
    }
  });

  function initScramble() {
    if (leiser.matches) return;
    if (!("IntersectionObserver" in window)) return;
    var marken = $$(".kicker, .eyebrow, .statement-mark");
    if (!marken.length) return;
    var obs = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        decodeText(e.target);
      });
    }, { threshold: .6 });
    marken.forEach(function (el) { obs.observe(el); });
  }

  /* --- Scroll-Fortschritt als feine Linie über der Navigation -------------- */
  function initScrollProgress() {
    if (!document.body) return;
    var linie = document.createElement("div");
    linie.className = "scroll-progress";
    linie.setAttribute("aria-hidden", "true");
    document.body.appendChild(linie);
    beiScroll(function () {
      var doc = document.documentElement;
      var streck = (doc.scrollHeight - window.innerHeight) || 1;
      var p = Math.max(0, Math.min(1, window.scrollY / streck));
      linie.style.transform = "scaleX(" + p.toFixed(4) + ")";
    });
  }

  /* --- HUD-Rail: technischer Sektionsanzeiger am rechten Rand --------------
     Wird aus den vorhandenen Ankern der Hauptnavigation aufgebaut, hat also
     immer genau die Abschnitte, die es auf der Seite auch wirklich gibt.
     Rein orientierend und daher aus dem Vorlesefluss genommen – dieselben
     Ziele sind über die Navigation vollwertig erreichbar. */
  function initSectionRail() {
    var anker = $$('#navlinks a[href^="#"]');
    if (anker.length < 3) return;
    var ziele = [];
    anker.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sek = document.getElementById(id);
      if (sek) ziele.push({ id: id, name: a.textContent.trim(), sektion: sek });
    });
    if (ziele.length < 3) return;

    var rail = document.createElement("div");
    rail.className = "rail";
    rail.setAttribute("aria-hidden", "true");
    rail.innerHTML = ziele.map(function (z, i) {
      var nr = (i + 1 < 10 ? "0" : "") + (i + 1);
      return '<a class="rail-punkt" href="#' + z.id + '" tabindex="-1">' +
             '<span class="rail-nr">' + nr + "</span>" +
             '<span class="rail-name">' + z.name + "</span></a>";
    }).join("");
    document.body.appendChild(rail);

    var punkte = $$(".rail-punkt", rail);
    if (!("IntersectionObserver" in window)) return;
    var spy = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        for (var i = 0; i < ziele.length; i++) {
          punkte[i].classList.toggle("an", ziele[i].sektion === e.target);
        }
        // Das Rail steht fest über der Seite, der Grund darunter wechselt
        // zwischen dunklen und hellen Szenen. Der Messbereich dieses
        // Beobachters liegt genau auf Höhe des Rails, taugt also als
        // Anhaltspunkt, welche Farbwelt gerade darunter liegt.
        rail.classList.toggle("auf-hell", !!e.target.closest(".tone-light"));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ziele.forEach(function (z) { spy.observe(z.sektion); });
  }

  /* --- Zusammenspiel ------------------------------------------------------- */
  function initMotionPreferences() {
    document.documentElement.classList.toggle("reduziert", leiser.matches);
    // Zustandswechsel (z. B. die Navigation) bleiben auch bei reduzierter
    // Bewegung sinnvoll – nur die Bewegungsanteile selbst entfallen.
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen, { passive: true });
  }

  function start() {
    initNavState();
    initParallax();
    initScrollScenes();
    initSectionTransitions();
    initSpotlight();
    initHeroTilt();
    initScramble();
    initScrollProgress();
    initSectionRail();
    initMotionPreferences();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
