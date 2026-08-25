// ==========================================================================
// Navigation: Desktop-Hauptmenü (6 Punkte) und mobiles Menü
// (öffnen/schließen, Linkauswahl, Escape, Fokus, Hintergrund-Scroll-Sperre)
// ==========================================================================
const { test, expect } = require("@playwright/test");
const { preSeedPrivacyDecision } = require("./helpers");

test("Hauptnavigation zeigt genau die sechs vorgesehenen Punkte", async ({ page }) => {
  await page.goto("/index.html");
  const texte = await page.locator("#navlinks a").allTextContents();
  const bereinigt = texte.map((t) => t.trim());
  expect(bereinigt).toEqual(["Leistungen", "Lösungen & Module", "Demos", "Preise", "Über uns", "Kontakt"]);
});

test("Skip-Link springt zum Hauptinhalt", async ({ page }) => {
  await page.goto("/index.html");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test.describe("mobiles Menü", () => {
  test.beforeEach(async ({ page }) => {
    await preSeedPrivacyDecision(page);
    await page.goto("/index.html");
    const breite = page.viewportSize().width;
    test.skip(breite >= 980, "Burger-Menü nur unterhalb 980px sichtbar");
  });

  test("öffnet, verwaltet den Fokus und sperrt das Hintergrund-Scrollen", async ({ page }) => {
    const burger = page.locator("#burger");
    const links = page.locator("#navlinks");

    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(links).not.toHaveClass(/open/);

    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    await expect(links).toHaveClass(/open/);
    await expect(page.locator("body")).toHaveClass(/nav-open/);

    // Fokus liegt nach dem Öffnen auf dem ersten Menüpunkt
    await expect(links.locator("a").first()).toBeFocused();

    // Hintergrund-Scrollen ist gesperrt
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).toBe("hidden");
  });

  test("schließt sich nach Auswahl eines Links", async ({ page }) => {
    const burger = page.locator("#burger");
    await burger.click();
    await page.locator("#navlinks a", { hasText: "Kontakt" }).click();
    await expect(page.locator("#navlinks")).not.toHaveClass(/open/);
    await expect(burger).toHaveAttribute("aria-expanded", "false");
  });

  test("schließt sich mit Escape und gibt den Fokus an den Auslöser zurück", async ({ page }) => {
    const burger = page.locator("#burger");
    await burger.click();
    await expect(page.locator("#navlinks")).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#navlinks")).not.toHaveClass(/open/);
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(burger).toBeFocused();
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).not.toBe("hidden");
  });

  test("Tab am Ende der Liste hält den Fokus im geöffneten Menü", async ({ page }) => {
    const burger = page.locator("#burger");
    const links = page.locator("#navlinks a");
    await burger.click();
    const anzahl = await links.count();
    for (let i = 0; i < anzahl - 1; i++) await page.keyboard.press("Tab");
    await expect(links.nth(anzahl - 1)).toBeFocused();

    // Im geöffneten Menü steht die Handlungsaufforderung der Leiste unten
    // fest. Sie gehört mit in die Fokusfalle – erst danach springt der Fokus
    // wieder an den Anfang der Liste.
    const cta = page.locator(".navin > .btn-primary");
    await page.keyboard.press("Tab");
    await expect(cta).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(links.first()).toBeFocused();
  });
});

test("Footer enthält Rechtstexte auf jeder Seite, Anleitungen dort wo sinnvoll", async ({ page }) => {
  for (const seite of ["/index.html", "/module.html", "/demo.html", "/anleitung.html"]) {
    await page.goto(seite);
    const footer = page.locator(".footlinks");
    if (seite !== "/anleitung.html") {
      // Auf der Anleitungsseite selbst verlinkt der Footer folgerichtig nicht auf sich selbst.
      await expect(footer.getByText("Anleitungen", { exact: true })).toBeVisible();
    }
    await expect(footer.getByText("Impressum", { exact: true })).toBeVisible();
    await expect(footer.getByText("AGB", { exact: true })).toBeVisible();
    await expect(footer.getByText("Datenschutz", { exact: true })).toBeVisible();
  }
});
