import { test, expect, Page } from '@playwright/test';

// Tests du template AP-HP sur l'IG DM construit localement (voir README > Tests).
// Chaque test correspond à un point de la revue de la PR #2 ou à une issue.
const DM = 'http://127.0.0.1:8081';

const MOBILE = { width: 390, height: 800 };

async function tocLinks(page: Page) {
  return page.locator('.sidebar-page-toc a');
}

test.describe('Drawer mobile', () => {
  test.use({ viewport: MOBILE });

  test('un clic sur un lien de la TOC referme le drawer et libère le scroll', async ({ page }) => {
    await page.goto(`${DM}/help.html`);
    await page.click('#nav-toggle');
    await expect(page.locator('#sidebar-wrapper')).toHaveClass(/open/);

    // La TOC est masquée en mobile ; on cible un lien de la TOC s'il est
    // présent dans le drawer, sinon n'importe quel lien d'ancre de la sidebar.
    const anchorLink = page.locator('#sidebar-wrapper a[href^="#"]').first();
    if (await anchorLink.count() === 0) test.skip(true, 'pas de lien d’ancre dans le drawer');
    await anchorLink.evaluate((a: HTMLElement) => a.click());

    await expect(page.locator('#sidebar-wrapper')).not.toHaveClass(/open/);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('le drawer défile quand la navigation dépasse sa hauteur', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 400 });
    await page.goto(`${DM}/StructureDefinition-logical-bundle.html`);
    await page.click('#nav-toggle');
    const nav = page.locator('#sidebar-wrapper #sidebar-nav');
    const { scrollable, overflowY } = await nav.evaluate((el) => ({
      scrollable: el.scrollHeight > el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    if (scrollable) expect(['auto', 'scroll']).toContain(overflowY);
  });
});

test('pas d’erreur JS au redimensionnement sur une page sans sidebar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Simule une page dont le layout n'a pas de #sidebar-wrapper.
  await page.route(`${DM}/help.html`, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('id="sidebar-wrapper"', 'id="no-sidebar"');
    await route.fulfill({ response: res, body });
  });
  await page.goto(`${DM}/help.html`);
  await page.setViewportSize({ width: 800, height: 700 });
  await page.setViewportSize({ width: 1300, height: 700 });
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
});

test('les diagrammes restent découpés dans leur conteneur', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto(`${DM}/data-platform-raw-layer.html`);
  const viewer = page.locator('.viewer-container').first();
  const box = (await viewer.boundingBox())!;
  // Juste sous le conteneur, on doit trouver le contenu de la page, pas le SVG.
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el ? !!el.closest('.svg-container') : false;
  }, { x: box.x + 20, y: box.y + box.height + 5 });
  // Et le SVG ne doit pas s'étendre visuellement au-delà du conteneur à droite.
  const clipped = await viewer.evaluate((el) => getComputedStyle(el).overflow);
  expect(hit).toBe(false);
  expect(clipped).toBe('hidden');
});

test.describe('TOC (« Sur cette page »)', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('#6 : après changement d’onglet, chaque entrée mène à un titre visible', async ({ page }) => {
    await page.goto(`${DM}/StructureDefinition-logical-bundle.html`);
    for (const tab of ['#tabs-diff', '#tabs-snap', '#tabs-key']) {
      await page.click(`#tabs a[href="${tab}"]`);
      const links = await tocLinks(page);
      const n = await links.count();
      for (let i = 0; i < n; i++) {
        const link = links.nth(i);
        await link.click();
        await page.waitForTimeout(700);
        // Le titre visé doit être visible et dans la fenêtre.
        const ok = await link.evaluate((a) => {
          const text = a.textContent!.trim();
          const hs = [...document.querySelectorAll('#content-wrapper h2[id], #content-wrapper h3[id], #content-wrapper h4[id]')]
            .filter((h) => (h as HTMLElement).offsetParent !== null && h.textContent!.includes(text));
          return hs.some((h) => { const r = h.getBoundingClientRect(); return r.top >= -2 && r.top < innerHeight; });
        });
        expect(ok, `onglet ${tab}, entrée « ${await link.textContent()} »`).toBe(true);
      }
    }
  });

  test('#4 : la dernière entrée de la TOC est atteignable sur un petit écran', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 500 });
    await page.goto(`${DM}/help.html`);
    const last = (await tocLinks(page)).last();
    // L'utilisateur fait défiler la page (la sidebar devient sticky), puis la TOC.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    // Molette au-dessus de la TOC (pas de scrollTop en JS : il fonctionne même
    // sur un overflow:hidden, ce qu'un utilisateur ne peut pas faire).
    const toc = (await page.locator('.sidebar-toc-title').boundingBox())!;
    await page.mouse.move(toc.x + 20, toc.y + toc.height + 15);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    const reachable = await last.evaluate((a) => {
      const r = a.getBoundingClientRect();
      const x = r.left + Math.min(10, r.width / 2), y = r.top + r.height / 2;
      return y > 0 && y < innerHeight && document.elementFromPoint(x, y) === a;
    });
    expect(reachable).toBe(true);
  });
});

test('les permaliens des titres apparaissent au survol', async ({ page }) => {
  await page.goto(`${DM}/index.html`);
  const h = page.locator('#content-wrapper h2[id]:has(.anchorjs-link)').first();
  await h.hover();
  const anchor = h.locator('.anchorjs-link');
  await expect(anchor).toBeVisible();
  await expect.poll(() => anchor.evaluate((a) => getComputedStyle(a).opacity)).toBe('1');
});

test('tables de structure : les cardinalités ne sont jamais coupées', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(`${DM}/StructureDefinition-omop-care-site.html`);
  const broken = await page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll('td.hierarchy').forEach((td) => {
      const t = td.textContent!.trim();
      if (!/^\d+\.\.(\d+|\*)$/.test(t)) return;
      const range = document.createRange(); range.selectNodeContents(td);
      const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      if ((td as HTMLElement).offsetParent && lines.size > 1) bad.push(t);
    });
    return bad;
  });
  expect(broken).toEqual([]);
});

test('#5 : les liens externes sont signalés par une icône', async ({ page }) => {
  await page.goto(`${DM}/index.html`);
  const res = await page.evaluate(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('#content-wrapper a[href^="http"]')]
      .filter((a) => a.host !== location.host && a.offsetParent !== null && !a.querySelector('img')
        && !a.hasAttribute('data-no-external') && !!a.closest('p, li, td'));
    const marked = (a: Element) => {
      const s = getComputedStyle(a, '::after');
      return (s.content && s.content !== 'none' && s.content !== 'normal') || s.backgroundImage !== 'none';
    };
    const internal = document.querySelector<HTMLAnchorElement>('#content-wrapper a[href$=".html"]:not([href^="http"])');
    return {
      total: links.length,
      unmarked: links.filter((a) => !marked(a)).map((a) => a.href),
      internalMarked: internal ? marked(internal) : false,
    };
  });
  expect(res.total).toBeGreaterThan(0);
  expect(res.unmarked).toEqual([]);
  expect(res.internalMarked).toBe(false);
});
