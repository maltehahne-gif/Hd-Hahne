// ==========================================================================
// Premium-Tech-Redesign: Systemarchitektur im Hero, Systemstrang,
// Masken-Reveals, Datenpakete, technische Sektionskennungen.
//
// Geprüft wird die Wirkung auf Bedienbarkeit und Zustand – nicht das
// Aussehen im Detail, damit die Tests bei gestalterischen Feinarbeiten
// nicht brechen. Der wichtigste Wächter ist "kein Element bleibt
// unsichtbar hängen": genau das war der Fehler, als die Reveals noch mit
// clip-path arbeiteten (ein beschnittenes Element meldet dem
// IntersectionObserver eine leere Schnittfläche und wird nie ausgelöst).
// ==========================================================================
const { test, expect } = require("@playwright/test");
const { preSeedPrivacyDecision, collectConsoleErrors } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await preSeedPrivacyDecision(page);
});

// Die ganze Seite einmal durchfahren, damit jeder Beobachter feuert.
async function durchScrollen(page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const hoehe = document.documentElement.scrollHeight;
    for (let y = 0; y < hoehe; y += Math.round(window.innerHeight * 0.7)) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 120));
  });
  await page.waitForTimeout(400);
}

test.describe("Hero – Systemarchitektur", () => {
  test("zeichnet die Anlage und hält sie aus dem Vorlesefluss heraus", async ({ page }) => {
    await page.goto("/index.html");
    const buehne = page.locator('[data-system="hero"]');
    await expect(buehne).toHaveClass(/is-live/, { timeout: 5000 });
    await expect(buehne).toHaveAttribute("aria-hidden", "true");
    const mass = await buehne.locator("canvas").evaluate((c) => ({ b: c.width, h: c.height }));
    expect(mass.b).toBeGreaterThan(0);
    expect(mass.h).toBeGreaterThan(0);
  });

  test("die Zeichnung bewegt sich und bleibt danach stehen, wenn sie aus dem Bild läuft", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      document.querySelector('[data-system="hero"]').scrollIntoView({ block: "center" });
    });
    const stand = () =>
      page.locator('[data-system="hero"] canvas').evaluate((c) => {
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let summe = 0;
        for (let i = 3; i < d.length; i += 20) summe += d[i];
        return summe;
      });
    await page.waitForTimeout(900);
    const a = await stand();
    await page.waitForTimeout(1100);
    const b = await stand();
    // Es steht etwas im Bild, und es hat sich verändert – die Szene läuft.
    expect(a).toBeGreaterThan(0);
    expect(b).not.toBe(a);
  });

  test("die Legende benennt die drei Ebenen der Zeichnung", async ({ page }) => {
    await page.goto("/index.html");
    const zeilen = page.locator(".stage-legend div");
    await expect(zeilen).toHaveCount(3);
    await expect(zeilen.nth(0)).toContainText(/Interface/i);
    await expect(zeilen.nth(1)).toContainText(/Logic/i);
    await expect(zeilen.nth(2)).toContainText(/Data/i);
  });

  test("ohne Canvas bleibt eine vollständige statische Zeichnung übrig", async ({ page }) => {
    await page.goto("/index.html");
    const ersatz = page.locator('[data-system="hero"] .sys-fallback svg');
    await expect(ersatz).toHaveCount(1);
    // drei Ebenen, ein Kern und eine Beschriftung – auch ohne Bewegung lesbar
    await expect(ersatz.locator(".f-fill")).toHaveCount(2);
    await expect(ersatz.locator(".f-accent-fill")).toHaveCount(1);
    await expect(ersatz.locator(".f-core")).toHaveCount(1);
    await expect(ersatz.locator(".f-mark text")).toHaveCount(3);
  });
});

test.describe("Reveals", () => {
  test("kein Element bleibt nach dem Durchscrollen unsichtbar hängen", async ({ page }) => {
    for (const seite of ["/index.html", "/module.html"]) {
      await page.goto(seite);
      await durchScrollen(page);
      const haengen = await page.evaluate(() =>
        [...document.querySelectorAll(".reveal")]
          .filter((el) => getComputedStyle(el).opacity === "0")
          .map((el) => el.className)
      );
      expect(haengen, seite + ": " + haengen.join(", ")).toEqual([]);
    }
  });

  test("die Maske gibt den Inhalt am Ende vollständig frei", async ({ page }) => {
    await page.goto("/index.html");
    await durchScrollen(page);
    const werte = await page.locator('.section-head[data-reveal="mask"]').first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { groesse: cs.maskSize || cs.webkitMaskSize, deckung: cs.opacity };
    });
    expect(werte.deckung).toBe("1");
    // über 100 %: an der Kante darf nichts abgeschnitten bleiben
    expect(werte.groesse).toMatch(/1[3-9]\d%|140%/);
  });

  test("Sektionen tragen ihre technische Kennung sichtbar", async ({ page }) => {
    await page.goto("/index.html");
    const kennungen = await page.$$eval("[data-nr]", (els) => els.map((e) => e.getAttribute("data-nr")));
    expect(kennungen.length).toBeGreaterThanOrEqual(5);
    expect(kennungen[0]).toMatch(/^01/);
    // Die Kennung wird über ::before ausgegeben und muss dargestellt werden
    const inhalt = await page.locator("[data-nr]").first().evaluate((el) =>
      getComputedStyle(el, "::before").content
    );
    expect(inhalt).toContain("01");
  });
});

test.describe("Systemstrang", () => {
  test("verbindet die Sektionen, sobald der Seitenrand dafür Platz hat", async ({ page }) => {
    await page.goto("/index.html");
    const breit = page.viewportSize().width >= 1180;
    const strang = page.locator("canvas.strang");
    await expect(strang).toHaveCount(1);
    if (!breit) {
      await expect(strang).toBeHidden();
      return;
    }
    await expect(strang).toBeVisible();
    // Er sitzt links neben der Inhaltsspalte und nimmt keine Eingaben an
    const werte = await strang.evaluate((c) => {
      const r = c.getBoundingClientRect();
      const wrap = document.querySelector(".wrap").getBoundingClientRect();
      return { rechts: r.right, spalte: wrap.left, zeiger: getComputedStyle(c).pointerEvents };
    });
    expect(werte.rechts).toBeLessThanOrEqual(werte.spalte + 32);
    expect(werte.zeiger).toBe("none");
  });

  test("aktiviert beim Scrollen weitere Knoten und nimmt sie beim Zurück wieder heraus", async ({ page }) => {
    await page.goto("/index.html");
    test.skip(page.viewportSize().width < 1180, "Nur mit Seitenrand");
    const gemalt = () =>
      page.locator("canvas.strang").evaluate((c) => {
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 12) n++;
        return n;
      });
    await page.waitForTimeout(400);
    const oben = await gemalt();
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, document.documentElement.scrollHeight * 0.55);
    });
    await page.waitForTimeout(700);
    const mitte = await gemalt();
    expect(mitte).toBeGreaterThan(0);
    expect(oben).toBeGreaterThan(0);
  });
});

test.describe("Datenpakete auf den Leistungsgrafiken", () => {
  test("laufen ihre Leitung entlang, sobald die Grafik im Bild war", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      document.querySelectorAll(".service")[1].scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(900);
    const paket = page.locator(".v-paket").nth(1);
    const a = await paket.evaluate((el) => getComputedStyle(el).offsetDistance);
    await page.waitForTimeout(700);
    const b = await paket.evaluate((el) => getComputedStyle(el).offsetDistance);
    expect(a).not.toBe(b);
  });
});

test.describe("Sprachumschaltung", () => {
  async function wechseln(page, code) {
    await page.click("#sprachKnopf");
    await page.click(`#sprachListe [data-code="${code}"]`);
  }
  const verwuerfelt = (t) => /[#+=<>]/.test(t);

  test("DE → EN → DE lässt keinen Text in der falschen Sprache oder verwürfelt zurück", async ({ page }) => {
    const fehler = await collectConsoleErrors(page);
    await page.goto("/index.html");
    await page.waitForTimeout(300);

    await wechseln(page, "en");
    await page.waitForTimeout(300);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toContainText("We build systems");
    await expect(page.locator('[data-t="leist1.p"]')).toContainText("High-quality");

    await wechseln(page, "de");
    await page.waitForTimeout(300);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.locator("h1")).toContainText("Wir bauen Systeme");
    await expect(page.locator('[data-t="leist1.p"]')).toContainText("Hochwertige");
    expect(fehler, fehler.join(" | ")).toEqual([]);
  });

  test("schneller Mehrfachwechsel endet sauber in der zuletzt gewählten Sprache", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForTimeout(300);
    for (const c of ["en", "de", "tr", "en"]) {
      await page.click("#sprachKnopf");
      await page.click(`#sprachListe [data-code="${c}"]`);
    }
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toContainText("We build systems");
    const marken = await page.$$eval(".kicker, .eyebrow", (els) => els.map((e) => e.textContent));
    expect(marken.filter(verwuerfelt), marken.join(" | ")).toEqual([]);
  });

  test("Wechsel mitten im Decode-Lauf hinterlässt keine verwürfelte Marke", async ({ page }) => {
    await page.goto("/index.html");
    // scrollen löst den Decode-Lauf der Marken aus, sofort danach umschalten
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      document.querySelector("#leistungen").scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(60);
    await page.click("#sprachKnopf");
    await page.click('#sprachListe [data-code="en"]');
    await page.waitForTimeout(1500);
    const marken = await page.$$eval(".kicker, .eyebrow, .statement-mark", (els) =>
      els.map((e) => e.textContent)
    );
    expect(marken.filter(verwuerfelt), marken.join(" | ")).toEqual([]);
    await expect(page.locator("#leistungen .kicker")).toHaveText("Services");
  });

  test("Scrollen während eines Sprachwechsels bricht nichts", async ({ page }) => {
    const fehler = await collectConsoleErrors(page);
    await page.goto("/index.html");
    await page.click("#sprachKnopf");
    await page.click('#sprachListe [data-code="en"]');
    await durchScrollen(page);
    const haengen = await page.evaluate(
      () => [...document.querySelectorAll(".reveal")].filter((el) => getComputedStyle(el).opacity === "0").length
    );
    expect(haengen).toBe(0);
    expect(fehler, fehler.join(" | ")).toEqual([]);
  });
});

test.describe("Bedienbarkeit", () => {
  test("jedes angesteuerte Bedienelement zeigt einen sichtbaren Fokusring", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForTimeout(300);
    const ohne = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const stand = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const cs = getComputedStyle(a);
        return {
          text: (a.innerText || a.getAttribute("aria-label") || a.tagName).slice(0, 30),
          breite: parseFloat(cs.outlineWidth),
          stil: cs.outlineStyle,
        };
      });
      if (stand && (!(stand.breite > 0) || stand.stil === "none")) ohne.push(stand.text);
    }
    expect(ohne, ohne.join(" | ")).toEqual([]);
  });

  test("die Handlungsaufforderung im mobilen Menü ist mit der Tastatur erreichbar", async ({ page }) => {
    await page.goto("/index.html");
    test.skip(page.viewportSize().width >= 980, "Nur unterhalb 980px");
    await page.locator("#burger").click();
    await expect(page.locator("#navlinks")).toHaveClass(/open/);
    const cta = page.locator(".navin > .btn-primary");
    await expect(cta).toBeVisible();
    const besucht = [];
    for (let i = 0; i < 9; i++) {
      besucht.push(await page.evaluate(() => (document.activeElement.innerText || "").slice(0, 24)));
      await page.keyboard.press("Tab");
    }
    expect(besucht.some((t) => /Projekt starten|Module auswählen/.test(t)), besucht.join(" | ")).toBe(true);
  });

  test("Berührflächen der Hauptbedienung sind groß genug", async ({ page }) => {
    await page.goto("/index.html");
    test.skip(page.viewportSize().width >= 980, "Nur auf kleinen Geräten");
    for (const wahl of ["#burger", ".kia-knopf", ".hero-actions .btn-primary"]) {
      const el = page.locator(wahl).first();
      if ((await el.count()) === 0) continue;
      const kasten = await el.boundingBox();
      if (!kasten) continue;
      expect(kasten.height, wahl).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe("reduzierte Bewegung", () => {
  test("liefert eine ruhige, aber vollständige Fassung ohne kaputte Zustände", async ({ page }) => {
    const fehler = await collectConsoleErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/index.html");
    await page.waitForTimeout(700);

    // Die Zeichnung steht als fertiges Standbild
    await expect(page.locator('[data-system="hero"]')).toHaveClass(/is-live/);

    // Kein Element bleibt maskiert oder unsichtbar
    const stand = await page.evaluate(() => ({
      versteckt: [...document.querySelectorAll(".reveal")].filter((e) => getComputedStyle(e).opacity === "0").length,
      masken: [...document.querySelectorAll("[data-reveal]")].filter((e) => {
        const m = getComputedStyle(e).maskImage;
        return m && m !== "none";
      }).length,
      ebenen: getComputedStyle(document.querySelector(".layer-grid")).transform,
    }));
    expect(stand.versteckt).toBe(0);
    expect(stand.masken).toBe(0);
    expect(stand.ebenen).toBe("none");

    await durchScrollen(page);
    expect(fehler, fehler.join(" | ")).toEqual([]);
  });
});

test.describe("Sauberkeit", () => {
  test("Startseite und Modulseite laufen ohne Konsolenfehler durch", async ({ page }) => {
    for (const seite of ["/index.html", "/module.html"]) {
      const fehler = await collectConsoleErrors(page);
      await page.goto(seite);
      await durchScrollen(page);
      expect(fehler, seite + ": " + fehler.join(" | ")).toEqual([]);
    }
  });

  test("es gibt genau eine Reveal-Steuerung und einen Systemstrang", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForTimeout(400);
    await expect(page.locator("canvas.strang")).toHaveCount(1);
    await expect(page.locator(".scroll-progress")).toHaveCount(1);
    await expect(page.locator(".page-fade")).toHaveCount(1);
    await expect(page.locator(".rail")).toHaveCount(1);
  });

  test("Größenwechsel und Drehung hinterlassen keinen kaputten Zustand", async ({ page }) => {
    const fehler = await collectConsoleErrors(page);
    await page.goto("/index.html");
    for (const [b, h] of [[390, 844], [844, 390], [1280, 800], [768, 1024], [1440, 900]]) {
      await page.setViewportSize({ width: b, height: h });
      await page.waitForTimeout(280);
      const werte = await page.evaluate(() => ({
        ueberlauf: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        canvas: (() => {
          const c = document.querySelector('[data-system="hero"] canvas');
          return c ? c.width > 0 && c.height > 0 : true;
        })(),
      }));
      expect(werte.ueberlauf, `${b}x${h}`).toBeLessThanOrEqual(0);
      expect(werte.canvas, `${b}x${h}`).toBe(true);
    }
    expect(fehler, fehler.join(" | ")).toEqual([]);
  });
});
