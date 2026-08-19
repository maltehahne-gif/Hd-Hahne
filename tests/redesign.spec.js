// ==========================================================================
// Cinematic-Redesign: Hero-System, Navigationszustand, Prozess-Timeline,
// Wechsel der Beispielmodule, helle Szenen und reduzierte Bewegung.
// Geprüft wird die Wirkung auf die Bedienbarkeit – nicht das Aussehen im
// Detail, damit die Tests bei gestalterischen Feinarbeiten nicht brechen.
// ==========================================================================
const { test, expect } = require("@playwright/test");
const { preSeedPrivacyDecision, collectConsoleErrors } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await preSeedPrivacyDecision(page);
});

test("Hero zeigt das Systemobjekt, hält es aber aus dem Vorlesefluss heraus", async ({ page }) => {
  await page.goto("/index.html");
  const buehne = page.locator('[data-system="hero"]');
  await expect(buehne).toHaveCount(1);
  // Dekoration darf von Screenreadern nicht vorgelesen werden
  await expect(buehne.locator("xpath=ancestor-or-self::*[@aria-hidden='true']").first()).toHaveCount(1);
  // Canvas wird aufgebaut, andernfalls bleibt die statische Grafik stehen
  await expect(buehne).toHaveClass(/is-live/, { timeout: 5000 });
  const gemessen = await buehne.locator("canvas").evaluate((c) => ({ b: c.width, h: c.height }));
  expect(gemessen.b).toBeGreaterThan(0);
  expect(gemessen.h).toBeGreaterThan(0);
});

test("ohne Canvas bleibt eine hochwertige statische Darstellung übrig", async ({ page }) => {
  await page.goto("/index.html");
  const ersatz = page.locator('[data-system="hero"] .sys-fallback svg');
  await expect(ersatz).toHaveCount(1);
});

test("die Kernaussage steht als Text in der Seite, nicht nur in der Grafik", async ({ page }) => {
  await page.goto("/index.html");
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  await expect(h1).toContainText("Wir bauen keine Websites.");
  await expect(h1).toContainText("Wir bauen Systeme.");
});

test("Navigation wechselt beim Scrollen in den ruhigen Glaszustand", async ({ page }) => {
  await page.goto("/index.html");
  const nav = page.locator(".nav");
  await expect(nav).not.toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(nav).toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(nav).not.toHaveClass(/is-scrolled/);
});

test("Prozess-Timeline füllt sich beim Scrollen und markiert erreichte Schritte", async ({ page }) => {
  await page.goto("/index.html");
  const liste = page.locator("[data-process]");
  await expect(liste.locator(".process-step")).toHaveCount(4);

  const anteilOben = await liste.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--p")) || 0);
  expect(anteilOben).toBe(0);

  // ohne weiches Scrollen, damit die Messung nicht von der Scrolldauer abhängt
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const el = document.querySelector("[data-process]");
    const r = el.getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY + r.height - window.innerHeight * 0.5);
  });
  await page.waitForTimeout(400);

  const anteil = await liste.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--p")) || 0);
  expect(anteil).toBeGreaterThan(0);
  await expect(liste.locator(".process-step.is-passed").first()).toHaveCount(1);
});

test("Wechsel der Beispielmodule tauscht den Inhalt und hält aria-selected sauber", async ({ page }) => {
  await page.goto("/index.html#module");
  const schirm = page.locator("#demoScreen");
  await expect(schirm).toContainText("Kunden und Vorgänge");
  await expect(page.locator("#tab-crm")).toHaveAttribute("aria-selected", "true");

  await page.locator("#tab-shop").click();
  await expect(page.locator("#tab-shop")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tab-crm")).toHaveAttribute("aria-selected", "false");
  await expect(schirm).toContainText("Produkte verkaufen");
  // die Blende darf nicht hängen bleiben
  await expect(schirm).not.toHaveClass(/is-swapping/);
});

test("Beispielmodule bleiben mit den Pfeiltasten bedienbar", async ({ page }) => {
  await page.goto("/index.html#module");
  await page.locator("#tab-crm").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#tab-invoice")).toBeFocused();
  await expect(page.locator("#demoScreen")).toContainText("Dokumente schneller erstellen");
});

test("helle Szenen bleiben lesbar: Preise stehen auf hellem Grund mit dunklem Text", async ({ page }) => {
  await page.goto("/index.html#pakete");
  const werte = await page.locator("#pakete").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, farbe: getComputedStyle(el.querySelector("h2")).color };
  });
  const zahlen = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
  const hellHintergrund = zahlen(werte.bg).reduce((a, b) => a + b, 0) / 3;
  const dunklerText = zahlen(werte.farbe).reduce((a, b) => a + b, 0) / 3;
  expect(hellHintergrund).toBeGreaterThan(180);
  expect(dunklerText).toBeLessThan(90);
});

test("jede Seite trägt die große Wortmarke im Footer", async ({ page }) => {
  for (const seite of ["/index.html", "/module.html", "/demo.html", "/anleitung.html", "/impressum.html"]) {
    await page.goto(seite);
    await expect(page.locator("footer .foot-wordmark")).toHaveText("HAHNE DIGITAL");
    // rein dekorativ, daher nicht im Vorlesefluss
    await expect(page.locator("footer .foot-wordmark")).toHaveAttribute("aria-hidden", "true");
  }
});

test("Seitenwechsel über die Navigation funktioniert trotz weicher Blende", async ({ page }) => {
  await page.goto("/index.html");
  const breite = page.viewportSize().width;
  if (breite < 980) await page.locator("#burger").click();
  await page.locator("#navlinks a", { hasText: "Lösungen & Module" }).click();
  await expect(page).toHaveURL(/module\.html$/);
  await expect(page.locator("h1")).toContainText("Jedes Modul");
  await page.goBack();
  await expect(page).toHaveURL(/index\.html$/);
  // die Blende darf nach dem Zurückgehen nicht über der Seite liegen bleiben
  await expect(page.locator("body")).not.toHaveClass(/is-leaving/);
});

test.describe("mobiles Menü im neuen Vollbild-Zustand", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
    test.skip(page.viewportSize().width >= 980, "Nur unterhalb 980px sichtbar");
  });

  test("nimmt nahezu die gesamte Höhe ein und deckt den Seiteninhalt ab", async ({ page }) => {
    await page.locator("#burger").click();
    const menue = page.locator("#navlinks");
    await expect(menue).toHaveClass(/open/);
    const werte = await menue.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { hoehe: r.height, fenster: window.innerHeight, deckend: getComputedStyle(el).backgroundColor };
    });
    expect(werte.hoehe).toBeGreaterThan(werte.fenster * 0.7);
    expect(werte.deckend).not.toBe("rgba(0, 0, 0, 0)");
    // alle sechs Punkte sind erreichbar
    await expect(menue.locator("a")).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(menue.locator("a").nth(i)).toBeVisible();
  });
});

test.describe("reduzierte Bewegung", () => {
  test("zeigt alle Inhalte sofort, ohne Parallaxe und ohne Seitenblende", async ({ page }) => {
    const fehler = await collectConsoleErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/index.html");
    expect(await page.evaluate(() =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await page.waitForTimeout(400);

    await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
    await expect(page.locator(".service").first()).toHaveCSS("opacity", "1");
    await expect(page.locator(".layer-grid")).toHaveCSS("transform", "none");
    await expect(page.locator(".page-fade")).toHaveCount(0);

    const anteil = await page.locator("[data-process]")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--p").trim());
    expect(anteil).toBe("100%");

    expect(fehler, fehler.join(" | ")).toEqual([]);
  });

  test("der Projekt-Check bleibt vollständig bedienbar", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/index.html#berater");
    await page.locator('.question[data-q="1"] .option[data-val="process"]').click();
    await expect(page.locator("#stepCount")).toHaveText("Frage 2 von 4");
  });
});
