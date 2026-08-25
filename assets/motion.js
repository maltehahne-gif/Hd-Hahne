/* ==========================================================================
   HAHNE DIGITAL – Bewegungssystem
   --------------------------------------------------------------------------
   Ein einziger Bewegungs-Zuständiger für die gesamte Seite. Jede Funktion
   prüft zuerst, ob ihre Elemente überhaupt vorhanden sind, damit auf
   Unterseiten keine Fehler entstehen.

     initMotionPreferences()  – prefers-reduced-motion, ein Scroll-Zuhörer
     initNavState()           – Navigation wird beim Scrollen ruhig dunkler
     initSceneProgress()      – --sp je Szene: Grundlage für Tiefenbewegung
     initReveals()            – Masken-Reveals statt Ein- und Hochblenden
     initProcess()            – Fortschritt der Prozess-Timeline
     initSpotlight()          – Zeigerlicht auf Premium-Flächen
     initHeroTilt()           – minimale Neigung der Hero-Bühne
     initMagnetic()           – Handlungsaufforderungen ziehen leicht an
     initDecode()             – technische Marken laufen einmalig ein
     initScrollProgress()     – haarfeine Fortschrittslinie
     initSectionRail()        – Sektionsanzeiger am rechten Rand
     initPageFade()           – weicher Seitenwechsel

   Es gibt genau einen Scroll- und einen Resize-Zuhörer; alle Messungen
   laufen gebündelt in einem requestAnimationFrame.
   ========================================================================== */
(function () {
  "use strict";

  var leiser = window.matchMedia("(prefers-reduced-motion: reduce)");
  var feinerZeiger = window.matchMedia("(pointer: fine)");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var klemmen = function (v, min, max) { return v < min ? min : v > max ? max : v; };

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

  /* --- Szenenfortschritt ---------------------------------------------------
     Jede Szene bekommt --sp (0 … 1): 0, wenn sie gerade von unten ins Bild
     kommt, 1, wenn sie oben hinausläuft. Daraus speisen sich sämtliche
     Tiefen- und Parallaxbewegungen – ausschließlich über transform und
     opacity, also ohne Layoutberechnung.                                   */
  function initSceneProgress() {
    var szenen = $$("[data-scene]");
    if (!szenen.length) return;
    if (leiser.matches) {
      szenen.forEach(function (s) { s.style.setProperty("--sp", "0.5"); });
      return;
    }
    var werte = szenen.map(function () { return -1; });
    beiScroll(function () {
      var hoehe = window.innerHeight || 800;
      for (var i = 0; i < szenen.length; i++) {
        var r = szenen[i].getBoundingClientRect();
        if (r.bottom < -200 || r.top > hoehe + 200) continue;
        var p = klemmen((hoehe - r.top) / (hoehe + r.height), 0, 1);
        var gerundet = Math.round(p * 200) / 200;      // 0,5 % Schritte reichen
        if (gerundet === werte[i]) continue;
        werte[i] = gerundet;
        szenen[i].style.setProperty("--sp", gerundet);
      }
    });
  }

  /* --- Reveals -------------------------------------------------------------
     Masken statt Einblendungen: der Inhalt wird freigelegt, nicht
     eingeschaltet. Text wird dabei nie zerlegt – die Sprachumschaltung
     tauscht ganze Textknoten aus und würde sonst mit der Animation
     kollidieren.                                                            */
  function initReveals() {
    var elemente = $$(".reveal");
    if (!elemente.length) return;

    // Gestaffelte Kinder: der Index wandert als Variable in die Verzögerung
    $$("[data-stagger]").forEach(function (gruppe) {
      var kinder = Array.prototype.filter.call(gruppe.children, function (k) {
        return k.nodeType === 1;
      });
      kinder.forEach(function (k, i) { k.style.setProperty("--i", i); });
    });

    if (leiser.matches || !("IntersectionObserver" in window)) {
      elemente.forEach(function (el) { el.classList.add("show"); });
      return;
    }
    var obs = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("show");
        obs.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.02 });
    elemente.forEach(function (el) { obs.observe(el); });

    // Sicherheitsnetz: alles, was nach dem vollständigen Laden bereits im
    // Bild steht, wird auf jeden Fall gezeigt – auch wenn der Beobachter
    // durch einen Sprung ins Ankerziel übergangen wurde.
    window.addEventListener("load", function () {
      var hoehe = window.innerHeight || 800;
      elemente.forEach(function (el) {
        if (el.classList.contains("show")) return;
        var r = el.getBoundingClientRect();
        if (r.top < hoehe && r.bottom > 0) { el.classList.add("show"); obs.unobserve(el); }
      });
    });
  }

  /* --- Prozess-Timeline ---------------------------------------------------- */
  function initProcess() {
    var liste = $("[data-process]");
    if (!liste) return;
    var schritte = $$(".process-step", liste);
    if (!schritte.length) return;

    if (leiser.matches) {
      liste.style.setProperty("--p", "100%");
      schritte.forEach(function (s) { s.classList.add("is-passed"); });
      return;
    }

    var zuletzt = -1;
    beiScroll(function () {
      var r = liste.getBoundingClientRect();
      var hoehe = window.innerHeight || 800;
      // Auch außerhalb des Bildes wird der Endwert gesetzt, damit der
      // Fortschritt beim Zurückscrollen nie auf einem alten Stand hängt.
      var start = hoehe * 0.82;
      var strecke = r.height + hoehe * 0.35;
      var p = Math.round(klemmen((start - r.top) / strecke, 0, 1) * 200) / 200;
      // Nur schreiben, wenn sich der Wert wirklich ändert: eine gesetzte
      // Custom Property stößt sonst bei jedem Bild die Stilberechnung des
      // gesamten Teilbaums an.
      if (p === zuletzt) return;
      zuletzt = p;
      liste.style.setProperty("--p", (p * 100).toFixed(1) + "%");
      for (var i = 0; i < schritte.length; i++) {
        schritte[i].classList.toggle("is-passed", p >= (i + 0.35) / schritte.length);
      }
    });
  }

  /* --- Seitenwechsel (nur als Verbesserung, nie als Voraussetzung) --------- */
  function initPageFade() {
    if (leiser.matches || !document.body) return;

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
     Nur auf Geräten mit echtem Zeiger und ohne reduzierte Bewegung. Ein
     einziger delegierter Zuhörer statt vieler: funktioniert dadurch auch für
     Karten, die später neu gerendert werden (z. B. der Modulkatalog nach
     einer Suche), ohne dass Zuhörer neu angemeldet werden müssten.          */
  function initSpotlight() {
    if (leiser.matches || !feinerZeiger.matches) return;
    var haengt = false, ziel = null, x = 50, y = 50;
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".spotlight");
      if (!el) return;
      var r = el.getBoundingClientRect();
      ziel = el;
      x = ((e.clientX - r.left) / r.width) * 100;
      y = ((e.clientY - r.top) / r.height) * 100;
      if (haengt) return;
      haengt = true;
      requestAnimationFrame(function () {
        if (ziel) { ziel.style.setProperty("--mx", x + "%"); ziel.style.setProperty("--my", y + "%"); }
        haengt = false;
      });
    }, { passive: true });
  }

  /* --- Hero-Bühne neigt sich minimal zur Zeigerposition -------------------- */
  function initHeroTilt() {
    if (leiser.matches || !feinerZeiger.matches) return;
    var buehne = $(".hero-stage");
    if (!buehne) return;
    var haengt = false, rx = 0, ry = 0;
    buehne.addEventListener("pointermove", function (e) {
      var r = buehne.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5;
      var py = (e.clientY - r.top) / r.height - .5;
      ry = px * 5; rx = py * -5;
      if (haengt) return;
      haengt = true;
      requestAnimationFrame(function () {
        buehne.style.setProperty("--tilt-x", rx.toFixed(2) + "deg");
        buehne.style.setProperty("--tilt-y", ry.toFixed(2) + "deg");
        haengt = false;
      });
    });
    buehne.addEventListener("pointerleave", function () {
      buehne.style.setProperty("--tilt-x", "0deg");
      buehne.style.setProperty("--tilt-y", "0deg");
    });
  }

  /* --- Handlungsaufforderungen ziehen leicht an ----------------------------
     Sehr kleiner Weg (maximal 4 px) und nur an echten Zeigegeräten. Der
     Knopf bleibt exakt dort, wo er getroffen wurde – die Trefferfläche
     verschiebt sich also nicht unter dem Zeiger weg.                        */
  function initMagnetic() {
    if (leiser.matches || !feinerZeiger.matches) return;
    var ziele = $$("[data-magnet]");
    if (!ziele.length) return;
    ziele.forEach(function (el) {
      var haengt = false, dx = 0, dy = 0;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        dx = klemmen((e.clientX - (r.left + r.width / 2)) / r.width, -.5, .5) * 8;
        dy = klemmen((e.clientY - (r.top + r.height / 2)) / r.height, -.5, .5) * 5;
        if (haengt) return;
        haengt = true;
        requestAnimationFrame(function () {
          el.style.setProperty("--mag-x", dx.toFixed(2) + "px");
          el.style.setProperty("--mag-y", dy.toFixed(2) + "px");
          haengt = false;
        });
      }, { passive: true });
      el.addEventListener("pointerleave", function () {
        el.style.setProperty("--mag-x", "0px");
        el.style.setProperty("--mag-y", "0px");
      });
    });
  }

  /* --- Decode-Effekt auf den technischen Marken ----------------------------
     Die Mono-Marken (Kicker, Eyebrow, Sektionskennung) laufen einmalig aus
     wenigen technischen Zeichen in den echten Text. Bewusst nur auf diesen
     kurzen Marken – nie auf Fließtext oder Überschriften.

     Sprachwechsel: der maßgebliche Text ist immer der aus dem i18n-System.
     Läuft beim Wechsel noch eine Animation, wird sie abgebrochen und der
     Knoten aus der Übersetzung neu gesetzt – nie aus dem Zwischenstand.    */
  var GLYPHEN = "ABCDEFGHJKLMNPRSTUVXZ0123456789/#+=<>";
  var laufende = [];

  function echterText(el, ersatz) {
    var schluessel = el.getAttribute("data-t");
    if (schluessel && window.SPRACHE && typeof window.SPRACHE.text === "function") {
      var t = window.SPRACHE.text(schluessel);
      if (t) return t;
    }
    return ersatz;
  }

  function beenden(lauf, textSetzen) {
    window.clearInterval(lauf.timer);
    var i = laufende.indexOf(lauf);
    if (i > -1) laufende.splice(i, 1);
    if (textSetzen) lauf.el.textContent = echterText(lauf.el, lauf.ziel);
    lauf.el.classList.remove("decoding");
  }

  function decodeText(el) {
    // Nur reine Textknoten: sonst würde textContent Kindelemente entfernen
    if (el.children.length) return;
    var ziel = (el.textContent || "").trim();
    if (!ziel || ziel.length > 40) return;
    var lauf = { el: el, ziel: ziel };
    var schritte = 0, gesamt = 10 + Math.ceil(ziel.length * 0.7);
    el.classList.add("decoding");
    lauf.timer = window.setInterval(function () {
      schritte++;
      var fest = Math.floor((schritte / gesamt) * ziel.length);
      var raus = "", i, z;
      for (i = 0; i < ziel.length; i++) {
        z = ziel.charAt(i);
        if (i < fest || z === " " || z === "·" || z === "/") raus += z;
        else raus += GLYPHEN.charAt(Math.floor(Math.random() * GLYPHEN.length));
      }
      el.textContent = raus;
      if (schritte >= gesamt) beenden(lauf, true);
    }, 26);
    laufende.push(lauf);
  }

  document.addEventListener("sprachwechsel", function () {
    while (laufende.length) beenden(laufende[0], true);
  });

  function initDecode() {
    if (leiser.matches || !("IntersectionObserver" in window)) return;
    var marken = $$(".kicker, .eyebrow, .statement-mark, [data-decode]");
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

  /* --- Knopf „Nach oben“ ----------------------------------------------------
     Die Handlung selbst liegt in assets/main.js; hier hängt nur die
     Sichtbarkeit am gemeinsamen Scroll-Takt, damit es keinen zweiten
     Scroll-Zuhörer braucht. */
  function initToTop() {
    var knopf = document.getElementById("totop");
    if (!knopf) return;
    var an = false;
    beiScroll(function () {
      var soll = window.scrollY > 700;
      if (soll !== an) { an = soll; knopf.classList.toggle("show", soll); }
    });
  }

  /* --- Scroll-Fortschritt als feine Linie über der Navigation -------------- */
  function initScrollProgress() {
    if (!document.body) return;
    var linie = document.createElement("div");
    linie.className = "scroll-progress";
    linie.setAttribute("aria-hidden", "true");
    document.body.appendChild(linie);
    var vorher = -1;
    beiScroll(function () {
      var doc = document.documentElement;
      var streck = (doc.scrollHeight - window.innerHeight) || 1;
      var p = Math.round(klemmen(window.scrollY / streck, 0, 1) * 1000) / 1000;
      if (p === vorher) return;
      vorher = p;
      linie.style.transform = "scaleX(" + p.toFixed(3) + ")";
    });
  }

  /* --- Sektionsanzeiger am rechten Rand ------------------------------------
     Wird aus den vorhandenen Ankern der Hauptnavigation aufgebaut, hat also
     immer genau die Abschnitte, die es auf der Seite auch wirklich gibt.
     Rein orientierend und daher aus dem Vorlesefluss genommen – dieselben
     Ziele sind über die Navigation vollwertig erreichbar.                   */
  function initSectionRail() {
    var anker = $$('#navlinks a[href^="#"]');
    if (anker.length < 3) return;
    var ziele = [];
    anker.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sek = document.getElementById(id);
      if (sek) ziele.push({ id: id, name: a.textContent.trim(), sektion: sek, anker: a });
    });
    if (ziele.length < 3) return;

    var rail = document.createElement("div");
    rail.className = "rail";
    rail.setAttribute("aria-hidden", "true");
    rail.innerHTML = ziele.map(function (z, i) {
      var nr = (i + 1 < 10 ? "0" : "") + (i + 1);
      return '<a class="rail-punkt" href="#' + z.id + '" tabindex="-1">' +
             '<span class="rail-name"></span>' +
             '<span class="rail-nr">' + nr + "</span></a>";
    }).join("");
    document.body.appendChild(rail);

    var punkte = $$(".rail-punkt", rail);
    // Die Namen kommen aus der Navigation und werden bei jedem Sprachwechsel
    // von dort nachgezogen – so gibt es nur eine Textquelle.
    function namenSetzen() {
      ziele.forEach(function (z, i) {
        punkte[i].querySelector(".rail-name").textContent = z.anker.textContent.trim();
      });
    }
    namenSetzen();
    document.addEventListener("sprachwechsel", function () {
      window.setTimeout(namenSetzen, 0);
    });

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
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen, { passive: true });
  }

  function start() {
    initNavState();
    initSceneProgress();
    initReveals();
    initProcess();
    initSpotlight();
    initHeroTilt();
    initMagnetic();
    initDecode();
    initToTop();
    initScrollProgress();
    initSectionRail();
    initPageFade();
    initMotionPreferences();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
