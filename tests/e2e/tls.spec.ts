import { test, expect } from '@playwright/test';

// Non-régression sur un second IG (TLS) : pages profil à onglets imbriqués.
const TLS = 'http://127.0.0.1:8082';
const PAGES = ['StructureDefinition-tls-appointment.html', 'StructureDefinition-tls-document-reference.html'];

test('TLS CapabilityStatement : les entrées de la TOC séparent « SHALL » du nom de la ressource', async ({ page }) => {
  await page.goto(`${TLS}/CapabilityStatement-tls-appointment-client.html`);
  const texts = await page.locator('.sidebar-page-toc a').allTextContents();
  const conformance = texts.filter((t) => t.includes('Resource Conformance'));
  expect(conformance.length).toBeGreaterThan(0);
  expect(conformance).toContain('Resource Conformance: SHALL Appointment');
  for (const t of conformance) expect(t).toMatch(/Resource Conformance: \S+ \S/);
});

for (const path of PAGES) {
  test(`TLS ${path} : TOC cohérente avec chaque onglet, sans erreur JS`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`${TLS}/${path}`);

    const tabs = await page.locator('#tabs > ul a[href^="#tabs-"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const tab of tabs) {
      await page.click(`#tabs a[href="${tab}"]`);
      // Toute entrée de la TOC doit viser un titre visible.
      const hidden = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('.sidebar-page-toc a')].map((a) => a.getAttribute('href')!.slice(1));
        return ids.filter((id) => ![...document.querySelectorAll(`[id="${CSS.escape(id)}"]`)]
          .some((h) => (h as HTMLElement).offsetParent !== null));
      });
      expect(hidden, `onglet ${tab}`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
