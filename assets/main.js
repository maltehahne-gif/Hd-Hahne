/* ==========================================================================
   HAHNE DIGITAL – Interaktionen
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Mobile Navigation -------------------------------------------------- */
  var burger = $("#burger"), links = $("#navlinks");
  if (burger && links) {
    var toggleNav = function (open, fokusZurueck) {
      links.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
      if (open) {
        var ersterLink = links.querySelector("a");
        if (ersterLink) ersterLink.focus();
      } else if (fokusZurueck) {
        burger.focus();
      }
    };
    burger.addEventListener("click", function () {
      toggleNav(burger.getAttribute("aria-expanded") !== "true");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") toggleNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        toggleNav(false, true);
      }
    });
    // Fokus innerhalb des geöffneten mobilen Menüs halten.
    // Die Handlungsaufforderung der Leiste steht im geöffneten Menü unten
    // fest, liegt im Dokument aber neben der Linkliste – sie gehört deshalb
    // ausdrücklich mit in die Fokusfalle, sonst wäre sie mit der Tastatur
    // nicht erreichbar. Der Zuhörer sitzt darum an der ganzen Leiste.
    var nav = burger.closest(".nav") || document;
    var bedienbar = function () {
      var liste = $$("a", links);
      var cta = nav.querySelector ? nav.querySelector(".navin > .btn-primary") : null;
      // Nicht über offsetParent prüfen: der Knopf steht im geöffneten Menü
      // fest positioniert, und dafür liefert offsetParent null.
      if (cta && getComputedStyle(cta).display !== "none") liste.push(cta);
      return liste;
    };
    nav.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !links.classList.contains("open")) return;
      var eintraege = bedienbar();
      if (!eintraege.length) return;
      var erster = eintraege[0], letzter = eintraege[eintraege.length - 1];
      if (e.shiftKey && document.activeElement === erster) { e.preventDefault(); burger.focus(); }
      else if (!e.shiftKey && document.activeElement === letzter) { e.preventDefault(); erster.focus(); }
    });
  }

  /* --- Scroll-Reveal ------------------------------------------------------
     Die Reveals verantwortet ausschließlich assets/motion.js. Hier bewusst
     kein zweiter Beobachter: zwei Steuerungen auf denselben Elementen
     würden sich gegenseitig überholen. */

  /* --- Kennzahlen: Zähler steigt hoch, sobald die Leiste sichtbar wird ----- */
  var kennzahlen = $$("[data-count]");
  if (kennzahlen.length) {
    var leiseZahlen = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $$("[data-count-module]").forEach(function (el) {
      if (window.MODULE && window.MODULE.length) el.setAttribute("data-count", window.MODULE.length);
    });
    var zaehleHoch = function (el) {
      var ziel = parseInt(el.getAttribute("data-count"), 10) || 0;
      var suffix = el.getAttribute("data-count-suffix") || "";
      if (leiseZahlen) { el.textContent = ziel + suffix; return; }
      var start = null, dauer = 1100;
      var schritt = function (zeit) {
        if (start === null) start = zeit;
        var t = Math.min(1, (zeit - start) / dauer);
        var geglaettet = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(ziel * geglaettet) + suffix;
        if (t < 1) requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    };
    if ("IntersectionObserver" in window) {
      var zahlObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { zaehleHoch(e.target); zahlObs.unobserve(e.target); }
        });
      }, { threshold: .4 });
      kennzahlen.forEach(function (el) { zahlObs.observe(el); });
    } else {
      kennzahlen.forEach(zaehleHoch);
    }
  }

  /* --- Aktiver Menüpunkt beim Scrollen ------------------------------------ */
  var navAnchors = $$('#navlinks a[href^="#"]');
  var sections = navAnchors.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id ? "true" : "false");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --- Nach oben ---------------------------------------------------------- */
  var toTop = $("#totop");
  if (toTop) {
    // Sichtbarkeit hängt am gebündelten Scroll-Takt in assets/motion.js;
    // hier bleibt nur die eigentliche Handlung.
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* --- Demo-Module -------------------------------------------------------- */
  var demos = {
    crm: {
      kicker: "CRM / Kundenverwaltung",
      title: "Kunden und Vorgänge zentral steuern.",
      text: "Statt verstreuter Listen: Kontakte, Status, Wiedervorlagen und nächste Schritte in einem klaren Arbeitsbereich.",
      stats: [["128", "Kunden"], ["14", "offene Vorgänge"], ["7", "Wiedervorlagen"]],
      rows: [["Muster GmbH", "Angebot", "Offen"], ["Nordservice KG", "Termin", "Heute"], ["Beispiel &amp; Co.", "Auftrag", "Aktiv"]]
    },
    invoice: {
      kicker: "Angebote &amp; Rechnungen",
      title: "Dokumente schneller erstellen und sauber nachverfolgen.",
      text: "Angebote, Rechnungen, Zahlstatus und Kundenhistorie in einem Ablauf statt in mehreren Programmen.",
      stats: [["24", "Entwürfe"], ["18", "versendet"], ["6", "offen"]],
      rows: [["RE-2026-0814", "1.249,00 €", "Bezahlt"], ["AN-2026-0441", "2.890,00 €", "Offen"], ["RE-2026-0815", "640,00 €", "Versendet"]]
    },
    service: {
      kicker: "Service &amp; Termine",
      title: "Planung, Wartung und Folgeschritte im Griff.",
      text: "Termine, Servicefälle, Notizen und Folgeaktionen werden strukturiert zusammengeführt.",
      stats: [["9", "Termine heute"], ["3", "offene Fälle"], ["92 %", "erledigt"]],
      rows: [["10:00 Uhr", "Wartung", "Bestätigt"], ["12:30 Uhr", "Beratung", "Bestätigt"], ["15:00 Uhr", "Service", "Offen"]]
    },
    kalender: {
      kicker: "Kalendermodul",
      title: "Termine landen automatisch im Handy-Kalender.",
      text: "Jeder bestätigte Termin wird als Kalendereintrag bereitgestellt. Der Kalender wird einmal am Smartphone abonniert – danach erscheinen neue Termine, Änderungen und Absagen von selbst, ohne dass jemand etwas abtippt.",
      stats: [["1×", "Einrichtung je Gerät"], ["≤ 60 Sek.", "bis der Termin am Handy steht"], ["3", "Kalendersysteme unterstützt"]],
      rows: [
        ["Mo 17.08. · 10:00", "Wartung Nordservice", "Im Kalender"],
        ["Mo 17.08. · 14:30", "Beratung Muster GmbH", "Zeit geändert"],
        ["Di 18.08. · 09:00", "Serviceeinsatz Eckernförde", "Neu übertragen"]
      ],
      extra:
        "<b>So kommt der Termin aufs Handy</b>" +
        "<ul>" +
        "<li><b>Kalender-Abo (ICS/WebCal):</b> einmal den Link öffnen – iPhone, Android und Outlook holen den Kalender danach selbstständig ab.</li>" +
        "<li><b>Einzeltermin per Anhang:</b> Bestätigungsmail mit .ics-Datei, ein Tippen genügt zum Eintragen.</li>" +
        "<li><b>Direkte Anbindung:</b> auf Wunsch Schreibzugriff auf Google Kalender oder Microsoft 365 nach einmaliger Freigabe.</li>" +
        "</ul>" +
        "<p>Pro Mitarbeiter ein eigener Kalender, Erinnerungen, Adresse für die Navigation und Absagen werden automatisch nachgezogen.</p>"
    },
    fahrtenbuch: {
      kicker: "Fahrtenbuch",
      title: "Fahrten lückenlos erfassen – ohne Zettelwirtschaft.",
      text: "Fahrten werden mit Datum, Kilometerstand, Route, Zweck und Fahrer erfasst, geschäftlich oder privat zugeordnet und als Auswertung für die Buchhaltung ausgegeben.",
      stats: [["142", "Fahrten im Monat"], ["3.480 km", "davon 78 % geschäftlich"], ["4", "Fahrzeuge"]],
      rows: [["14.08. · Kunde Nord", "86 km", "Geschäftlich"], ["13.08. · Werkstatt", "24 km", "Geschäftlich"], ["12.08. · Privatfahrt", "31 km", "Privat"]]
    },
    shop: {
      kicker: "Shop &amp; Bestellungen",
      title: "Produkte verkaufen und Bestellungen sauber verarbeiten.",
      text: "Produktdaten, Bestellungen, Zahlung und Versand in einem durchgängigen Verkaufsprozess.",
      stats: [["38", "Bestellungen"], ["4.820 €", "Umsatz"], ["12", "Versand offen"]],
      rows: [["#1048", "129,90 €", "Neu"], ["#1047", "349,00 €", "Bezahlt"], ["#1046", "89,00 €", "Versendet"]]
    }
  };

  var demoScreen = $("#demoScreen");
  var tabs = $$(".tab");

  function renderDemo(key) {
    var d = demos[key];
    if (!d || !demoScreen) return;
    demoScreen.innerHTML =
      '<div class="kicker">' + d.kicker + "</div>" +
      "<h3>" + d.title + "</h3><p>" + d.text + "</p>" +
      '<div class="stats">' + d.stats.map(function (s) {
        return '<div class="stat"><b>' + s[0] + "</b>" + s[1] + "</div>";
      }).join("") + "</div>" +
      '<div class="table">' + d.rows.map(function (r) {
        return '<div class="row"><b>' + r[0] + "</b><span>" + r[1] + '</span><span class="status">' + r[2] + "</span></div>";
      }).join("") + "</div>" +
      (d.extra ? '<div class="demo-extra">' + d.extra + "</div>" : "") +
      '<p class="demo-note">Beispielansicht mit Musterdaten. Aufbau, Felder und Abläufe werden für Ihr Unternehmen individuell entwickelt.</p>';
  }

  // Wechsel zwischen den Beispielmodulen: der alte Inhalt tritt kurz zurück,
  // der neue kommt mit leichter Bewegung wieder nach vorn. Ohne Animation
  // (reduzierte Bewegung) wird sofort umgeschaltet.
  var leiserWechsel = window.matchMedia("(prefers-reduced-motion: reduce)");
  var wechselTimer = null;

  function selectTab(btn, focus) {
    tabs.forEach(function (t) {
      var on = t === btn;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
    });
    if (focus) btn.focus();

    var key = btn.dataset.demo;
    if (!demoScreen || leiserWechsel.matches || !demoScreen.innerHTML) {
      renderDemo(key);
      return;
    }
    window.clearTimeout(wechselTimer);
    demoScreen.classList.add("is-swapping");
    wechselTimer = window.setTimeout(function () {
      renderDemo(key);
      demoScreen.classList.remove("is-swapping");
    }, 200);
  }

  if (tabs.length) {
    tabs.forEach(function (btn, i) {
      btn.addEventListener("click", function () { selectTab(btn); });
      btn.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); selectTab(next, true); }
      });
    });
    selectTab(tabs[0]);
  }

  /* --- Projekt-Check ------------------------------------------------------ */
  var questions = $$(".question"), prog = $("#prog"), stepCount = $("#stepCount");
  var resultBox = $("#result"), resultText = $("#resultText"), questionWrap = $("#questions");
  var answers = [], step = 1, total = questions.length;

  var empfehlung = {
    web: {
      titel: "Business Website als Basis",
      text: "Im Vordergrund steht ein professioneller Auftritt mit klarer Nutzerführung. Ziel: Besucher schnell verstehen lassen, was Sie anbieten – und den Weg zur Anfrage so kurz wie möglich halten."
    },
    shop: {
      titel: "Verkaufsorientiertes Shopsystem",
      text: "Entscheidend sind Produktstruktur, ein einfacher Checkout und eine saubere Bestellverarbeitung. Der Aufwand steckt weniger im Design als in Produktdaten, Versand- und Zahlungslogik."
    },
    process: {
      titel: "Individuelles Firmenmodul",
      text: "Der größte Hebel liegt im internen Ablauf. Der erste Ausbaustufe sollte genau den Schritt vereinfachen, der heute die meiste Zeit kostet – messbar, bevor weitere Bereiche dazukommen."
    },
    ai: {
      titel: "KI-Integration mit klarem Anwendungsfall",
      text: "KI lohnt sich dort, wo sie einen konkreten Prozess verbessert: Beratung, Wissenszugriff oder Produktempfehlung. Wichtig ist eine saubere Datenbasis, sonst bleibt es ein Showeffekt."
    }
  };

  var startHinweis = {
    small: "Empfohlener Einstieg: kleiner, klar abgegrenzter erster Ausbauschritt mit Erweiterungsoption.",
    full: "Empfohlener Einstieg: vollständiger Aufbau in einem Projekt mit fester Struktur und festem Termin.",
    mvp: "Empfohlener Einstieg: Pilotversion mit dem Kernprozess, danach Ausbau anhand der Praxiserfahrung.",
    consult: "Empfohlener Einstieg: zuerst Konzeptgespräch, dann Umsetzung auf Basis eines abgestimmten Plans."
  };

  var umfangHinweis = {
    standard: "Der Funktionsumfang kann bewusst schlank bleiben.",
    custom: "Individuelle Funktionen sind eingeplant – dafür ist eine eigene Datenlogik sinnvoll.",
    system: "Mehrere Bereiche werden verbunden, daher von Anfang an als System denken.",
    open: "Der Umfang ist noch offen – das lässt sich im Erstgespräch schnell eingrenzen."
  };

  var schwerpunkt = {
    contact: "Schwerpunkt: Anfragen und Termine",
    crm: "Schwerpunkt: Kunden und Aufträge",
    commerce: "Schwerpunkt: Bestellungen und Rechnungen",
    assistant: "Schwerpunkt: KI und Wissenszugriff"
  };

  function showStep(n) {
    questions.forEach(function (q) { q.classList.toggle("active", +q.dataset.q === n); });
    if (prog) prog.style.width = (n / total * 100) + "%";
    if (stepCount) stepCount.textContent = "Frage " + n + " von " + total;
    var current = $('.question[data-q="' + n + '"]');
    if (current) {
      $$(".option", current).forEach(function (o) {
        o.setAttribute("aria-pressed", o.dataset.val === answers[n - 1] ? "true" : "false");
      });
    }
  }

  function showResult() {
    var e = empfehlung[answers[0]] || empfehlung.web;
    if (questionWrap) questionWrap.style.display = "none";
    if (prog) prog.style.width = "100%";
    if (stepCount) stepCount.textContent = "Auswertung";
    resultText.innerHTML =
      "<strong>" + e.titel + "</strong><p>" + e.text + "</p><ul>" +
      "<li>" + (schwerpunkt[answers[2]] || "Schwerpunkt wird im Gespräch festgelegt") + "</li>" +
      "<li>" + (umfangHinweis[answers[1]] || "") + "</li>" +
      "<li>" + (startHinweis[answers[3]] || "") + "</li></ul>";
    resultBox.classList.add("show");
    resultBox.focus();

    var msg = $("#message");
    if (msg) {
      msg.value =
        "Ergebnis Projekt-Check\n" +
        "Ziel: " + labelFor(1) + "\n" +
        "Individualität: " + labelFor(2) + "\n" +
        "Wichtigste Funktion: " + labelFor(3) + "\n" +
        "Start: " + labelFor(4) + "\n\n" +
        "Empfehlung: " + e.titel + "\n\nUnser Vorhaben:\n";
    }
    var typeSel = $("#type");
    if (typeSel) {
      var mapType = { web: "Internetpräsenz", shop: "Shopsystem", process: "Firmenmodul", ai: "KI-Lösung" };
      typeSel.value = mapType[answers[0]] || "Kombination / noch offen";
    }
  }

  function labelFor(qNum) {
    var q = $('.question[data-q="' + qNum + '"]');
    if (!q) return "";
    var btn = $$(".option", q).filter(function (o) { return o.dataset.val === answers[qNum - 1]; })[0];
    return btn ? btn.textContent.trim() : "";
  }

  $$(".option").forEach(function (btn) {
    btn.addEventListener("click", function () {
      answers[step - 1] = btn.dataset.val;
      if (step < total) { step++; showStep(step); }
      else showResult();
    });
  });

  $$(".back").forEach(function (b) {
    b.addEventListener("click", function () {
      if (step > 1) { step--; showStep(step); }
    });
  });

  var restart = $("#restart");
  if (restart) {
    restart.addEventListener("click", function () {
      answers = []; step = 1;
      if (questionWrap) questionWrap.style.display = "block";
      resultBox.classList.remove("show");
      showStep(1);
    });
  }
  if (questions.length) showStep(1);

  /* --- Modulauswahl von der Modulseite uebernehmen ------------------------- */
  (function () {
    var msg = $("#message");
    if (!msg || !window.MODULE_NAMEN) return;
    var params = new URLSearchParams(window.location.search);
    var ids = (params.get("module") || "").split(",").filter(Boolean);
    if (!ids.length) return;

    var namen = ids.map(function (id) { return window.MODULE_NAMEN[id]; }).filter(Boolean);
    if (!namen.length) return;

    var istMiete = params.get("modell") === "miete";
    var modell = istMiete ? "Miete (monatlich, 24 Monate Vertragslaufzeit, einmalig 149 € Einrichtung)" : "Kauf (einmalig)";
    var domain = params.get("domain");
    msg.value = "Gewünschtes Modell: " + modell + "\n\nAusgewählte Module:\n- " + namen.join("\n- ") +
      (domain ? "\n\nWunschdomain: " + domain + " (auf der Website als frei geprüft)" : "") +
      "\n\nUnser Vorhaben:\n";
    var typeSel = $("#type");
    if (typeSel) typeSel.value = "Firmenmodul";

    var hinweis = document.createElement("div");
    hinweis.className = "auswahl-hinweis";
    hinweis.innerHTML = "<b>Ihre Modulauswahl wurde übernommen.</b> Ergänzen Sie kurz, worum es geht – wir melden uns mit einem konkreten Angebot für " + (istMiete ? "die monatliche Miete. Bitte beachten Sie die einmalige Einrichtungspauschale von 149 € und die Vertragslaufzeit von 24 Monaten." : "den Kauf.");
    var form = $("#contactForm");
    if (form) form.insertBefore(hinweis, form.firstChild);
  })();

  /* --- Kontaktformular ---------------------------------------------------- */
  var form = $("#contactForm");
  if (form) {
    var status = $("#formstatus");

    var setError = function (input, message) {
      var box = input.closest(".field");
      var out = box ? $(".err", box) : null;
      if (out) out.textContent = message || "";
      input.setAttribute("aria-invalid", message ? "true" : "false");
      return !message;
    };

    var validate = function () {
      var ok = true;
      var name = $("#name"), mail = $("#email"), msg = $("#message"), consent = $("#consent");

      ok = setError(name, name.value.trim().length < 2 ? "Bitte Namen oder Firma angeben." : "") && ok;
      ok = setError(mail, /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail.value.trim()) ? "" : "Bitte eine gültige E-Mail-Adresse angeben.") && ok;
      ok = setError(msg, msg.value.trim().length < 15 ? "Bitte kurz beschreiben, worum es geht (mind. 15 Zeichen)." : "") && ok;

      var cbox = consent.closest(".field") || consent.parentElement;
      var cerr = $("#consent-err");
      if (!consent.checked) { if (cerr) cerr.textContent = "Bitte der Verarbeitung zustimmen."; ok = false; }
      else if (cerr) cerr.textContent = "";
      return ok;
    };

    ["#name", "#email", "#message"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener("blur", function () { if (el.getAttribute("aria-invalid") === "true") validate(); });
    });

    var say = function (text) {
      if (!status) return;
      status.innerHTML = text;
      status.classList.add("show");
    };

    var wirdGesendet = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (wirdGesendet) return;                                // doppeltes Absenden verhindern
      var honeypot = $("#website") ? $("#website").value : "";
      if (honeypot) return;                                    // Spam-Falle
      if (!validate()) {
        say("Bitte prüfen Sie die markierten Felder.");
        var firstBad = $('[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
        return;
      }

      var data = {
        name: $("#name").value.trim(),
        email: $("#email").value.trim(),
        telefon: $("#phone") ? $("#phone").value.trim() : "",
        projektart: $("#type").value,
        nachricht: $("#message").value.trim(),
        consent: !!($("#consent") && $("#consent").checked),
        website: honeypot
      };

      var endpoint = window.SITE && window.SITE.formEndpoint;
      var btn = $("#submitBtn");

      if (endpoint) {
        wirdGesendet = true;
        btn.disabled = true;
        btn.textContent = "Wird gesendet …";
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(data)
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (payload) {
            if (!r.ok || !payload || payload.ok !== true) {
              throw new Error((payload && payload.error) || ("HTTP " + r.status));
            }
          });
        }).then(function () {
          form.reset();
          say("Vielen Dank – Ihre Anfrage ist eingegangen. Sie erhalten in der Regel innerhalb eines Werktags eine Rückmeldung.");
        }).catch(function (err) {
          var grund = err && err.message ? err.message : "";
          say((grund ? grund + " " : "Der Versand hat nicht funktioniert. ") +
              "Schreiben Sie gern direkt an " +
              '<a href="mailto:' + window.SITE.email + '">' + window.SITE.email + "</a>.");
        }).then(function () {
          wirdGesendet = false;
          btn.disabled = false;
          btn.textContent = "Projektanfrage senden";
        });
      } else {
        var subject = encodeURIComponent("Projektanfrage – " + data.projektart);
        var body = encodeURIComponent(
          "Name / Firma: " + data.name + "\n" +
          "E-Mail: " + data.email + "\n" +
          (data.telefon ? "Telefon: " + data.telefon + "\n" : "") +
          "Projektart: " + data.projektart + "\n\n" + data.nachricht
        );
        window.location.href = "mailto:" + (window.SITE ? window.SITE.email : "") + "?subject=" + subject + "&body=" + body;
        say("Ihre Anfrage wurde im E-Mail-Programm geöffnet. Bitte dort noch auf „Senden“ klicken. " +
            "Falls sich nichts öffnet, schreiben Sie an " +
            '<a href="mailto:' + (window.SITE ? window.SITE.email : "") + '">' + (window.SITE ? window.SITE.email : "") + "</a>.");
      }
    });
  }
})();
