/* ==========================================================================
   HAHNE DIGITAL – Systemarchitektur (prozeduraler Render)
   --------------------------------------------------------------------------
   Zeichnet keine beliebige 3D-Spielerei, sondern genau das, was die Firma
   baut: eine geschichtete Systemarchitektur, gezeichnet in der Bildsprache
   einer technischen Explosionszeichnung.

     · INTERFACE  – Website, Shop, Portal, App
     · LOGIC      – Prozesse, Regeln, Automatisierung, Systemkern
     · DATA       – Datenhaltung, Dateien, Synchronisation
     · darunter   – das Bezugsraster mit dem Grundriss der Anlage

   Die Ebenen sind über Steigleitungen verbunden, auf jeder Ebene laufen
   rechtwinklige Leiterbahnen zwischen den Knoten, darauf wandern Datenpakete.
   Beim Scrollen fährt die Anlage auseinander.

   Bewusste technische Entscheidungen
   · Kein Three.js, kein CDN, keine externen Modelle – die Geometrie entsteht
     vollständig im Code (spart rund 600 KB, bleibt DSGVO-freundlich und läuft
     auch ohne WebGL).
   · Canvas 2D mit eigener Perspektivprojektion, Rückseitenaussortierung über
     die Weltnormale und Tiefensortierung (Maleralgorithmus).
   · Eine einzige requestAnimationFrame-Schleife für alle Szenen.
   · Pausiert, sobald die Szene aus dem Bild scrollt oder der Tab inaktiv ist.
   · devicePixelRatio begrenzt, auf schmalen Geräten weniger Geometrie.
   · prefers-reduced-motion: ein vollständig aufgebautes Standbild, keine
     Schleife, kein Zeiger-Zuhörer.
   · Ohne Canvas-Unterstützung bleibt die statische SVG-Zeichnung stehen.
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
  function zerlegen(hex) {
    var h = (hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return [79, 195, 206];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* ------------------------------------------------------------------------
     Geometrie – einmal erzeugt, danach nur noch transformiert.
     Koordinaten: x nach rechts, z nach hinten, y nach unten. Negative
     y-Werte liegen also oben; die Kamera steht darüber und blickt herab.
     ---------------------------------------------------------------------- */

  var EBENEN = [
    {
      id: "interface", label: "INTERFACE", y: -1.34, halbX: 1.00, halbZ: 0.72,
      knoten: [
        { x: -0.70, z: -0.62, groesse: 0.18 },
        { x:  0.10, z: -0.66, groesse: 0.15 },
        { x:  0.72, z: -0.10, groesse: 0.15 },
        { x:  0.05, z:  0.66, groesse: 0.14 }
      ],
      bahnen: [[0, 1], [1, 2], [3, 0]]
    },
    {
      id: "logic", label: "LOGIC", y: 0.00, halbX: 1.32, halbZ: 0.95,
      knoten: [
        { x:  0.00, z:  0.00, groesse: 0.23, kern: true },
        { x: -0.72, z: -0.46, groesse: 0.16 },
        { x:  0.70, z: -0.42, groesse: 0.16 },
        { x:  0.74, z:  0.52, groesse: 0.14 },
        { x: -0.68, z:  0.56, groesse: 0.14 }
      ],
      bahnen: [[1, 0], [2, 0], [3, 0], [4, 0], [1, 4], [2, 3]]
    },
    {
      id: "data", label: "DATA", y: 1.30, halbX: 1.08, halbZ: 0.78,
      knoten: [
        { x: -0.54, z: -0.36, groesse: 0.18 },
        { x:  0.58, z: -0.30, groesse: 0.15 },
        { x:  0.12, z:  0.54, groesse: 0.15 }
      ],
      bahnen: [[0, 1], [1, 2], [2, 0]]
    }
  ];

  var BODEN_Y = 2.34;
  var PLATTE_DICKE = 0.042;

  // Steigleitungen: [EbeneOben, KnotenOben, EbeneUnten, KnotenUnten]
  var STEIGER = [
    [0, 0, 1, 1], [0, 1, 1, 2], [0, 2, 1, 3], [0, 3, 1, 4],
    [1, 0, 2, 0], [1, 2, 2, 1], [1, 3, 2, 2]
  ];

  // Rechtwinklige Leiterbahn: erst in x, dann in z – so, wie Leiterplatten
  // und Architekturdiagramme geführt werden.
  function bahnPunkte(a, b) {
    return [{ x: a.x, z: a.z }, { x: b.x, z: a.z }, { x: b.x, z: b.z }];
  }
  function laengeVon(punkte) {
    var l = 0;
    for (var i = 1; i < punkte.length; i++) {
      l += Math.abs(punkte[i].x - punkte[i - 1].x) + Math.abs(punkte[i].z - punkte[i - 1].z);
    }
    return l || 1;
  }
  function aufBahn(punkte, gesamt, t) {
    var rest = t * gesamt, i, ax, az, bx, bz, seg, f;
    for (i = 1; i < punkte.length; i++) {
      ax = punkte[i - 1].x; az = punkte[i - 1].z;
      bx = punkte[i].x;     bz = punkte[i].z;
      seg = Math.abs(bx - ax) + Math.abs(bz - az);
      if (rest <= seg || i === punkte.length - 1) {
        f = seg > 0 ? Math.max(0, Math.min(1, rest / seg)) : 1;
        return { x: ax + (bx - ax) * f, z: az + (bz - az) * f };
      }
      rest -= seg;
    }
    return { x: punkte[0].x, z: punkte[0].z };
  }

  function architekturBauen(einfach) {
    var ebenen = EBENEN.map(function (e, ei) {
      var knoten = einfach && e.knoten.length > 3
        ? e.knoten.filter(function (k, i) { return k.kern || i < 3; })
        : e.knoten;
      var anzahl = knoten.length;
      var bahnen = e.bahnen
        .filter(function (b) { return b[0] < anzahl && b[1] < anzahl; })
        .map(function (b) {
          var punkte = bahnPunkte(knoten[b[0]], knoten[b[1]]);
          return { punkte: punkte, laenge: laengeVon(punkte) };
        });
      return {
        id: e.id, label: e.label, y: e.y, halbX: e.halbX, halbZ: e.halbZ,
        knoten: knoten, bahnen: bahnen, index: ei
      };
    });
    var steiger = STEIGER.filter(function (s) {
      return s[1] < ebenen[s[0]].knoten.length && s[3] < ebenen[s[2]].knoten.length;
    });
    if (einfach) steiger = steiger.filter(function (s, i) { return i % 2 === 0; });
    return { ebenen: ebenen, steiger: steiger };
  }

  /* ------------------------------------------------------------------------
     Eine Szene = ein Canvas
     ---------------------------------------------------------------------- */
  function Szene(behaelter, canvas, art) {
    this.behaelter = behaelter;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.art = art === "calm" ? "calm" : "hero";
    this.einfach = schmal.matches || this.art === "calm";
    this.geo = architekturBauen(this.einfach);
    this.b = 0; this.h = 0; this.dpr = 1;
    this.zeit = this.art === "calm" ? 5 : 0;
    this.zeigerX = 0; this.zeigerY = 0;
    this.zielX = 0; this.zielY = 0;
    this.aufbruch = 0;                   // 0 = kompakt, 1 = Explosionszeichnung
    this.sichtbar = false;
    this.eingang = 0;                    // Aufbau-Fortschritt beim ersten Lauf
    var a = zerlegen(token("--accent-ink", "#4fc3ce"));
    this.akzentHex = token("--accent-ink", "#4fc3ce");
    this.akzent = function (alpha) { return "rgba(" + a[0] + "," + a[1] + "," + a[2] + "," + alpha + ")"; };
    this.linie = function (alpha) { return "rgba(242,243,241," + alpha + ")"; };
    this.stuecke = [];
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

  /* --- Perspektivprojektion: Gierung um y, danach Neigung um x ----------- */
  Szene.prototype.projizieren = function (x, y, z, kam) {
    var x1 = x * kam.cosGier + z * kam.sinGier;
    var z1 = -x * kam.sinGier + z * kam.cosGier;
    var y1 = y * kam.cosNick - z1 * kam.sinNick;
    var z2 = y * kam.sinNick + z1 * kam.cosNick;
    var s = kam.abstand / (kam.abstand + z2);
    return [kam.mx + x1 * s * kam.einheit, kam.my + y1 * s * kam.einheit, z2, s];
  };

  // Ob eine Fläche zum Betrachter zeigt: Weltnormale mitdrehen und prüfen,
  // ob sie nach vorn (negative Tiefe) weist. Verlässlicher als der Test im
  // Bildraum, weil die Reihenfolge der Eckpunkte dabei keine Rolle spielt.
  Szene.prototype.zeigtHer = function (nx, ny, nz, kam) {
    var z1 = -nx * kam.sinGier + nz * kam.cosGier;
    return (ny * kam.sinNick + z1 * kam.cosNick) < -0.02;
  };

  Szene.prototype.kamera = function () {
    var t = this.zeit;
    var auf = this.aufbruch;
    // Langsame Drift statt Dauerrotation: das Objekt wirkt betrachtet, nicht
    // abgespielt. Volle Periode rund 46 Sekunden.
    var gier, nick;
    if (this.art === "calm") {
      gier = -0.42 + Math.sin(t * 0.09) * 0.20;
      nick = 0.50;
    } else {
      gier = -0.46 + Math.sin(t * 0.136) * 0.26 + this.zeigerX * 0.17;
      nick = 0.47 + Math.sin(t * 0.088) * 0.028 - this.zeigerY * 0.08 + auf * 0.06;
    }
    var kurz = Math.min(this.b, this.h);
    return {
      cosGier: Math.cos(gier), sinGier: Math.sin(gier),
      cosNick: Math.cos(nick), sinNick: Math.sin(nick),
      abstand: 7.4,
      einheit: kurz * (this.art === "calm" ? 0.170 : 0.198) / (1 + auf * 0.13),
      mx: this.b / 2,
      my: this.h / 2 + kurz * 0.015
    };
  };

  /* --- Zeichnen ------------------------------------------------------------ */
  Szene.prototype.zeichnen = function () {
    var ctx = this.ctx;
    if (!this.b || !this.h || !ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.b, this.h);

    var kam = this.kamera();
    var auf = this.art === "calm" ? 0 : this.aufbruch;
    var ein = this.eingang;
    var t = this.zeit;
    var stuecke = this.stuecke;
    stuecke.length = 0;

    var boden = BODEN_Y + auf * 0.55;
    var oben = this.geo.ebenen[0];
    var obenY = this.ebenenHoehe(0, auf, t);

    /* --- Atmosphärisches Licht hinter dem Kern --------------------------- */
    var kernPunkt = this.projizieren(0, this.ebenenHoehe(1, auf, t), 0, kam);
    var radius = Math.min(this.b, this.h) * 0.40;
    var licht = ctx.createRadialGradient(kernPunkt[0], kernPunkt[1], 0, kernPunkt[0], kernPunkt[1], radius);
    licht.addColorStop(0, this.akzent((0.15 * ein).toFixed(3)));
    licht.addColorStop(0.42, this.akzent((0.05 * ein).toFixed(3)));
    licht.addColorStop(1, this.akzent(0));
    ctx.fillStyle = licht;
    ctx.fillRect(0, 0, this.b, this.h);

    /* --- Bezugsraster mit Grundriss der Anlage --------------------------- */
    this.bodenZeichnen(ctx, kam, boden, ein, oben, obenY, auf);

    /* --- Ebenen ---------------------------------------------------------- */
    for (var ei = 0; ei < this.geo.ebenen.length; ei++) {
      var e = this.geo.ebenen[ei];
      // Aufbau von unten nach oben, damit die Anlage entsteht statt einzublenden
      var eigenEin = Math.max(0, Math.min(1, (ein - (2 - ei) * 0.15) / 0.55));
      if (eigenEin <= 0.001) continue;
      var y = this.ebenenHoehe(ei, auf, t) + (1 - eigenEin) * 0.55;
      this.ebeneSammeln(e, y, eigenEin, kam, stuecke, auf, t);
    }

    /* --- Steigleitungen zwischen den Ebenen ------------------------------ */
    var einS = Math.max(0, Math.min(1, (ein - 0.45) / 0.5));
    if (einS > 0.001) {
      for (var si = 0; si < this.geo.steiger.length; si++) {
        var s = this.geo.steiger[si];
        var eo = this.geo.ebenen[s[0]], eu = this.geo.ebenen[s[2]];
        var ko = eo.knoten[s[1]], ku = eu.knoten[s[3]];
        var yo = this.ebenenHoehe(s[0], auf, t);
        var yu = this.ebenenHoehe(s[2], auf, t);
        var a = this.projizieren(ko.x * eo.halbX, yo, ko.z * eo.halbZ, kam);
        var b = this.projizieren(ku.x * eu.halbX, yo + (yu - yo) * einS, ku.z * eu.halbZ, kam);
        stuecke.push({
          art: "linie", z: (a[2] + b[2]) / 2 + 0.03,
          x1: a[0], y1: a[1], x2: b[0], y2: b[1],
          farbe: this.linie(((0.15 + auf * 0.07) * einS).toFixed(3)),
          breite: 1, strich: [1.5, 3]
        });
        // Signal auf der Steigleitung: kurzer Lauf, dann Pause – Betrieb,
        // kein Dauerfeuer.
        var takt = (t * 0.26 + si * 0.31) % 2.1;
        if (takt <= 1) {
          var glanz = Math.sin(takt * Math.PI);
          stuecke.push({
            art: "punkt", z: a[2] + (b[2] - a[2]) * takt - 0.02,
            x: a[0] + (b[0] - a[0]) * takt, y: a[1] + (b[1] - a[1]) * takt,
            r: 1.7, farbe: this.akzentHex, alpha: glanz * 0.9 * einS
          });
        }
      }
    }

    /* --- Maleralgorithmus: hinten zuerst --------------------------------- */
    stuecke.sort(function (a, b) { return b.z - a.z; });
    this.stueckeMalen(ctx, stuecke);
  };

  Szene.prototype.ebenenHoehe = function (ei, auf, t) {
    return this.geo.ebenen[ei].y + (ei - 1) * auf * 0.95 +
           Math.sin(t * 0.30 + ei * 1.25) * 0.013;
  };

  /* --- Bezugsraster und Grundriss ---------------------------------------- */
  Szene.prototype.bodenZeichnen = function (ctx, kam, boden, ein, oben, obenY, auf) {
    var sicht = Math.max(0, Math.min(1, ein / 0.4));
    if (sicht <= 0.001) return;
    var weite = 2.05, tiefeH = 1.55;
    var schritte = this.einfach ? 5 : 7;
    var i, a, b, v;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (i = 0; i <= schritte; i++) {
      var f = i / schritte;
      // Randlinien blasser als die Mitte: Tiefe ohne Weichzeichner
      var rand = 1 - Math.abs(f - 0.5) * 2;
      var alpha = (0.022 + rand * 0.042) * sicht;
      v = -weite + f * weite * 2;
      a = this.projizieren(v, boden, -tiefeH, kam);
      b = this.projizieren(v, boden, tiefeH, kam);
      ctx.strokeStyle = this.linie(alpha.toFixed(3));
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      v = -tiefeH + f * tiefeH * 2;
      a = this.projizieren(-weite, boden, v, kam);
      b = this.projizieren(weite, boden, v, kam);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }

    /* Grundriss der obersten Ebene, auf das Raster gelotet, und vier
       Lotlinien von ihren Ecken – die Bildsprache technischer Zeichnungen. */
    var lot = Math.max(0, Math.min(1, (ein - 0.5) / 0.5));
    if (lot > 0.001) {
      var ecken = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = this.akzent((0.20 * lot).toFixed(3));
      ctx.beginPath();
      for (i = 0; i < 4; i++) {
        var p = this.projizieren(ecken[i][0] * oben.halbX, boden, ecken[i][1] * oben.halbZ, kam);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = this.linie((0.07 * lot).toFixed(3));
      ctx.setLineDash([1, 4]);
      for (i = 0; i < 4; i++) {
        a = this.projizieren(ecken[i][0] * oben.halbX, obenY, ecken[i][1] * oben.halbZ, kam);
        b = this.projizieren(ecken[i][0] * oben.halbX, boden, ecken[i][1] * oben.halbZ, kam);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* --- Eine Ebene: Platte, Bahnen, Knoten, Pakete, Beschriftung ---------- */
  Szene.prototype.ebeneSammeln = function (e, y, alpha, kam, stuecke, auf, t) {
    var hx = e.halbX, hz = e.halbZ, i;
    var istKern = e.id === "logic";
    var ecken = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    var oben = [], unten = [];
    for (i = 0; i < 4; i++) {
      oben.push(this.projizieren(ecken[i][0] * hx, y, ecken[i][1] * hz, kam));
      unten.push(this.projizieren(ecken[i][0] * hx, y + PLATTE_DICKE, ecken[i][1] * hz, kam));
    }
    var tiefe = (oben[0][2] + oben[2][2]) / 2;

    // Deckfläche der Platte – sehr zurückhaltend, gibt der Ebene Körper
    stuecke.push({
      art: "flaeche", z: tiefe + 0.02,
      p: [[oben[0][0], oben[0][1]], [oben[1][0], oben[1][1]],
          [oben[2][0], oben[2][1]], [oben[3][0], oben[3][1]]],
      farbe: istKern ? this.akzent((0.075 * alpha).toFixed(3)) : this.linie((0.026 * alpha).toFixed(3)),
      kante: istKern ? this.akzent((0.34 * alpha).toFixed(3)) : this.linie((0.17 * alpha).toFixed(3))
    });

    // Plattenrand als dünne Zarge: nur die Seiten, die zum Betrachter zeigen
    var normalen = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
    for (i = 0; i < 4; i++) {
      var n = normalen[i];
      if (!this.zeigtHer(n[0], n[1], n[2], kam)) continue;
      var j = (i + 1) % 4;
      stuecke.push({
        art: "flaeche", z: (oben[i][2] + oben[j][2]) / 2 + 0.015,
        p: [[oben[i][0], oben[i][1]], [oben[j][0], oben[j][1]],
            [unten[j][0], unten[j][1]], [unten[i][0], unten[i][1]]],
        farbe: istKern ? this.akzent((0.20 * alpha).toFixed(3)) : this.linie((0.075 * alpha).toFixed(3)),
        kante: this.linie((0.10 * alpha).toFixed(3))
      });
    }

    // Leiterbahnen zwischen den Knoten
    for (var bi = 0; bi < e.bahnen.length; bi++) {
      var bahn = e.bahnen[bi];
      for (var pi = 1; pi < bahn.punkte.length; pi++) {
        var p1 = this.projizieren(bahn.punkte[pi - 1].x * hx, y, bahn.punkte[pi - 1].z * hz, kam);
        var p2 = this.projizieren(bahn.punkte[pi].x * hx, y, bahn.punkte[pi].z * hz, kam);
        stuecke.push({
          art: "linie", z: (p1[2] + p2[2]) / 2 - 0.005,
          x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1],
          farbe: this.linie((0.13 * alpha).toFixed(3)), breite: 1
        });
      }
      // Datenpaket: kurzer Lauf, dann Pause
      var phase = (t * 0.40 + bi * 0.63 + e.index * 0.45) % 2.5;
      if (phase <= 1) {
        var pos = aufBahn(bahn.punkte, bahn.laenge, phase);
        var pp = this.projizieren(pos.x * hx, y, pos.z * hz, kam);
        stuecke.push({
          art: "paket", z: pp[2] - 0.02, x: pp[0], y: pp[1],
          r: 2.0 * pp[3], farbe: this.akzentHex,
          alpha: Math.min(1, Math.sin(phase * Math.PI) * 2.2) * 0.95 * alpha
        });
      }
    }

    // Knoten als Blöcke mit echter Höhe
    for (var ni = 0; ni < e.knoten.length; ni++) {
      var kn = e.knoten[ni];
      this.blockSammeln(kn.x * hx, y, kn.z * hz, kn.groesse, !!kn.kern,
                        kam, stuecke, alpha, t, ni + e.index * 3);
    }

    // Ebenenname an der vorderen linken Kante. Auf kleinen Flächen entfällt
    // er: dort benennt die Legende unter der Zeichnung dieselben Ebenen,
    // und der Text säße sonst auf der Geometrie.
    if (this.einfach) return;
    var lp = this.projizieren(-hx, y, hz, kam);
    stuecke.push({
      art: "text", z: lp[2] - 0.4, x: lp[0] - 14, y: lp[1] + 4,
      text: e.label, alpha: (istKern ? 0.8 : 0.5) * alpha, akzent: istKern,
      strich: true
    });
  };

  /* --- Ein Knotenblock: Deckfläche, Seiten, Statuspunkt ------------------ */
  Szene.prototype.blockSammeln = function (x, y, z, g, kern, kam, stuecke, alpha, t, saat) {
    var hoehe = kern ? g * 1.75 : g * 1.05;
    var schweben = kern ? Math.sin(t * 0.5) * 0.022 : 0;
    var oy = y - hoehe + schweben, uy = y + schweben;
    var ecken = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    var oben = [], unten = [], i;
    for (i = 0; i < 4; i++) {
      oben.push(this.projizieren(x + ecken[i][0] * g, oy, z + ecken[i][1] * g, kam));
      unten.push(this.projizieren(x + ecken[i][0] * g, uy, z + ecken[i][1] * g, kam));
    }
    var tiefe = (oben[0][2] + oben[2][2]) / 2;
    var normalen = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];

    for (i = 0; i < 4; i++) {
      var n = normalen[i];
      if (!this.zeigtHer(n[0], n[1], n[2], kam)) continue;
      var j = (i + 1) % 4;
      // Seiten, die vom Licht abgewandt sind, bleiben dunkler
      var hell = n[0] < 0 || n[2] < 0 ? 1 : 0.6;
      stuecke.push({
        art: "flaeche", z: (oben[i][2] + oben[j][2]) / 2 - 0.02,
        p: [[oben[i][0], oben[i][1]], [oben[j][0], oben[j][1]],
            [unten[j][0], unten[j][1]], [unten[i][0], unten[i][1]]],
        farbe: kern ? this.akzent((0.30 * hell * alpha).toFixed(3))
                    : this.linie((0.055 * hell * alpha).toFixed(3)),
        kante: kern ? this.akzent((0.42 * alpha).toFixed(3)) : this.linie((0.15 * alpha).toFixed(3))
      });
    }
    stuecke.push({
      art: "flaeche", z: tiefe - 0.05,
      p: [[oben[0][0], oben[0][1]], [oben[1][0], oben[1][1]],
          [oben[2][0], oben[2][1]], [oben[3][0], oben[3][1]]],
      farbe: kern ? this.akzent((0.52 * alpha).toFixed(3)) : this.linie((0.135 * alpha).toFixed(3)),
      kante: kern ? this.akzent((0.95 * alpha).toFixed(3)) : this.linie((0.30 * alpha).toFixed(3))
    });

    // Statuspunkt: langsamer, je Knoten versetzter Takt
    var takt = (Math.sin(t * 0.85 + saat * 1.9) + 1) / 2;
    stuecke.push({
      art: "punkt", z: tiefe - 0.09,
      x: (oben[0][0] + oben[2][0]) / 2, y: (oben[0][1] + oben[2][1]) / 2,
      r: kern ? 2.8 : 1.5, farbe: this.akzentHex,
      alpha: (kern ? 0.95 : 0.26 + takt * 0.5) * alpha
    });
  };

  /* --- Ausgabe ----------------------------------------------------------- */
  Szene.prototype.stueckeMalen = function (ctx, stuecke) {
    var i, j, s;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    for (i = 0; i < stuecke.length; i++) {
      s = stuecke[i];
      if (s.art === "linie") {
        ctx.beginPath();
        ctx.strokeStyle = s.farbe;
        ctx.lineWidth = s.breite;
        if (s.strich) ctx.setLineDash(s.strich); else ctx.setLineDash([]);
        ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      } else if (s.art === "flaeche") {
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(s.p[0][0], s.p[0][1]);
        for (j = 1; j < s.p.length; j++) ctx.lineTo(s.p[j][0], s.p[j][1]);
        ctx.closePath();
        ctx.fillStyle = s.farbe;
        ctx.fill();
        if (s.kante) { ctx.strokeStyle = s.kante; ctx.lineWidth = 1; ctx.stroke(); }
      } else if (s.art === "punkt") {
        if (s.alpha <= 0.015) continue;
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.globalAlpha = Math.min(1, s.alpha);
        ctx.fillStyle = s.farbe;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (s.art === "paket") {
        // Datenpaket: kleines Quadrat, nicht rund – liest sich als Nutzlast
        if (s.alpha <= 0.015) continue;
        ctx.setLineDash([]);
        ctx.globalAlpha = Math.min(1, s.alpha);
        ctx.fillStyle = s.farbe;
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        ctx.globalAlpha = 1;
      } else if (s.art === "text") {
        if (s.alpha <= 0.02) continue;
        ctx.setLineDash([]);
        ctx.globalAlpha = Math.min(1, s.alpha);
        ctx.fillStyle = s.akzent ? this.akzentHex : "rgba(242,243,241,.92)";
        ctx.font = '500 9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        if ("letterSpacing" in ctx) ctx.letterSpacing = "2.2px";
        ctx.fillText(s.text, s.x, s.y);
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        if (s.strich) {
          ctx.strokeStyle = s.akzent ? this.akzentHex : "rgba(242,243,241,.5)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x + 4, s.y); ctx.lineTo(s.x + 11, s.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };

  /* --- Scrollabhängige Explosionszeichnung ------------------------------- */
  Szene.prototype.aufbruchZiel = function () {
    var r = this.behaelter.getBoundingClientRect();
    var hoehe = window.innerHeight || 800;
    var fortschritt = (hoehe * 0.5 - (r.top + r.height * 0.5)) / (hoehe * 0.9);
    return Math.max(0, Math.min(1, fortschritt));
  };

  /* ------------------------------------------------------------------------
     Steuerung: eine Schleife für alle Szenen
     ---------------------------------------------------------------------- */
  var szenen = [];
  var laeuft = false;
  var letzte = 0;

  function schleife(jetzt) {
    if (!laeuft) return;
    var dt = Math.max(0, Math.min((jetzt - letzte) / 1000, 0.05));
    letzte = jetzt;
    var aktiv = false;
    for (var i = 0; i < szenen.length; i++) {
      var s = szenen[i];
      if (!s.sichtbar) continue;
      aktiv = true;
      s.zeit += dt;
      if (s.eingang < 1) s.eingang = Math.min(1, s.eingang + dt / 1.3);
      s.zeigerX += (s.zielX - s.zeigerX) * 0.045;
      s.zeigerY += (s.zielY - s.zeigerY) * 0.045;
      if (s.art === "hero") s.aufbruch += (s.aufbruchZiel() - s.aufbruch) * 0.07;
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

  /* --- Aufbau -------------------------------------------------------------- */
  function aufbauen() {
    var buehnen = document.querySelectorAll("[data-system]");
    if (!buehnen.length) return;

    var probe = document.createElement("canvas");
    if (!(probe.getContext && probe.getContext("2d"))) return;   // SVG-Ersatz bleibt

    Array.prototype.forEach.call(buehnen, function (buehne) {
      var canvas = buehne.querySelector(".sys-canvas");
      if (!canvas) return;
      var szene;
      try {
        szene = new Szene(buehne, canvas, buehne.getAttribute("data-system") || "hero");
      } catch (e) {
        return;                                     // Ersatzgrafik bleibt sichtbar
      }
      szenen.push(szene);
      buehne.classList.add("is-live", "is-ready");
      if (leiser.matches) { szene.eingang = 1; szene.zeit = 11; }
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
        for (var i = 0; i < szenen.length; i++) { szenen[i].zielX = x; szenen[i].zielY = y; }
      }, { passive: true });
    }

    if (leiser.matches) {
      // Ein ruhiges, vollständig aufgebautes Standbild – keine Schleife
      szenen.forEach(function (s) {
        s.eingang = 1; s.zeit = 11; s.aufbruch = 0; s.messen(); s.zeichnen();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aufbauen);
  else aufbauen();
})();
