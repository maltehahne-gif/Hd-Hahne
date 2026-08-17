/* ==========================================================================
   HAHNE DIGITAL – Systemobjekt (3D-Eröffnung der Startseite)
   --------------------------------------------------------------------------
   Ein einziges großes Objekt erzählt die Kernbotschaft der Marke:
   aus einzelnen Bauteilen wird ein System.

   Die gesamte Szene hängt an EINEM Wert: dem Scrollfortschritt p (0..1)
   über die Höhe der Hero-Bühne. Es gibt bewusst keine zeitgesteuerte
   Hauptanimation – die Zeit liefert nur ein minimales Eigenleben
   (Schweben, Rotation der Ringe), damit das Bild nicht totsteht.

   Sieben Abschnitte:
     01  0.00–0.12  Dunkelheit, einzelne Punkte
     02  0.12–0.30  Punkte verbinden sich, Wireframe entsteht
     03  0.30–0.44  Wireframe wird Material – das Objekt ist da
     04  0.44–0.56  Rotation, Kamera kippt, Bauteile lösen sich
     05  0.56–0.70  Bauteile getrennt: Website, Shop, CRM, Automation, KI
     06  0.70–0.86  Kamera fährt hindurch, Datenpunkte laufen
     07  0.86–1.00  Alles dockt zu einer größeren Form zusammen

   Three.js liegt lokal unter assets/vendor/three (kein CDN, siehe README
   dort). Diese Datei wird von assets/motion.js dynamisch geladen.
   ========================================================================== */

import * as THREE from "./vendor/three/three.module.min.js";

/* --- Markenfarben (Spiegel der CSS-Variablen) ----------------------------- */
const C_GRUND   = 0x050506;
const C_METALL  = 0x3a3f4a;   /* dunkles Metall */
const C_GLAS    = 0x090a0d;   /* schwarzes Glas */
const C_AKZENT  = 0x6fa3ff;   /* kaltes Lichtblau, sparsam */
const C_MESSING = 0xc9a463;   /* ein einziges warmes Detail */

const MODULE = ["WEBSITE", "SHOP", "CRM", "AUTOMATION", "KI"];

/* --- kleine Mathe-Helfer -------------------------------------------------- */
const klemme  = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mischen = (a, b, t) => a + (b - a) * t;
/* weiche S-Kurve: Start und Ende ohne Ruck */
const glatt   = (t) => { t = klemme(t); return t * t * (3 - 2 * t); };
/* normalisiert p auf ein Fenster [von, bis] */
const fenster = (p, von, bis) => klemme((p - von) / (bis - von));

export default function starten(canvas, buehne, optionen) {
  const opt = optionen || {};
  const sparsam = !!opt.sparsam;              /* schwächeres Gerät */

  /* ======================================================================
     Renderer
     ====================================================================== */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: !sparsam,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(C_GRUND, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, sparsam ? 1 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;

  const szene = new THREE.Scene();
  /* Nebel statt Tiefenunschärfe: kostet nichts und liefert die räumliche
     Staffelung, die eine Produktaufnahme ausmacht. */
  szene.fog = new THREE.FogExp2(C_GRUND, 0.055);

  const kamera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

  /* ======================================================================
     Studio-Umgebung
     Metall zeigt fast nur Reflexionen – ohne Umgebungsbild wäre es schwarz.
     Statt einer HDR-Datei wird ein kleiner Verlauf gezeichnet: dunkler Raum
     mit einer hellen Softbox oben. Das ergibt die Glanzkante auf den Kanten.
     ====================================================================== */
  const umgebung = (function () {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const g = c.getContext("2d");
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0.00, "#0a0c12");
    v.addColorStop(0.28, "#2a3140");
    v.addColorStop(0.40, "#7e8fae");
    v.addColorStop(0.50, "#d3ddef");   /* Softbox – liefert die Glanzkanten */
    v.addColorStop(0.60, "#4d576b");
    v.addColorStop(1.00, "#05060a");
    g.fillStyle = v; g.fillRect(0, 0, 64, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const ziel = pmrem.fromEquirectangular(tex);
    pmrem.dispose(); tex.dispose();
    return ziel.texture;
  })();
  szene.environment = umgebung;

  /* ======================================================================
     Licht – zurückhaltend. Schatten und schwarze Flächen sind Teil des Bildes.
     ====================================================================== */
  const grundlicht = new THREE.AmbientLight(0xffffff, 0.12);
  szene.add(grundlicht);

  const schluessel = new THREE.DirectionalLight(0xffffff, 2.3);
  schluessel.position.set(4.5, 6, 5.5);
  szene.add(schluessel);

  const kante = new THREE.DirectionalLight(C_AKZENT, 2.1);
  kante.position.set(-6.5, -1.5, 2);
  szene.add(kante);

  const innen = new THREE.PointLight(C_AKZENT, 0, 14);
  szene.add(innen);

  /* ======================================================================
     Materialien
     ====================================================================== */
  const matMetall = new THREE.MeshStandardMaterial({
    color: C_METALL, metalness: 0.8, roughness: 0.32,
    envMapIntensity: 3.0, transparent: true, opacity: 0
  });
  const matKern = new THREE.MeshStandardMaterial({
    color: 0x4a5060, metalness: 0.9, roughness: 0.2,
    envMapIntensity: 3.2, flatShading: true, transparent: true, opacity: 0
  });
  /* "Schwarzes Glas": bewusst ohne transmission (das bräuchte einen zweiten
     Renderdurchgang). Clearcoat auf dunkler Fläche reicht optisch völlig. */
  const matGlas = new THREE.MeshPhysicalMaterial({
    color: C_GLAS, metalness: 0.1, roughness: 0.06,
    clearcoat: 1, clearcoatRoughness: 0.08,
    envMapIntensity: 2.1, transparent: true, opacity: 0
  });
  const matLinie = new THREE.LineBasicMaterial({
    color: C_AKZENT, transparent: true, opacity: 0
  });
  const matDraht = new THREE.LineBasicMaterial({
    color: C_AKZENT, transparent: true, opacity: 0
  });

  /* ======================================================================
     Aufbau des Systemobjekts
     ====================================================================== */
  const system = new THREE.Group();
  szene.add(system);

  /* --- Kern: geschachtelt, innen Glas, außen facettiertes Metall -------- */
  const kernGeo = new THREE.IcosahedronGeometry(0.66, 1);
  const kern = new THREE.Mesh(kernGeo, matKern);
  system.add(kern);

  const kernGlasGeo = new THREE.IcosahedronGeometry(0.9, 0);
  const kernGlas = new THREE.Mesh(kernGlasGeo, matGlas);
  system.add(kernGlas);

  /* Wireframe-Variante des Kerns – trägt Abschnitt 02 */
  const kernDraht = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.9, 1)), matDraht
  );
  system.add(kernDraht);

  /* --- Ringe: dünn, gefräst, auf drei Achsen ---------------------------- */
  const ringe = [];
  [[1.55, 0], [2.05, 1], [2.6, 2]].forEach(([r, achse]) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.02, 3, sparsam ? 60 : 128),
      matMetall
    );
    if (achse === 0) ring.rotation.set(Math.PI / 2.2, 0, 0);
    if (achse === 1) ring.rotation.set(Math.PI / 1.7, Math.PI / 5, 0);
    if (achse === 2) ring.rotation.set(Math.PI / 2.6, -Math.PI / 3.5, 0.3);
    system.add(ring);
    ringe.push(ring);
  });

  /* --- Äußerer Rahmen: erscheint erst am Ende (die "größere Form") ------ */
  const aussenRahmen = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.016, 3, sparsam ? 48 : 96), matMetall.clone()
  );
  aussenRahmen.material.opacity = 0;
  aussenRahmen.rotation.set(Math.PI / 2.05, 0.2, 0);
  system.add(aussenRahmen);

  /* --- Streben: geben dem Objekt Architektur ---------------------------- */
  const streben = [];
  for (let i = 0; i < 6; i++) {
    const w = (i / 6) * Math.PI * 2;
    const strebe = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 1.5), matMetall);
    strebe.position.set(Math.cos(w) * 1.1, Math.sin(w) * 1.1, 0);
    strebe.lookAt(0, 0, 0);
    system.add(strebe);
    streben.push(strebe);
  }

  /* --- Knoten an den Ringkreuzungen ------------------------------------- */
  const knotenGeo = new THREE.OctahedronGeometry(0.055, 0);
  const knoten = [];
  for (let i = 0; i < 10; i++) {
    const w = (i / 10) * Math.PI * 2;
    const k = new THREE.Mesh(knotenGeo, matMetall);
    k.position.set(Math.cos(w) * 2.05, Math.sin(w) * 2.05 * 0.5, Math.sin(w * 2) * 0.4);
    system.add(k);
    knoten.push(k);
  }

  /* --- Die fünf Bauteile ------------------------------------------------
     Jedes Bauteil ist eine Gruppe: Metallplatte + Glasauflage + Kantenlinien
     + ein schmaler Leuchtstreifen. Gedockt bilden sie eine Schale um den
     Kern, getrennt stehen sie als lesbare Panels im Raum. */
  const bauteile = [];
  const plattenGeo = new THREE.BoxGeometry(1.08, 1.42, 0.07);
  const plattenKanten = new THREE.EdgesGeometry(plattenGeo);
  const glasGeo = new THREE.BoxGeometry(0.94, 1.26, 0.012);

  MODULE.forEach((name, i) => {
    const gruppe = new THREE.Group();

    const platte = new THREE.Mesh(plattenGeo, matMetall);
    gruppe.add(platte);

    const glas = new THREE.Mesh(glasGeo, matGlas);
    glas.position.z = 0.045;
    gruppe.add(glas);

    const kanten = new THREE.LineSegments(plattenKanten, matLinie);
    gruppe.add(kanten);

    const streifen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.035),
      new THREE.MeshBasicMaterial({
        color: i === MODULE.length - 1 ? C_MESSING : C_AKZENT,
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending
      })
    );
    streifen.position.set(0, -0.52, 0.055);
    gruppe.add(streifen);

    const winkel = (i / MODULE.length) * Math.PI * 2 - Math.PI / 2;
    bauteile.push({
      gruppe, streifen, winkel,
      tiefe: Math.sin(winkel * 1.6) * 1.0,
      neige: (i % 2 === 0 ? 1 : -1) * 0.24,
      phase: i * 1.31
    });
    system.add(gruppe);
  });

  /* --- Verbindungslinien Kern ↔ Bauteile --------------------------------
     Werden in Abschnitt 06 "gezeichnet" (drawRange wächst mit p). */
  const verbGeo = new THREE.BufferGeometry();
  const verbPunkte = new Float32Array(MODULE.length * 2 * 3);
  verbGeo.setAttribute("position", new THREE.BufferAttribute(verbPunkte, 3));
  const verbindungen = new THREE.LineSegments(
    verbGeo,
    new THREE.LineBasicMaterial({ color: C_AKZENT, transparent: true, opacity: 0 })
  );
  szene.add(verbindungen);

  /* --- Datenpunkte, die auf den Verbindungen laufen --------------------- */
  const datenGeo = new THREE.BufferGeometry();
  const datenPos = new Float32Array(MODULE.length * 3);
  datenGeo.setAttribute("position", new THREE.BufferAttribute(datenPos, 3));
  const datenpunkte = new THREE.Points(
    datenGeo,
    new THREE.PointsMaterial({
      color: C_AKZENT, size: 0.075, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  szene.add(datenpunkte);

  /* --- Partikelfeld: trägt Abschnitt 01, danach nur noch Atmosphäre ----- */
  const anzahlPartikel = sparsam ? 220 : 700;
  const partikelGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(anzahlPartikel * 3);
  for (let i = 0; i < anzahlPartikel; i++) {
    /* in einer Kugelschale verteilt, damit die Kamera immer "drin" ist */
    const r = 4 + Math.random() * 11;
    const t = Math.random() * Math.PI * 2;
    const f = Math.acos(2 * Math.random() - 1);
    pPos[i * 3]     = Math.sin(f) * Math.cos(t) * r;
    pPos[i * 3 + 1] = Math.cos(f) * r * 0.7;
    pPos[i * 3 + 2] = Math.sin(f) * Math.sin(t) * r;
  }
  partikelGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const partikel = new THREE.Points(
    partikelGeo,
    new THREE.PointsMaterial({
      color: 0x9fb4d8, size: 0.032, transparent: true, opacity: 0,
      sizeAttenuation: true, depthWrite: false
    })
  );
  szene.add(partikel);

  /* --- Raster: definiert den Raum, ohne ihn zu erklären ----------------- */
  const raster = new THREE.GridHelper(30, sparsam ? 15 : 30, C_AKZENT, 0x1a1d24);
  raster.position.y = -4.2;
  raster.material.transparent = true;
  raster.material.opacity = 0;
  szene.add(raster);

  /* ======================================================================
     Kamerafahrt
     Eine Spline durch acht Stationen. Der Scrollfortschritt ist die
     Position auf dieser Kurve – dadurch wirkt jede Scrollbewegung räumlich,
     ohne dass die Kamera hektisch wird.
     ====================================================================== */
  const kameraweg = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 0.0,  0.6,  13.6),   /* 01 weit weg, fast dunkel */
    new THREE.Vector3( 0.8,  0.4,  11.2),   /* 02 näher */
    new THREE.Vector3( 1.2,  0.0,   9.3),   /* 03 das Objekt ist da, ganz im Bild */
    new THREE.Vector3( 0.6,  1.5,   8.8),   /* 04 leicht von oben */
    new THREE.Vector3(-2.0,  0.5,   9.0),   /* 05 zur Seite, Bauteile getrennt */
    new THREE.Vector3(-2.9, -0.7,   7.4),   /* 06 dicht an den Bauteilen vorbei */
    new THREE.Vector3(-1.2,  0.3,   8.7),   /* 06b wieder heraus */
    new THREE.Vector3( 0.0,  0.35, 11.4)    /* 07 die vollständige Form */
  ], false, "catmullrom", 0.35);

  const blickweg = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.15, 0.05, 0),
    new THREE.Vector3(-0.1, 0, 0),
    new THREE.Vector3(0.2, 0.15, 0),
    new THREE.Vector3(0, 0.05, 0),
    new THREE.Vector3(0, 0, 0)
  ], false, "catmullrom", 0.35);

  /* --- Maus-Parallaxe (nur Desktop, sehr dezent) ------------------------ */
  const maus = { x: 0, y: 0, zx: 0, zy: 0 };
  function mausBewegt(e) {
    maus.zx = (e.clientX / window.innerWidth) * 2 - 1;
    maus.zy = (e.clientY / window.innerHeight) * 2 - 1;
  }
  if (!sparsam) window.addEventListener("pointermove", mausBewegt, { passive: true });

  /* ======================================================================
     Scrollfortschritt
     ====================================================================== */
  let p = 0;
  function fortschrittLesen() {
    const rect = buehne.getBoundingClientRect();
    const strecke = rect.height - window.innerHeight;
    const roh = strecke > 0 ? -rect.top / strecke : (rect.top <= 0 ? 1 : 0);
    p = klemme(roh);
  }

  /* --- Größe ------------------------------------------------------------ */
  function groesseSetzen() {
    const b = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(b, h, false);
    kamera.aspect = b / h;
    kamera.updateProjectionMatrix();
  }

  /* --- Nur rechnen, wenn sichtbar --------------------------------------- */
  let sichtbar = true;
  let sichtBeobachter = null;
  if ("IntersectionObserver" in window) {
    sichtBeobachter = new IntersectionObserver(
      (e) => { sichtbar = e.some((x) => x.isIntersecting); },
      { rootMargin: "100px" }
    );
    sichtBeobachter.observe(canvas);
  }
  let groessenBeobachter = null;
  if ("ResizeObserver" in window) {
    groessenBeobachter = new ResizeObserver(groesseSetzen);
    groessenBeobachter.observe(canvas);
  } else {
    window.addEventListener("resize", groesseSetzen);
  }

  /* --- Labels (HTML) an die Bauteile heften ------------------------------ */
  const labels = Array.prototype.slice.call(
    document.querySelectorAll("[data-bauteil]")
  );
  const projektion = new THREE.Vector3();

  /* ======================================================================
     Bild für Bild
     ====================================================================== */
  const uhr = new THREE.Clock();
  let laeuft = true;
  let anforderung = 0;

  function bild() {
    if (!laeuft) return;
    anforderung = requestAnimationFrame(bild);
    if (!sichtbar || document.hidden) return;

    const t = uhr.getElapsedTime();
    fortschrittLesen();

    /* --- Abschnitte als weiche Fenster -------------------------------- */
    const a02 = glatt(fenster(p, 0.10, 0.30));   /* Wireframe entsteht */
    const a03 = glatt(fenster(p, 0.28, 0.44));   /* Material erscheint */
    const a04 = glatt(fenster(p, 0.44, 0.58));   /* Bauteile lösen sich */
    const a05 = glatt(fenster(p, 0.56, 0.70));   /* getrennt */
    const a06 = glatt(fenster(p, 0.70, 0.86));   /* Datenfluss */
    const a07 = glatt(fenster(p, 0.86, 1.00));   /* Zusammenbau */

    /* Trennungsgrad: 0 = gedockt, 1 = maximal getrennt.
       Steigt in 04/05, fällt in 07 wieder auf ein größeres Ganzes. */
    const trennung = klemme(a04 * 1.0) * (1 - a07 * 0.92);

    /* --- Kamera -------------------------------------------------------- */
    const wegPos = kameraweg.getPoint(p);
    const wegZiel = blickweg.getPoint(p);
    /* Maus sehr weich nachziehen */
    maus.x = mischen(maus.x, maus.zx, 0.045);
    maus.y = mischen(maus.y, maus.zy, 0.045);
    kamera.position.set(
      wegPos.x + maus.x * 0.42,
      wegPos.y - maus.y * 0.3,
      wegPos.z
    );
    kamera.lookAt(wegZiel);
    /* Brennweite: enger im Objektmoment, weiter beim Durchfahren */
    kamera.fov = mischen(40, 33, a03) + a06 * 6 - a07 * 3;
    kamera.updateProjectionMatrix();

    /* --- Sichtbarkeit der Materialien ---------------------------------- */
    const drahtAuf = a02 * (1 - a03);                 /* nur dazwischen */
    matDraht.opacity = drahtAuf * 0.85;
    kernDraht.visible = matDraht.opacity > 0.01;

    matMetall.opacity = a03;
    matKern.opacity = a03;
    matGlas.opacity = a03 * 0.92;
    matLinie.opacity = a03 * (0.5 + 0.45 * trennung);

    /* --- Partikel und Raum --------------------------------------------- */
    partikel.material.opacity = mischen(0.85, 0.28, a03);
    partikel.rotation.y = t * 0.012;
    raster.material.opacity = glatt(fenster(p, 0.16, 0.4)) * 0.13 * (1 - a07 * 0.5);

    /* --- Kern ---------------------------------------------------------- */
    kern.rotation.y = t * 0.1 + p * 2.2;
    kern.rotation.x = Math.sin(t * 0.17) * 0.1;
    kernGlas.rotation.y = -t * 0.06 - p * 1.1;
    kernDraht.rotation.copy(kernGlas.rotation);
    const kernSkala = mischen(0.75, 1, a03) * (1 + a07 * 0.16);
    kern.scale.setScalar(kernSkala);
    kernGlas.scale.setScalar(kernSkala);
    kernDraht.scale.setScalar(mischen(0.75, 1, a02));

    innen.intensity = a03 * 4.5 + a07 * 3;

    /* --- Ringe --------------------------------------------------------- */
    ringe.forEach((r, i) => {
      const rs = mischen(0.7, 1, a03) * (1 + a07 * (0.12 + i * 0.05));
      r.scale.setScalar(rs);
      r.rotation.z += (i % 2 === 0 ? 0.0006 : -0.0004);
    });
    aussenRahmen.material.opacity = a07 * 0.55;
    aussenRahmen.rotation.z = t * 0.03;
    aussenRahmen.scale.setScalar(mischen(0.86, 1, a07));

    /* Streben und Knoten treten beim Zerlegen zurück */
    const gerippe = a03 * (1 - trennung * 0.75);
    streben.forEach((s) => { s.scale.set(1, 1, mischen(0.5, 1, gerippe)); });
    knoten.forEach((k, i) => {
      k.scale.setScalar(mischen(0.2, 1, a03));
      k.position.y = Math.sin((i / 10) * Math.PI * 2) * 1.02 + Math.sin(t * 0.4 + i) * 0.02;
    });

    /* --- Die fünf Bauteile --------------------------------------------- */
    bauteile.forEach((b, i) => {
      /* gedockt: enge Schale um den Kern. getrennt: weiter Ring.
         am Ende: etwas weiter als am Anfang – die "vollständigere Form". */
      const radius = mischen(1.28, 2.62, trennung) * (1 + a07 * 0.12);
      const schweben = Math.sin(t * 0.5 + b.phase) * 0.05 * trennung;

      b.gruppe.position.set(
        Math.cos(b.winkel) * radius,
        Math.sin(b.winkel) * radius * 0.72 + schweben,
        b.tiefe * trennung
      );
      /* Gedockt zeigen die Platten nach außen (Schale), getrennt drehen sie
         sich zur Kamera, damit sie als Bauteil lesbar werden. */
      b.gruppe.rotation.set(
        b.neige * trennung,
        mischen(b.winkel + Math.PI / 2, Math.cos(b.winkel) * 0.5, trennung),
        mischen(b.winkel, Math.sin(t * 0.3 + b.phase) * 0.05, trennung)
      );
      b.gruppe.scale.setScalar(mischen(0.62, 1, a03) * mischen(1, 1.06, trennung));
      b.streifen.material.opacity = a03 * (0.15 + 0.85 * trennung);

      /* Verbindungslinien: Kern → Bauteil */
      const zp = b.gruppe.position;
      verbPunkte[i * 6 + 0] = 0; verbPunkte[i * 6 + 1] = 0; verbPunkte[i * 6 + 2] = 0;
      verbPunkte[i * 6 + 3] = zp.x; verbPunkte[i * 6 + 4] = zp.y; verbPunkte[i * 6 + 5] = zp.z;

      /* Datenpunkt läuft auf der Linie – nur wenn Verbindungen sichtbar */
      const lauf = (t * 0.35 + i * 0.2) % 1;
      datenPos[i * 3 + 0] = zp.x * lauf;
      datenPos[i * 3 + 1] = zp.y * lauf;
      datenPos[i * 3 + 2] = zp.z * lauf;
    });
    verbGeo.attributes.position.needsUpdate = true;
    datenGeo.attributes.position.needsUpdate = true;

    const verbAuf = glatt(fenster(p, 0.66, 0.80)) * (1 - a07 * 0.8);
    verbindungen.material.opacity = verbAuf * 0.4;
    datenpunkte.material.opacity = verbAuf * 0.9;

    /* --- Das ganze System dreht sich langsam weiter -------------------- */
    system.rotation.y = p * 1.5 + t * 0.02;
    system.rotation.x = Math.sin(p * Math.PI) * 0.12;
    /* Gegenbewegung zur Maus: verstärkt die Räumlichkeit minimal */
    system.rotation.z = -maus.x * 0.03;

    /* --- Licht folgt der Dramaturgie ---------------------------------- */
    grundlicht.intensity = mischen(0.06, 0.22, a03);
    schluessel.intensity = mischen(0.3, 2.3, a03);
    kante.intensity = mischen(0.5, 2.1, a02) + a06 * 0.6;

    renderer.render(szene, kamera);

    /* --- Labels nachziehen (nur wenn sie gebraucht werden) ------------- */
    if (labels.length) {
      const zeigen = a05 > 0.02 && a07 < 0.85;
      const b = canvas.clientWidth, h = canvas.clientHeight;
      labels.forEach((el, i) => {
        const teil = bauteile[i];
        if (!teil) return;
        if (!zeigen) { el.style.opacity = "0"; return; }
        projektion.copy(teil.gruppe.position).applyMatrix4(system.matrixWorld);
        projektion.project(kamera);
        const x = (projektion.x * 0.5 + 0.5) * b;
        const y = (-projektion.y * 0.5 + 0.5) * h;
        el.style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(y) + "px,0) translate(-50%,-50%)";
        /* hinter der Kamera bzw. außerhalb: ausblenden */
        const drin = projektion.z < 1 && x > 0 && x < b && y > 0 && y < h;
        el.style.opacity = drin ? String(0.75 * a05 * (1 - a07)) : "0";
      });
    }
  }

  /* --- Kontextverlust --------------------------------------------------- */
  function verloren(e) { e.preventDefault(); laeuft = false; cancelAnimationFrame(anforderung); }
  function zurueck() { if (!laeuft) { laeuft = true; bild(); } }
  canvas.addEventListener("webglcontextlost", verloren);
  canvas.addEventListener("webglcontextrestored", zurueck);

  groesseSetzen();
  fortschrittLesen();
  bild();

  /* --- Aufräumen -------------------------------------------------------- */
  function beenden() {
    laeuft = false;
    cancelAnimationFrame(anforderung);
    canvas.removeEventListener("webglcontextlost", verloren);
    canvas.removeEventListener("webglcontextrestored", zurueck);
    window.removeEventListener("pointermove", mausBewegt);
    if (sichtBeobachter) sichtBeobachter.disconnect();
    if (groessenBeobachter) groessenBeobachter.disconnect();
    else window.removeEventListener("resize", groesseSetzen);

    szene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    plattenKanten.dispose();
    szene.environment = null;
    umgebung.dispose();
    renderer.dispose();
  }

  return { beenden: beenden };
}
