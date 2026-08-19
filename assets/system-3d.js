/* ==========================================================================
   HAHNE DIGITAL – Signature-System (prozedurales 3D)
   --------------------------------------------------------------------------
   Zeichnet das Markenobjekt: ein dunkler Kern, um den sich mehrere Module,
   Orbitringe, Datenpunkte und Verbindungslinien zu einem System fügen.

   Bewusste technische Entscheidungen
   · Kein Three.js, kein CDN, keine externen Modelle – die Geometrie wird
     vollständig im Code erzeugt. Das spart rund 600 KB, bleibt DSGVO-
     freundlich und läuft auch ohne WebGL.
   · Gerendert wird mit Canvas 2D: eigene Perspektivprojektion, Sortierung
     nach Tiefe (Maleralgorithmus) und lichtabhängige Flächenhelligkeit.
   · Eine einzige requestAnimationFrame-Schleife für alle Instanzen.
   · Pausiert, sobald die Szene aus dem Bild scrollt oder der Tab inaktiv ist.
   · devicePixelRatio begrenzt, auf Mobilgeräten weniger Geometrie.
   · prefers-reduced-motion: ein einziges statisches Bild, keine Schleife.
   · Ohne Canvas-Unterstützung bleibt die statische SVG-Komposition stehen.
   ========================================================================== */
(function () {
  "use strict";

  var wurzel = document.documentElement;
  var leiser = window.matchMedia("(prefers-reduced-motion: reduce)");
  var feinerZeiger = window.matchMedia("(pointer: fine)");
  var schmal = window.matchMedia("(max-width: 760px)");

  /* --- Farbwelt: aus den CSS-Tokens gelesen, damit nur eine Quelle gilt --- */
  function token(name, ersatz) {
    var wert = getComputedStyle(wurzel).getPropertyValue(name).trim();
    return wert || ersatz;
  }

  /* --- Kleine Vektorhilfen ------------------------------------------------ */
  function laenge(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
  function normieren(v) {
    var l = laenge(v) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  /* ------------------------------------------------------------------------
     Geometrie: wird einmal erzeugt und danach nur noch transformiert.
     ---------------------------------------------------------------------- */

  // Achsenparalleler Quader als Kantenliste und Flächenliste
  function quader(hx, hy, hz) {
    var p = [
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]
    ];
    return {
      punkte: p,
      kanten: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
      flaechen: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]]
    };
  }

  // Oktaeder als Kern
  function oktaeder(r) {
    var p = [[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]];
    return {
      punkte: p,
      kanten: [[0,2],[2,1],[1,3],[3,0],[0,4],[4,1],[1,5],[5,0],[2,4],[4,3],[3,5],[5,2]],
      flaechen: [[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]]
    };
  }

  // Kreis in einer geneigten Ebene – als Punktfolge für Orbitringe
  function ring(radius, neigungX, neigungZ, segmente) {
    var punkte = [], i, w, x, y, z, y2, z2, x2;
    for (i = 0; i < segmente; i++) {
      w = (i / segmente) * Math.PI * 2;
      x = Math.cos(w) * radius; y = 0; z = Math.sin(w) * radius;
      // um X neigen
      y2 = y * Math.cos(neigungX) - z * Math.sin(neigungX);
      z2 = y * Math.sin(neigungX) + z * Math.cos(neigungX);
      // um Z neigen
      x2 = x * Math.cos(neigungZ) - y2 * Math.sin(neigungZ);
      y2 = x * Math.sin(neigungZ) + y2 * Math.cos(neigungZ);
      punkte.push([x2, y2, z2]);
    }
    return punkte;
  }

  var MODULE = [
    { richtung: [ 1.00,  0.16,  0.22], groesse: 0.30, label: "WEB",     abstand: 1.55 },
    { richtung: [-0.86,  0.42,  0.30], groesse: 0.24, label: "SHOP",    abstand: 1.70 },
    { richtung: [ 0.22,  0.94, -0.24], groesse: 0.20, label: "CRM",     abstand: 1.48 },
    { richtung: [-0.28, -0.88,  0.30], groesse: 0.26, label: "DATA",    abstand: 1.62 },
    { richtung: [ 0.34, -0.24, -1.00], groesse: 0.22, label: "AI",      abstand: 1.78 },
    { richtung: [-0.30, -0.18,  0.98], groesse: 0.18, label: "SERVICE", abstand: 1.40 }
  ];

  function geometrieBauen(einfach) {
    var segmente = einfach ? 44 : 84;
    var module = einfach ? MODULE.slice(0, 4) : MODULE;
    return {
      kern: oktaeder(0.52),
      huelle: quader(0.86, 0.86, 0.86),
      ringe: [
        ring(1.42, 0.30, 0.10, segmente),
        ring(1.86, -0.52, 0.34, segmente),
        ring(2.24, 0.18, -0.46, segmente)
      ],
      module: module.map(function (m) {
        return {
          richtung: normieren(m.richtung),
          abstand: m.abstand,
          label: m.label,
          koerper: quader(m.groesse, m.groesse * 0.66, m.groesse * 0.82)
        };
      })
    };
  }

  /* ------------------------------------------------------------------------
     Eine Szene = ein Canvas
     ---------------------------------------------------------------------- */
  function Szene(behaelter, canvas, art) {
    this.behaelter = behaelter;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.art = art;                      // "hero" oder "calm"
    this.einfach = schmal.matches;
    this.geo = geometrieBauen(this.einfach);
    this.b = 0; this.h = 0; this.dpr = 1;
    this.zeit = 0;
    this.zeigerX = 0; this.zeigerY = 0;
    this.zielX = 0; this.zielY = 0;
    this.aufbruch = 0;                   // 0 = geschlossen, 1 = zerlegt
    this.sichtbar = false;
    this.farben = {
      linie: "rgba(242,243,241,",
      akzent: token("--accent-ink", "#4fc3ce"),
      kern: token("--accent", "#0e6f7a")
    };
    // Wiederverwendete Puffer – vermeidet Speicherzuweisung pro Bild
    this.stuecke = [];
    this.punktPuffer = [];
    this.messen();
  }

  Szene.prototype.messen = function () {
    var r = this.behaelter.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var max = this.einfach ? 1.5 : 2;
    var dpr = Math.min(window.devicePixelRatio || 1, max);
    if (Math.abs(r.width - this.b) < 0.5 && Math.abs(r.height - this.h) < 0.5 && dpr === this.dpr) return;
    this.b = r.width; this.h = r.height; this.dpr = dpr;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.canvas.style.width = r.width + "px";
    this.canvas.style.height = r.height + "px";
  };

  // Perspektivische Projektion eines Weltpunktes
  Szene.prototype.projizieren = function (p, dreh, ziel) {
    var cx = Math.cos(dreh.x), sx = Math.sin(dreh.x);
    var cy = Math.cos(dreh.y), sy = Math.sin(dreh.y);
    var x = p[0], y = p[1], z = p[2];
    // um Y drehen
    var x1 = x * cy + z * sy;
    var z1 = -x * sy + z * cy;
    // um X drehen
    var y1 = y * cx - z1 * sx;
    var z2 = y * sx + z1 * cx;
    var tiefe = 5.4;
    var s = tiefe / (tiefe + z2);
    var einheit = Math.min(this.b, this.h) * 0.205;
    ziel[0] = this.b / 2 + x1 * s * einheit;
    ziel[1] = this.h / 2 + y1 * s * einheit;
    ziel[2] = z2;
    ziel[3] = s;
    return ziel;
  };

  Szene.prototype.punkteProjizieren = function (punkte, dreh, versatz, skalierung) {
    var raus = this.punktPuffer;
    if (raus.length < punkte.length) {
      while (raus.length < punkte.length) raus.push([0, 0, 0, 0]);
    }
    var i, p, tmp = [0, 0, 0];
    for (i = 0; i < punkte.length; i++) {
      p = punkte[i];
      tmp[0] = p[0] * skalierung + versatz[0];
      tmp[1] = p[1] * skalierung + versatz[1];
      tmp[2] = p[2] * skalierung + versatz[2];
      this.projizieren(tmp, dreh, raus[i]);
    }
    return raus;
  };

  Szene.prototype.zeichnen = function () {
    var ctx = this.ctx, i, j;
    if (!this.b || !this.h) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.b, this.h);

    var ruhig = this.art === "calm";

    /* --- Weiches Licht hinter dem Kern (Atmosphäre, kein Glow-Effekt) ----- */
    var mitteX = this.b / 2, mitteY = this.h / 2;
    var radius = Math.min(this.b, this.h) * 0.42;
    var licht = ctx.createRadialGradient(mitteX, mitteY, 0, mitteX, mitteY, radius);
    licht.addColorStop(0, "rgba(79,195,206,.13)");
    licht.addColorStop(0.45, "rgba(79,195,206,.045)");
    licht.addColorStop(1, "rgba(79,195,206,0)");
    ctx.fillStyle = licht;
    ctx.fillRect(0, 0, this.b, this.h);

    var t = this.zeit;
    var dreh = {
      y: t * (ruhig ? 0.045 : 0.062) + this.zeigerX * 0.16,
      x: -0.30 + Math.sin(t * 0.16) * 0.045 + this.zeigerY * 0.13 + this.aufbruch * 0.10
    };
    var auf = ruhig ? 0 : this.aufbruch;
    var stuecke = this.stuecke;
    stuecke.length = 0;

    /* --- Orbitringe: hinten wie vorn, deshalb pro Segment sortiert -------- */
    var ringAlpha = [0.22, 0.15, 0.10];
    for (i = 0; i < this.geo.ringe.length; i++) {
      var rp = this.punkteProjizieren(this.geo.ringe[i], dreh, [0, 0, 0], 1 + auf * 0.12);
      var pfad = [];
      for (j = 0; j < rp.length; j++) pfad.push([rp[j][0], rp[j][1], rp[j][2]]);
      for (j = 0; j < pfad.length; j++) {
        var a = pfad[j], b = pfad[(j + 1) % pfad.length];
        stuecke.push({
          art: "linie", z: (a[2] + b[2]) / 2,
          x1: a[0], y1: a[1], x2: b[0], y2: b[1],
          farbe: this.farben.linie + (ringAlpha[i] * (1 - auf * 0.25)).toFixed(3) + ")",
          breite: 1
        });
      }
      // Datenpunkt, der auf dem Ring wandert
      var k = Math.floor(((t * (0.05 + i * 0.017)) % 1) * pfad.length);
      var pk = pfad[((k % pfad.length) + pfad.length) % pfad.length];
      stuecke.push({
        art: "punkt", z: pk[2], x: pk[0], y: pk[1], r: 1.9,
        farbe: this.farben.akzent, alpha: 0.85
      });
    }

    /* --- Kern: gefüllte Flächen mit Lichtabhängigkeit --------------------- */
    var kernSkal = 1 + Math.sin(t * 0.5) * 0.012;
    this.koerperSammeln(this.geo.kern, dreh, [0, 0, 0], kernSkal, stuecke, {
      fuellung: [14, 111, 122], grundAlpha: 0.42, kante: 0.30, licht: 0.9
    });
    // Technische Hülle um den Kern: nur Kanten, öffnet sich beim Scrollen
    this.kantenSammeln(this.geo.huelle, dreh, [0, 0, 0], 1 + auf * 0.55, stuecke,
      this.farben.linie + (0.13 + auf * 0.10).toFixed(3) + ")", 1);

    /* --- Module: Verbindung, Körper, Beschriftung ------------------------- */
    var pTmp = [0, 0, 0, 0];
    var kernPunkt = this.projizieren([0, 0, 0], dreh, [0, 0, 0, 0]);
    for (i = 0; i < this.geo.module.length; i++) {
      var m = this.geo.module[i];
      var schwung = Math.sin(t * 0.35 + i * 1.7) * 0.045;
      var d = m.abstand * (1 + auf * 0.42) + schwung;
      var pos = [m.richtung[0] * d, m.richtung[1] * d, m.richtung[2] * d];
      var pm = this.projizieren(pos, dreh, pTmp);
      var mz = pm[2], mx = pm[0], my = pm[1], ms = pm[3];

      // Verbindungslinie zum Kern
      stuecke.push({
        art: "linie", z: mz + 0.01,
        x1: kernPunkt[0], y1: kernPunkt[1], x2: mx, y2: my,
        farbe: "rgba(79,195,206," + (0.10 + auf * 0.24).toFixed(3) + ")",
        breite: 1, strich: [2, 4]
      });

      this.koerperSammeln(m.koerper, dreh, pos, 1, stuecke, {
        fuellung: [242, 243, 241], grundAlpha: 0.055, kante: 0.26, licht: 0.75
      });

      // Knotenpunkt und Beschriftung
      stuecke.push({ art: "punkt", z: mz - 0.02, x: mx, y: my, r: 1.6,
        farbe: this.farben.akzent, alpha: 0.5 + auf * 0.4 });
      if (!this.einfach && auf > 0.12) {
        stuecke.push({
          art: "text", z: mz - 0.03, x: mx + 14 * ms, y: my - 12 * ms,
          text: m.label, alpha: Math.min(1, (auf - 0.12) * 2.6) * 0.7
        });
      }
    }

    /* --- Maleralgorithmus: hinten zuerst --------------------------------- */
    stuecke.sort(function (a, b) { return b.z - a.z; });

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (i = 0; i < stuecke.length; i++) {
      var s = stuecke[i];
      if (s.art === "linie") {
        ctx.beginPath();
        ctx.strokeStyle = s.farbe;
        ctx.lineWidth = s.breite;
        if (s.strich) ctx.setLineDash(s.strich); else ctx.setLineDash([]);
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      } else if (s.art === "flaeche") {
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(s.p[0][0], s.p[0][1]);
        for (j = 1; j < s.p.length; j++) ctx.lineTo(s.p[j][0], s.p[j][1]);
        ctx.closePath();
        ctx.fillStyle = s.farbe;
        ctx.fill();
        if (s.kante) {
          ctx.strokeStyle = s.kante;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (s.art === "punkt") {
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.farbe;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (s.art === "text") {
        ctx.setLineDash([]);
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = "rgba(242,243,241,.85)";
        ctx.font = '500 9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.letterSpacing = "1.5px";
        ctx.fillText(s.text, s.x, s.y);
        ctx.globalAlpha = 1;
      }
    }
    ctx.setLineDash([]);
  };

  // Flächen eines Körpers mit Rückseitenaussortierung und Lichtberechnung
  Szene.prototype.koerperSammeln = function (koerper, dreh, versatz, skal, stuecke, stil) {
    var pp = this.punkteProjizieren(koerper.punkte, dreh, versatz, skal);
    // Kopie, weil der Puffer beim nächsten Körper überschrieben wird
    var punkte = [], i, j;
    for (i = 0; i < koerper.punkte.length; i++) punkte.push([pp[i][0], pp[i][1], pp[i][2]]);

    for (i = 0; i < koerper.flaechen.length; i++) {
      var f = koerper.flaechen[i];
      var a = punkte[f[0]], b = punkte[f[1]], c = punkte[f[2]];
      // Flächennormale im Bildraum: bestimmt Sichtbarkeit und Helligkeit
      var ux = b[0] - a[0], uy = b[1] - a[1];
      var vx = c[0] - a[0], vy = c[1] - a[1];
      var kreuz = ux * vy - uy * vx;
      if (kreuz <= 0) continue;                    // Rückseite
      var tiefeMittel = 0, ecken = [];
      for (j = 0; j < f.length; j++) { ecken.push(punkte[f[j]]); tiefeMittel += punkte[f[j]][2]; }
      tiefeMittel /= f.length;
      // Weiches Key-Light von oben links: näher = heller
      var licht = 0.55 + 0.45 * Math.max(0, Math.min(1, (2.2 - tiefeMittel) / 3.4));
      var alpha = stil.grundAlpha * (0.55 + licht * stil.licht);
      stuecke.push({
        art: "flaeche", z: tiefeMittel, p: ecken,
        farbe: "rgba(" + stil.fuellung.join(",") + "," + alpha.toFixed(3) + ")",
        kante: "rgba(242,243,241," + (stil.kante * licht).toFixed(3) + ")"
      });
    }
  };

  Szene.prototype.kantenSammeln = function (koerper, dreh, versatz, skal, stuecke, farbe, breite) {
    var pp = this.punkteProjizieren(koerper.punkte, dreh, versatz, skal);
    var punkte = [], i;
    for (i = 0; i < koerper.punkte.length; i++) punkte.push([pp[i][0], pp[i][1], pp[i][2]]);
    for (i = 0; i < koerper.kanten.length; i++) {
      var k = koerper.kanten[i], a = punkte[k[0]], b = punkte[k[1]];
      stuecke.push({
        art: "linie", z: (a[2] + b[2]) / 2,
        x1: a[0], y1: a[1], x2: b[0], y2: b[1], farbe: farbe, breite: breite
      });
    }
  };

  /* ------------------------------------------------------------------------
     Steuerung: eine Schleife für alle Szenen
     ---------------------------------------------------------------------- */
  var szenen = [];
  var laeuft = false;
  var letzte = 0;

  function schleife(jetzt) {
    if (!laeuft) return;
    // Der Zeitstempel von requestAnimationFrame kann minimal vor performance.now()
    // liegen – deshalb wird die Schrittweite nach unten wie nach oben begrenzt.
    var dt = Math.max(0, Math.min((jetzt - letzte) / 1000, 0.05));
    letzte = jetzt;
    var aktiv = false;
    for (var i = 0; i < szenen.length; i++) {
      var s = szenen[i];
      if (!s.sichtbar) continue;
      aktiv = true;
      s.zeit += dt;
      // Zeigerposition weich nachziehen
      s.zeigerX += (s.zielX - s.zeigerX) * 0.045;
      s.zeigerY += (s.zielY - s.zeigerY) * 0.045;
      if (s.art === "hero") s.aufbruch += (s.aufbruchZiel() - s.aufbruch) * 0.06;
      s.zeichnen();
    }
    if (!aktiv) { laeuft = false; return; }
    requestAnimationFrame(schleife);
  }

  function starten() {
    if (laeuft || leiser.matches) return;
    laeuft = true;
    letzte = performance.now();
    requestAnimationFrame(schleife);
  }

  Szene.prototype.aufbruchZiel = function () {
    var r = this.behaelter.getBoundingClientRect();
    var hoehe = window.innerHeight || 800;
    // 0 solange die Szene mittig steht, 1 sobald sie nach oben ausläuft
    var fortschritt = (hoehe * 0.5 - (r.top + r.height * 0.5)) / (hoehe * 0.85);
    return Math.max(0, Math.min(1, fortschritt));
  };

  /* --- Aufbau -------------------------------------------------------------- */
  function aufbauen() {
    var buehnen = document.querySelectorAll("[data-system]");
    if (!buehnen.length) return;

    var kannCanvas = !!(document.createElement("canvas").getContext &&
                        document.createElement("canvas").getContext("2d"));
    if (!kannCanvas) return;                       // SVG-Ersatz bleibt stehen

    Array.prototype.forEach.call(buehnen, function (buehne) {
      var canvas = buehne.querySelector(".sys-canvas");
      if (!canvas) return;
      var szene;
      try {
        szene = new Szene(buehne, canvas, buehne.getAttribute("data-system") || "hero");
      } catch (e) {
        return;                                    // Ersatzgrafik bleibt sichtbar
      }
      szenen.push(szene);
      buehne.classList.add("is-live", "is-ready");
      szene.zeichnen();

      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { szene.messen(); szene.zeichnen(); });
        ro.observe(buehne);
      } else {
        window.addEventListener("resize", function () { szene.messen(); szene.zeichnen(); });
      }

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (eintraege) {
          eintraege.forEach(function (e) {
            szene.sichtbar = e.isIntersecting && !document.hidden;
            if (szene.sichtbar) starten();
          });
        }, { rootMargin: "120px" });
        io.observe(buehne);
      } else {
        szene.sichtbar = true;
        starten();
      }
    });

    if (!szenen.length) return;

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        szenen.forEach(function (s) { s.sichtbar = false; });
        laeuft = false;
      } else {
        szenen.forEach(function (s) {
          var r = s.behaelter.getBoundingClientRect();
          s.sichtbar = r.bottom > -120 && r.top < (window.innerHeight || 800) + 120;
        });
        starten();
      }
    });

    // Sehr zurückhaltende Kameraparallaxe – nur an echten Zeigegeräten
    if (feinerZeiger.matches && !leiser.matches) {
      window.addEventListener("pointermove", function (e) {
        var b = window.innerWidth || 1, h = window.innerHeight || 1;
        var x = (e.clientX / b - 0.5) * 2, y = (e.clientY / h - 0.5) * 2;
        for (var i = 0; i < szenen.length; i++) {
          szenen[i].zielX = x; szenen[i].zielY = y;
        }
      }, { passive: true });
    }

    if (leiser.matches) {
      // Ein ruhiges, vollständig aufgebautes Standbild – keine Schleife
      szenen.forEach(function (s) { s.zeit = 12; s.aufbruch = 0; s.zeichnen(); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aufbauen);
  else aufbauen();
})();
