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

  /* --- Scroll-Fortschritt (Sticky-Assembling-Sequenzen) -------------------- */
  var scrubEls = Array.prototype.slice.call(document.querySelectorAll("[data-scrub]"));
  if (scrubEls.length) {
    if (reduceMotion) {
      scrubEls.forEach(function (el) {
        el.style.setProperty("--p", "1");
        el.style.setProperty("--spread", "0");
        el.classList.add("is-settled");
      });
    } else {
      var ticking = false;

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
})();
