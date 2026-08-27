// ==========================================================================
// Design-System: die Regeln aus DESIGN.md, als Test formuliert.
//
// Geprüft wird jeweils die Regel, nicht der einzelne Zahlenwert – damit
// gestalterische Feinarbeit die Tests nicht bricht, ein Bruch der Regel
// aber sofort auffällt.
// ==========================================================================
const { test, expect } = require("@playwright/test");
const { preSeedPrivacyDecision, collectConsoleErrors } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await preSeedPrivacyDecision(page);
});

const SEITEN = [
  "/index.html",
  "/module.html",
  "/demo.html",
  "/anleitung.html",
  "/impressum.html",
  "/agb.html",
  "/datenschutz.html",
];

const mittel = (farbe) => {
  const z = farbe.match(/\d+/g).slice(0, 3).map(Number);
  return (z[0] + z[1] + z[2]) / 3;
};

test.describe("Hero", () => {
  test("steht auf dem Desktop vollständig in einer Bildschirmhöhe", async ({ page }) => {
    test.skip(page.viewportSize().width < 1080, "Erst ab der zweispaltigen Fassung");
    await page.goto("/index.html");
    await page.waitForTimeout(600);
    const werte = await page.evaluate(() => {
      const hero = document.querySelector(".hero").getBoundingClientRect();
      const fuss = document.querySelector(".hero-foot").getBoundingClientRect();
      return { unten: hero.bottom, fussUnten: fuss.bottom, fenster: window.innerHeight };
    });
    // Auch die HUD-Zeile am unteren Rand gehört noch ins erste Bild.
    expect(werte.unten).toBeLessThanOrEqual(werte.fenster + 1);
    expect(werte.fussUnten).toBeLessThanOrEqual(werte.fenster + 1);
  });

  test("die Zeichnung läuft rechts über die Inhaltsspalte hinaus", async ({ page }) => {
    test.skip(page.viewportSize().width < 1080, "Der Anschnitt entfällt in der gestapelten Fassung");
    await page.goto("/index.html");
    const werte = await page.evaluate(() => {
      const rahmen = document.querySelector(".stage-frame").getBoundingClientRect();
      const spalte = document.querySelector(".hero-grid").getBoundingClientRect();
      return { rahmen: rahmen.right, spalte: spalte.right, fenster: window.innerWidth };
    });
    expect(werte.rahmen).toBeGreaterThan(werte.spalte);
    expect(werte.rahmen).toBeLessThanOrEqual(werte.fenster + 1);
  });
});

test.describe("Legende und Zeichnung sind verbunden", () => {
  test("das Zeigen auf eine Ebene hebt genau diese Ebene hervor", async ({ page }) => {
    test.skip(page.viewportSize().width < 1080, "Nur mit Zeiger und breiter Bühne sinnvoll");
    await page.goto("/index.html");
    await expect(page.locator('[data-system="hero"]')).toHaveClass(/is-live/, { timeout: 5000 });
    await page.waitForTimeout(900);

    const zeilen = page.locator(".stage-legend [data-ebene]");
    await expect(zeilen).toHaveCount(3);

    const betonung = () =>
      page.evaluate(() => {
        // Der Renderer hält die Betonung je Ebene als Ist-Wert; getestet wird
        // der sichtbare Effekt darüber, dass genau eine Ebene voll bleibt.
        const canvas = document.querySelector('[data-system="hero"] canvas');
        const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let summe = 0;
        for (let i = 3; i < d.length; i += 20) summe += d[i];
        return summe;
      });

    // Erst warten, bis der Aufbau der Zeichnung durchgelaufen ist – vorher
    // wächst die Farbmenge ohnehin, ein Vergleich wäre bedeutungslos.
    let vorher = 0;
    let neutral = 0;
    await expect
      .poll(
        async () => {
          vorher = neutral;
          neutral = await betonung();
          return neutral > 0 && Math.abs(neutral - vorher) / neutral < 0.03;
        },
        { timeout: 10000, intervals: [400] }
      )
      .toBe(true);

    const rahmen = page.locator(".stage-frame");
    await page.locator('.stage-legend [data-ebene="logic"]').hover();
    await expect(rahmen).toHaveAttribute("data-hervor", "logic");
    // Zwei Ebenen treten zurück: insgesamt liegt weniger Farbe im Bild.
    await expect.poll(betonung, { timeout: 8000 }).toBeLessThan(neutral * 0.9);
    const hervorgehoben = await betonung();

    // Und der Zustand geht wieder zurück, sobald der Zeiger die Bühne verlässt.
    await page.mouse.move(20, 400);
    await expect(rahmen).not.toHaveAttribute("data-hervor", /./);
    await expect.poll(betonung, { timeout: 8000 }).toBeGreaterThan(hervorgehoben * 1.1);
  });

  test("die Zeilen der Legende bleiben Text und kein zusätzlicher Tastaturhalt", async ({ page }) => {
    await page.goto("/index.html");
    const halte = await page.$$eval(".stage-legend [data-ebene]", (els) =>
      els.filter((e) => e.hasAttribute("tabindex") || e.tagName === "BUTTON").length
    );
    expect(halte).toBe(0);
  });
});

test.describe("Farbregel: Petrol führt, Sand markiert Geld", () => {
  test("Beträge stehen auf dunklem Grund im Sandton", async ({ page }) => {
    await page.goto("/index.html#sichtbar-teaser");
    const farbe = await page.locator(".teaser-preis b").first().evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = farbe.match(/\d+/g).slice(0, 3).map(Number);
    // Warm: mehr Rot als Blau, und deutlich heller als der Grund.
    expect(r).toBeGreaterThan(b + 40);
    expect(mittel(farbe)).toBeGreaterThan(140);
  });

  test("auf hellem Grund steht der Betrag in Textfarbe, nicht in Braun", async ({ page }) => {
    await page.goto("/index.html#pakete");
    const farbe = await page.locator("#pakete .price").first().evaluate((el) => getComputedStyle(el).color);
    expect(mittel(farbe)).toBeLessThan(90);
  });

  test("der Betrag ist deutlich größer gesetzt als der Fließtext daneben", async ({ page }) => {
    await page.goto("/index.html#pakete");
    const werte = await page.locator("#pakete .package").first().evaluate((el) => ({
      preis: parseFloat(getComputedStyle(el.querySelector(".price")).fontSize),
      text: parseFloat(getComputedStyle(el.querySelector("p:not(.price)")).fontSize),
    }));
    expect(werte.preis).toBeGreaterThan(werte.text * 2);
  });
});

test.describe("Eine Typoskala für alle Seiten", () => {
  test("Startseite und Modulseite setzen ihre Überschrift gleich groß", async ({ page }) => {
    const messen = async (seite) => {
      await page.goto(seite);
      return page.locator("h1").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    };
    const start = await messen("/index.html");
    const modul = await messen("/module.html");
    expect(Math.abs(start - modul)).toBeLessThan(1);
  });
});

test.describe("Modulkonsole", () => {
  test("rahmt die Beispielmodule als Fenster mit Kopfleiste", async ({ page }) => {
    await page.goto("/index.html#module");
    await expect(page.locator(".konsole .konsole-leiste")).toHaveCount(1);
    await expect(page.locator(".konsole .tabs .tab")).toHaveCount(6);
    await expect(page.locator(".konsole #demoScreen")).toHaveCount(1);
    // Die Kopfleiste ist Beiwerk und darf nicht vorgelesen werden.
    await expect(page.locator(".konsole-leiste")).toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("Kein seitlicher Überlauf – auch auf 320 px und in Leserichtung RTL", () => {
  for (const seite of SEITEN) {
    test(`${seite} bleibt auf 320 px im Bild`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(seite);
      await page.waitForTimeout(400);
      const ueberlauf = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(ueberlauf, seite).toBeLessThanOrEqual(0);
    });
  }

  test("Arabisch spiegelt die Seite, ohne sie seitlich scrollbar zu machen", async ({ page }) => {
    const fehler = await collectConsoleErrors(page);
    await page.goto("/index.html");
    await page.click("#sprachKnopf");
    await page.click('#sprachListe [data-code="ar"]');
    await page.waitForTimeout(600);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const ueberlauf = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(ueberlauf).toBeLessThanOrEqual(0);
    expect(fehler, fehler.join(" | ")).toEqual([]);
  });
});

test.describe("Sprunglink", () => {
  test("fährt beim Fokus sichtbar ins Bild statt aus der Seite zu wandern", async ({ page }) => {
    await page.goto("/index.html");
    const versteckt = await page.locator(".skip").evaluate((el) => el.getBoundingClientRect().bottom);
    expect(versteckt).toBeLessThanOrEqual(0);

    await page.keyboard.press("Tab");
    await expect(page.locator(".skip")).toBeFocused();
    await page.waitForTimeout(600);
    const sichtbar = await page.locator(".skip").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, links: r.left, hoehe: r.height };
    });
    expect(sichtbar.top).toBeGreaterThanOrEqual(-1);
    expect(sichtbar.links).toBeGreaterThanOrEqual(-1);
    expect(sichtbar.hoehe).toBeGreaterThan(30);
  });
});
