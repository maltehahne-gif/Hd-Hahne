/* ==========================================================================
   HAHNE DIGITAL – Modulseite: Filter, Suche, Auswahl, Kostenschätzung
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var MODULE = window.MODULE || [];
  var KATEGORIEN = window.MODULE_KATEGORIEN || [];
  var DEMOS = window.MODULE_DEMOS || {};
  var grid = $("#modulgrid");
  if (!grid) return;

  /* Annahmen für den Mietsoftware-Vergleich – hier anpassbar */
  var VERGLEICH = { nutzer: 3, proNutzer: 39, jahre: 5 };

  var MIETE = window.MIETE || { satz: .06, grundgebuehr: 79, mindestlaufzeit: 24, verlaengerung: 12, einrichtung: 149 };
  var auswahl = [];
  var filter = "alle";
  var suche = "";
  var modell = "kauf";   // "kauf" oder "miete"

  // Geschütztes Leerzeichen: Betrag und Eurozeichen bleiben in einer Zeile
  var euro = function (n) { return n.toLocaleString("de-DE") + "\u00a0€"; };
  var katName = function (id) {
    var k = KATEGORIEN.filter(function (x) { return x.id === id; })[0];
    return k ? k.name : "";
  };

  /* --- Kopfzahlen ---------------------------------------------------------- */
  var preise = MODULE.filter(function (m) { return m.preis > 0; }).map(function (m) { return m.preis; });
  var statAnzahl = $("#statAnzahl"), statVon = $("#statVon"), statKat = $("#statKat");
  if (statAnzahl) statAnzahl.textContent = MODULE.length;
  if (statVon) statVon.textContent = euro(Math.min.apply(null, preise));
  if (statKat) statKat.textContent = KATEGORIEN.length;
  var mieten = MODULE.filter(function (m) { return m.miete > 0; }).map(function (m) { return m.miete; });
  var statMiete = $("#statMiete");
  if (statMiete && mieten.length) statMiete.textContent = euro(Math.min.apply(null, mieten)) + "/Mon.";

  /* --- Filterleiste -------------------------------------------------------- */
  var filterbar = $("#modulfilter");
  var chips = [{ id: "alle", name: "Alle" }].concat(KATEGORIEN);
  filterbar.innerHTML = chips.map(function (k, i) {
    var n = k.id === "alle" ? MODULE.length :
      MODULE.filter(function (m) { return m.kategorie === k.id; }).length;
    return '<button class="chip" type="button" data-cat="' + k.id + '" aria-pressed="' +
      (i === 0 ? "true" : "false") + '">' + k.name + '<span class="chip-n">' + n + "</span></button>";
  }).join("");

  filterbar.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    filter = btn.dataset.cat;
    $$(".chip", filterbar).forEach(function (c) {
      c.setAttribute("aria-pressed", c === btn ? "true" : "false");
    });
    render();
  });

  var schalter = $("#modellschalter");
  if (schalter) {
    schalter.addEventListener("click", function (e) {
      var btn = e.target.closest(".modell-btn");
      if (!btn) return;
      modell = btn.dataset.modell;
      $$(".modell-btn", schalter).forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      document.body.dataset.modell = modell;
      render(); rechner();
    });
  }

  var suchfeld = $("#modulsuche");
  if (suchfeld) {
    suchfeld.addEventListener("input", function () {
      suche = suchfeld.value.trim().toLowerCase();
      render();
    });
  }

  /* --- Kacheln ------------------------------------------------------------- */
  function passt(m) {
    if (filter !== "alle" && m.kategorie !== filter) return false;
    if (!suche) return true;
    return (m.name + " " + m.kurz + " " + m.punkte.join(" ")).toLowerCase().indexOf(suche) > -1;
  }

  function render() {
    var liste = MODULE.filter(passt);
    var treffer = $("#treffer");
    if (treffer) treffer.textContent = liste.length + (liste.length === 1 ? " Modul" : " Module");

    if (!liste.length) {
      grid.innerHTML = '<p class="leer">Kein Modul gefunden. Beschreiben Sie uns einfach den Ablauf – ' +
        'wir entwickeln auch Module, die hier noch nicht stehen.</p>';
      return;
    }

    grid.innerHTML = liste.map(function (m) {
      var gewaehlt = auswahl.indexOf(m.id) > -1;
      var preisText, unter;
      if (modell === "miete" && m.nurKauf) {
        preisText = euro(m.preis);
        unter = "einmalig – nicht mietbar";
      } else if (modell === "miete" && m.miete > 0) {
        preisText = euro(m.miete) + "<span>/Monat</span>";
        unter = (m.monat ? "zzgl. " + euro(m.monat) + "/Mon. Nutzung · " : "") +
               MIETE.mindestlaufzeit + " Monate Laufzeit · einmalig " + euro(MIETE.einrichtung) + " Einrichtung";
      } else if (modell === "miete") {
        preisText = "inklusive";
        unter = "in der Grundgebühr enthalten";
      } else {
        preisText = m.preis > 0 ? euro(m.preis) : euro(m.monat) + "<span>/Mon.</span>";
        unter = m.preis > 0 && m.monat ? "einmalig · zzgl. " + euro(m.monat) + "/Mon."
              : m.preis > 0 ? "einmalig, ab" : "monatlich kündbar";
      }

      return '<article class="modul spotlight' + (gewaehlt ? " gewaehlt" : "") + '" data-id="' + m.id + '"><span class="spot" aria-hidden="true"></span>' +
        (m.badge ? '<span class="modul-badge">' + m.badge + "</span>" : "") +
        '<p class="modul-kat">' + katName(m.kategorie) + "</p>" +
        "<h3>" + m.name + "</h3>" +
        '<p class="modul-kurz">' + m.kurz + "</p>" +
        '<ul class="modul-punkte">' + m.punkte.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul>" +
        '<div class="modul-foot">' +
          '<div class="modul-preis"><b>' + preisText + "</b><small>" + unter + "</small></div>" +
          '<div class="modul-aktionen">' +
            '<button class="anleitung-btn" type="button">Anleitung</button>' +
            (DEMOS[m.id] ? '<button class="demo-btn" type="button">Demo ausprobieren</button>' : "") +
            '<button class="modul-btn' + (gewaehlt ? " an" : "") + '" type="button" aria-pressed="' +
              (gewaehlt ? "true" : "false") + '">' + (gewaehlt ? "Ausgewählt" : "Hinzufügen") + "</button>" +
          "</div>" +
        "</div>" +
        '<p class="modul-meta">' + (m.basis ? "Erweiterung · " : "") + "Umsetzung: " + m.aufwand +
          (modell === "miete" && m.miete > 0
            ? ' · <b class="laufzeit">Vertragslaufzeit ' + MIETE.mindestlaufzeit + " Monate</b> · Kauf: " + euro(m.preis)
            : "") + "</p>" +
      "</article>";
    }).join("");
  }

  grid.addEventListener("click", function (e) {
    var anlBtn = e.target.closest(".anleitung-btn");
    if (anlBtn) {
      window.open("anleitung.html?modul=" + anlBtn.closest(".modul").dataset.id, "_blank", "noopener");
      return;
    }
    var demoBtn = e.target.closest(".demo-btn");
    if (demoBtn) {
      window.open("demo.html?modul=" + demoBtn.closest(".modul").dataset.id, "_blank", "noopener");
      return;
    }
    var btn = e.target.closest(".modul-btn");
    if (!btn) return;
    var id = btn.closest(".modul").dataset.id;
    var i = auswahl.indexOf(id);
    if (i > -1) auswahl.splice(i, 1); else auswahl.push(id);
    render();
    rechner();
  });

  /* --- Kostenschätzung ----------------------------------------------------- */
  var liste = $("#rechnerliste"), summeEl = $("#rechnersumme"), monatEl = $("#rechnermonat"),
      anfrageBtn = $("#rechneranfrage"), leerEl = $("#rechnerleer"), inhaltEl = $("#rechnerinhalt"),
      zaehlerEl = $("#rechnerzahl"), vglEl = $("#rechnervergleich"), leerenBtn = $("#rechnerleeren");

  function rechner() {
    var gewaehlt = MODULE.filter(function (m) { return auswahl.indexOf(m.id) > -1; });
    var nutzung = gewaehlt.reduce(function (s, m) { return s + (m.monat || 0); }, 0);

    leerEl.style.display = gewaehlt.length ? "none" : "block";
    inhaltEl.style.display = gewaehlt.length ? "block" : "none";
    zaehlerEl.textContent = gewaehlt.length ? gewaehlt.length : "";

    var monate = VERGLEICH.jahre * 12;
    var einmalig = gewaehlt.reduce(function (s, m) { return s + (m.preis || 0); }, 0);
    var mietSumme = gewaehlt.reduce(function (s, m) { return s + (m.miete || 0); }, 0);
    var einmalPosten = gewaehlt.reduce(function (s, m) { return s + (m.nurKauf ? m.preis : 0); }, 0);
    var mietGesamt = gewaehlt.length ? MIETE.grundgebuehr + mietSumme + nutzung : 0;

    liste.innerHTML = gewaehlt.map(function (m) {
      var wert = modell === "miete"
        ? (m.miete > 0 ? euro(m.miete) + "/Mon." : (m.nurKauf ? euro(m.preis) + " einmalig" : "inklusive"))
        : (m.preis > 0 ? euro(m.preis) : euro(m.monat) + "/Mon.");
      return "<li><span>" + m.name + "</span><span>" + wert + "</span></li>";
    }).join("") +
    (modell === "miete" && gewaehlt.length
      ? '<li><span>Grundgebühr (Hosting, Wartung, Support)</span><span>' +
        euro(MIETE.grundgebuehr) + "/Mon.</span></li>" : "");

    if (modell === "miete") {
      $("#labelHaupt").textContent = "Monatlich";
      $("#labelNeben").textContent = "Einmalig";
      summeEl.textContent = gewaehlt.length ? euro(mietGesamt) : "–";
      monatEl.textContent = euro(MIETE.einrichtung + einmalPosten) +
        (einmalPosten ? " (Einrichtung + einmalige Leistungen)" : " Einrichtungspauschale");
      $("#laufzeitBox").innerHTML = gewaehlt.length
        ? "<b>Einmalig " + euro(MIETE.einrichtung) + " Einrichtung · Vertragslaufzeit " +
          MIETE.mindestlaufzeit + " Monate</b>" +
          "<span>Gesamt über die Laufzeit: " +
          euro(MIETE.einrichtung + einmalPosten + mietGesamt * MIETE.mindestlaufzeit) + " · " +
          "Verlängerung um " + MIETE.verlaengerung + " Monate, wenn nicht " + MIETE.kuendigung +
          " gekündigt wird.</span>"
        : "";
      $("#laufzeitBox").style.display = gewaehlt.length ? "block" : "none";
      var mietKosten = MIETE.einrichtung + einmalPosten + mietGesamt * monate;
      var kaufKosten = einmalig + (nutzung + 78) * monate;
      vglEl.innerHTML =
        "<b>Miete oder Kauf – über " + VERGLEICH.jahre + " Jahre</b>" +
        '<div class="vgl-zeile"><span>Miete</span><span>' + euro(mietKosten) + "</span></div>" +
        '<div class="vgl-zeile"><span>Kauf inkl. Hosting &amp; Wartung</span><span>' + euro(kaufKosten) + "</span></div>" +
        "<p>" + (mietKosten > kaufKosten
          ? "Der Kauf ist über diesen Zeitraum um " + euro(mietKosten - kaufKosten) +
            " günstiger. Die Miete hat dafür keine Anfangsinvestition und ist zum Laufzeitende kündbar."
          : "In diesem Zuschnitt fahren Sie mit der Miete günstiger.") +
          " Die Miete läuft über " + MIETE.mindestlaufzeit + " Monate fest.</p>";
    } else {
      $("#labelHaupt").textContent = "Einmalig";
      $("#labelNeben").textContent = "Laufend";
      $("#laufzeitBox").style.display = "none";
      summeEl.textContent = einmalig > 0 ? "ab " + euro(einmalig) : "–";
      monatEl.textContent = nutzung > 0 ? euro(nutzung) + " / Monat" : "keine";
      var eigen = einmalig + nutzung * monate;
      var mietsw = VERGLEICH.nutzer * VERGLEICH.proNutzer * monate;
      vglEl.innerHTML =
        "<b>Über " + VERGLEICH.jahre + " Jahre gerechnet</b>" +
        '<div class="vgl-zeile"><span>Diese Auswahl, gekauft</span><span>' + euro(eigen) + "</span></div>" +
        '<div class="vgl-zeile"><span>Fremde Mietsoftware, ' + VERGLEICH.nutzer + " Nutzer à " +
          euro(VERGLEICH.proNutzer) + "/Mon.</span><span>" + euro(mietsw) + "</span></div>" +
        "<p>" + (eigen < mietsw
          ? "Differenz: " + euro(mietsw - eigen) + " zugunsten der eigenen Lösung – und der Quellcode bleibt bei Ihnen."
          : "Bei diesem Zuschnitt ist fremde Mietsoftware zunächst günstiger. Das kann trotzdem die falsche Wahl sein, wenn Ihr Ablauf nicht in den Standard passt.") + "</p>";
    }

    if (angebotBtn) angebotBtn.disabled = !gewaehlt.length;
    anfrageBtn.disabled = !gewaehlt.length;
    var dom = window.DOMAIN && window.DOMAIN.gewaehlt();
    anfrageBtn.href = gewaehlt.length
      ? "index.html?module=" + auswahl.join(",") + "&modell=" + modell +
        (dom ? "&domain=" + encodeURIComponent(dom) : "") + "#kontakt" : "#";
  }

  /* --- Angebot als PDF ------------------------------------------------------- */
  var angebotBtn = $("#angebotBtn");
  if (angebotBtn) {
    angebotBtn.addEventListener("click", function () {
      if (!auswahl.length || !window.ANGEBOT) return;
      angebotDialog();
    });
  }

  function angebotDialog() {
    var dlg = $("#angebotDialog");
    if (!dlg) return;
    $("#angebotAnzahl").textContent = auswahl.length + (auswahl.length === 1 ? " Modul" : " Module");
    $("#angebotModell").textContent = modell === "miete"
      ? "Miete – " + MIETE.mindestlaufzeit + " Monate Laufzeit" : "Kauf – einmalig";
    $("#angebotStatus").textContent = "";
    $("#angebotStatus").className = "angebot-status";
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    $("#angebotKunde").focus();
  }

  function angebotBauen() {
    var kunde = ($("#angebotKunde").value || "").trim();
    var ort = ($("#angebotOrt").value || "").trim();
    var dom = window.DOMAIN && window.DOMAIN.gewaehlt()
      ? { name: window.DOMAIN.gewaehlt(), geprueft: window.DOMAIN.geprueftAm() } : null;
    var a = window.ANGEBOT.ausAuswahl(auswahl, modell, kunde || "Interessent", ort, dom);
    var bytes = window.ANGEBOT.erstellen(a);
    var blob = new Blob([bytes], { type: "application/pdf" });
    return { angebot: a, blob: blob, url: URL.createObjectURL(blob),
             datei: "Angebot-" + a.nummer + "-Hahne-Digital.pdf" };
  }

  function angebotStatus(text, art) {
    var el = $("#angebotStatus");
    el.innerHTML = text;
    el.className = "angebot-status an" + (art ? " " + art : "");
  }

  var dlgA = $("#angebotDialog");
  if (dlgA) {
    $("#angebotZu").addEventListener("click", function () { dlgA.close(); });
    dlgA.addEventListener("click", function (e) { if (e.target === dlgA) dlgA.close(); });

    $("#angebotDrucken").addEventListener("click", function () {
      var r = angebotBauen();
      var w = window.open(r.url, "_blank");
      if (w) { w.addEventListener("load", function () { try { w.print(); } catch (e) {} }); }
      angebotStatus("Das Angebot <b>" + r.angebot.nummer + "</b> wurde in einem neuen Tab geöffnet. " +
        "Falls der Druckdialog nicht erscheint, drücken Sie dort Strg+P.");
    });

    $("#angebotLaden").addEventListener("click", function () {
      var r = angebotBauen();
      var a = document.createElement("a");
      a.href = r.url; a.download = r.datei;
      document.body.appendChild(a); a.click(); a.remove();
      angebotStatus("Angebot <b>" + r.angebot.nummer + "</b> wurde gespeichert: " + r.datei);
    });

    $("#angebotMail").addEventListener("click", function () {
      var r = angebotBauen();
      var a2 = document.createElement("a");
      a2.href = r.url; a2.download = r.datei;
      document.body.appendChild(a2); a2.click(); a2.remove();

      var betreff = encodeURIComponent("Angebot " + r.angebot.nummer + " – Hahne Digital");
      var text = encodeURIComponent(window.ANGEBOT.alsText(r.angebot) +
        "\nDas vollständige Angebot liegt als PDF bei.\n");
      var eigene = ($("#angebotMailAdresse").value || "").trim();
      window.location.href = "mailto:" + eigene + "?subject=" + betreff + "&body=" + text;
      angebotStatus("Das PDF wurde heruntergeladen und Ihr E-Mail-Programm geöffnet. " +
        "<b>Bitte hängen Sie die Datei noch an</b> – aus Sicherheitsgründen kann eine Website " +
        "keine Anhänge selbst einfügen.", "warnung");
    });

    $("#angebotWhatsapp").addEventListener("click", function () {
      var r = angebotBauen();
      var a3 = document.createElement("a");
      a3.href = r.url; a3.download = r.datei;
      document.body.appendChild(a3); a3.click(); a3.remove();

      var nummer = (window.SITE && window.SITE.whatsapp) || "";
      var text = encodeURIComponent(window.ANGEBOT.alsText(r.angebot) +
        "\nDas vollständige Angebot habe ich als PDF vorliegen.");
      window.open("https://wa.me/" + nummer + "?text=" + text, "_blank", "noopener");
      angebotStatus("Das PDF wurde heruntergeladen und WhatsApp mit der Zusammenfassung geöffnet. " +
        "<b>Die PDF-Datei können Sie dort über die Büroklammer anhängen.</b>", "warnung");
    });
  }

  if (leerenBtn) {
    leerenBtn.addEventListener("click", function () { auswahl = []; render(); rechner(); });
  }

  /* Aus der Demoseite übernommenes Modul vormerken */
  (function () {
    var id = new URLSearchParams(window.location.search).get("vormerken");
    if (!id || !MODULE.some(function (m) { return m.id === id; })) return;
    if (auswahl.indexOf(id) === -1) auswahl.push(id);
    render();
    rechner();
    var m = MODULE.filter(function (x) { return x.id === id; })[0];
    var box = document.createElement("div");
    box.className = "auswahl-hinweis";
    box.innerHTML = "<b>" + m.name + " wurde aus der Demo übernommen.</b> " +
      "Ergänzen Sie weitere Module oder erstellen Sie rechts direkt Ihr Angebot.";
    var ziel = document.querySelector(".steuerung");
    if (ziel && ziel.parentNode) ziel.parentNode.insertBefore(box, ziel);
  })();

  render();
  rechner();
})();
