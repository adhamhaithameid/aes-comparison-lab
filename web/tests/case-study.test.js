/**
 * case-study.test.js — Playwright tests for the engineering case study page
 *
 * The page's figures are generated from results/*.csv via
 * scripts/generate_web_data.py, so these tests assert three things:
 *   1. the page renders and every section is present,
 *   2. the rendered numbers come from the data file (not from literals),
 *   3. no console errors or broken local links.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'file://' + path.resolve(__dirname, '../public');
const DATA_FILE = path.resolve(__dirname, '../public/js/benchmark-data.js');

/** Load the same data the page loads, outside the browser. */
function loadExpectedData() {
  const src = fs.readFileSync(DATA_FILE, 'utf8');
  // The file is an IIFE assigning to globalThis/window; evaluate it in a
  // sandbox that captures the assignment.
  const sandbox = {};
  new Function('window', 'globalThis', src)(sandbox, sandbox);
  return sandbox.BenchmarkData;
}

const DATA = loadExpectedData();

test.describe('Case study page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/case-study.html`);
  });

  test('loads with the expected title', async ({ page }) => {
    await expect(page).toHaveTitle(/Case Study — AES Comparison Lab/);
    await expect(page.locator('h1')).toContainText('AES Comparison Lab');
  });

  test('renders all ten required sections', async ({ page }) => {
    const ids = [
      'problem', 'architecture', 'implementation', 'testing',
      'benchmarks', 'learning', 'security', 'results', 'conclusion'
    ];
    for (const id of ids) {
      await expect(page.locator(`section.section#${id}`),
        `section #${id} must exist`).toHaveCount(1);
    }
    // The hero is not a <section>; check it directly.
    await expect(page.locator('.page-header h1')).toHaveCount(1);
  });

  test('populates the hero stats from real data', async ({ page }) => {
    const stats = page.locator('#heroStats .cs-stat');
    await expect(stats).toHaveCount(5);

    const values = await stats.locator('.cs-stat-value').allTextContents();
    const expectedChecks = DATA.facts.tests.checks.toLocaleString('en-US');
    expect(values[0]).toBe(expectedChecks);
    expect(values[1]).toBe('0');            // failures
    expect(values[2]).toBe(String(DATA.facts.web.page_count));
    expect(values[3]).toBe(String(DATA.facts.web.scenarios));
    expect(values[4]).toBe(DATA.provenance.raw_rows.toLocaleString('en-US'));
  });

  test('shows the test counts that the log actually reports', async ({ page }) => {
    await expect(page.locator('#testBadge')).toHaveText('All checks passed');

    const release = await page.locator('#testRelease').textContent();
    expect(release).toContain(DATA.facts.tests.checks.toLocaleString('en-US'));
    expect(release).toContain('ALL TESTS PASSED');

    const sanitizer = await page.locator('#testSanitizer').textContent();
    expect(sanitizer).toContain(DATA.facts.sanitizers.checks.toLocaleString('en-US'));
  });

  test('renders one row per test suite from the log', async ({ page }) => {
    const rows = page.locator('#negativeTests tbody tr');
    await expect(rows).toHaveCount(DATA.facts.tests.sections.length);
    // Suites with explicit counts must show their own numbers.
    const withCounts = DATA.facts.tests.sections.filter(s => s.total);
    expect(withCounts.length).toBeGreaterThan(0);
  });

  test('throughput table matches the CSV-derived data', async ({ page }) => {
    const sizes = DATA.getSizes();
    const headerCells = await page.locator('#throughputTable thead th').allTextContents();
    // header: Implementation + one column per size
    expect(headerCells.length).toBe(1 + sizes.length);

    const impls = ['scratch', 'openssl-ecb', 'openssl-gcm'];
    for (let i = 0; i < impls.length; i++) {
      const row = page.locator('#throughputTable tbody tr').nth(i);
      const label = await row.locator('th').textContent();
      expect(label).toBeTruthy();

      const cells = await row.locator('td').allTextContents();
      expect(cells.length).toBe(sizes.length);
      for (let j = 0; j < sizes.length; j++) {
        const rec = DATA.find(impls[i], 'encrypt', sizes[j]);
        expect(rec, `${impls[i]} encrypt ${sizes[j]} must exist`).toBeTruthy();
        const want = rec.mean_throughput_mib_s.toFixed(
          rec.mean_throughput_mib_s < 1 ? 4 : 2);
        expect(cells[j], `${impls[i]} @ ${sizes[j]}`).toBe(want);
      }
    }
  });

  test('decrypt table matches the CSV-derived data', async ({ page }) => {
    const sizes = DATA.getSizes();
    const impls = ['scratch', 'openssl-ecb', 'openssl-gcm'];
    for (let i = 0; i < impls.length; i++) {
      const row = page.locator('#decryptTable tbody tr').nth(i);
      const cells = await row.locator('td').allTextContents();
      for (let j = 0; j < sizes.length; j++) {
        const rec = DATA.find(impls[i], 'decrypt', sizes[j]);
        const want = rec.mean_throughput_mib_s.toFixed(
          rec.mean_throughput_mib_s < 1 ? 4 : 2);
        expect(cells[j], `${impls[i]} decrypt @ ${sizes[j]}`).toBe(want);
      }
    }
  });

  test('no benchmark figure is left as a placeholder', async ({ page }) => {
    for (const id of [
      'heroStats', 'archCore', 'archPipeline', 'archSite', 'implA', 'implB',
      'testRelease', 'testSanitizer', 'negativeTests', 'envList', 'methodList',
      'throughputTable', 'decryptTable', 'keysetupTable', 'memoryTable',
      'headlineStats', 'scenarioFacts', 'vizFacts', 'criteriaList',
      'resultCards', 'resultsNarrative', 'pagesTable', 'docLinks', 'sourceLinks'
    ]) {
      const text = (await page.locator(`#${id}`).textContent()) || '';
      expect(text.trim().length, `#${id} must not be empty`).toBeGreaterThan(0);
      expect(text, `#${id} must not contain a placeholder`).not.toMatch(/—\s*$/);
      expect(text).not.toMatch(/undefined|\[object Object\]|NaN/);
    }
  });

  test('derived headline statistics agree with the data', async ({ page }) => {
    const large = DATA.getSizes().slice(-1)[0];
    const ecb = DATA.find('openssl-ecb', 'encrypt', large);
    const scratch = DATA.find('scratch', 'encrypt', large);
    const gcm = DATA.find('openssl-gcm', 'encrypt', large);

    const ratio = Math.round(ecb.mean_throughput_mib_s / scratch.mean_throughput_mib_s);
    const overhead = (1 - gcm.mean_throughput_mib_s / ecb.mean_throughput_mib_s) * 100;

    const headline = await page.locator('#headlineStats').textContent();
    expect(headline).toContain(`~${ratio.toLocaleString('en-US')}×`);
    expect(headline).toContain(overhead.toFixed(1) + '%');

    // The narrative must quote the same measured throughputs.
    const narrative = await page.locator('#resultsNarrative').textContent();
    expect(narrative).toContain(DATA.formatThroughput(scratch.mean_throughput_mib_s));
    expect(narrative).toContain(DATA.formatThroughput(ecb.mean_throughput_mib_s));
    expect(narrative).toContain(DATA.formatThroughput(gcm.mean_throughput_mib_s));
    expect(narrative).toContain(overhead.toFixed(1) + '%');
  });

  test('distinguishes historical measurements from live ones', async ({ page }) => {
    const banner = page.locator('#benchmarks .alert-warning').first();
    await expect(banner).toContainText('historical measurements');
    await expect(banner).toContainText('Your browser does not re-measure');
    // And it must name the machine the numbers came from.
    await expect(banner).toContainText(DATA.environment.cpu);
  });

  test('never equates ECB with GCM security', async ({ page }) => {
    const table = page.locator('#security table').first();
    const text = await table.textContent();

    // The "identical plaintext" row must call out ECB as the risky one.
    const ecbRow = page.locator('#security tbody tr').filter({
      hasText: 'identical plaintext'
    });
    await expect(ecbRow).toHaveCount(1);
    await expect(ecbRow.locator('.badge-red')).toContainText('that is ECB');

    const safeRow = page.locator('#security tbody tr').filter({
      hasText: 'Safe for real data?'
    });
    await expect(safeRow.locator('.badge-red')).toHaveCount(1);
    await expect(safeRow.locator('.badge-green')).toHaveCount(1);

    // The comparison must be scoped to speed.
    await expect(page.locator('#implementation .alert, #implementation .text-muted')
      .filter({ hasText: 'speed' })).toHaveCount(1);
    expect(text).toContain('No');
  });

  test('states the security limitations explicitly', async ({ page }) => {
    const alert = page.locator('#security .alert-danger');
    await expect(alert).toContainText('for education, not protection');

    const limits = await page.locator('#security .cs-list').first().textContent();
    expect(limits).toMatch(/unauthenticated/i);
    expect(limits).toMatch(/not constant-time/i);
    expect(limits).toMatch(/side channels/i);
  });

  test('renders the environment from environment.txt', async ({ page }) => {
    const env = await page.locator('#envList').textContent();
    expect(env).toContain(DATA.environment.cpu);
    expect(env).toContain(DATA.environment.arch);

    const method = await page.locator('#methodList').textContent();
    expect(method).toContain(DATA.environment.compiler);
    expect(method).toContain(DATA.environment.openssl);
  });

  test('renders a chart or an explicit fallback, never a blank canvas',
    async ({ page }) => {
      const canvasCount = await page.locator('#throughputChart').count();
      const fallbackCount = await page.locator('#benchmarks .text-muted')
        .filter({ hasText: 'tables above carry the same data' }).count();
      expect(canvasCount + fallbackCount).toBe(1);
    });

  test('lists every site page in the learning table', async ({ page }) => {
    const rows = page.locator('#pagesTable tr');
    await expect(rows).toHaveCount(7);
    const hrefs = await page.locator('#pagesTable a').evaluateAll(
      as => as.map(a => a.getAttribute('href')));
    for (const href of ['index.html', 'fundamentals.html', 'visualizer.html',
      'key-explorer.html', 'dashboard.html', 'what-if.html', 'quiz.html']) {
      expect(hrefs).toContain(href);
    }
  });

  test('links to all other pages from the nav', async ({ page }) => {
    const hrefs = await page.locator('.nav-links a').evaluateAll(
      as => as.map(a => a.getAttribute('href')));
    for (const href of ['index.html', 'fundamentals.html', 'visualizer.html',
      'key-explorer.html', 'dashboard.html', 'case-study.html', 'what-if.html']) {
      expect(hrefs).toContain(href);
    }
    await expect(page.locator('.nav-links a.active')).toHaveAttribute(
      'href', 'case-study.html');
  });

  test('no console errors while loading', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(String(err)));
    await page.goto(`${BASE_URL}/case-study.html`);
    await page.waitForLoadState('networkidle');
    expect(errors, 'console must be clean').toEqual([]);
  });

  test('every local link on the page resolves to a real file',
    async ({ page }) => {
      const hrefs = await page.locator('a[href]').evaluateAll(as =>
        as.map(a => a.getAttribute('href'))
          .filter(h => h && !/^(https?:|mailto:|#|data:)/.test(h)));
      const broken = [];
      for (const href of hrefs) {
        const file = href.split('#')[0];
        if (!file) continue;
        const abs = path.resolve(__dirname, '../public', file);
        if (!fs.existsSync(abs)) broken.push(href);
      }
      expect(broken, 'broken local links').toEqual([]);
    });

  test('is usable at a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${BASE_URL}/case-study.html`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'no horizontal overflow at 375px').toBeLessThanOrEqual(1);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('theme toggle works and persists', async ({ page }) => {
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('404 page', () => {
  test('offers working links back into the site', async ({ page }) => {
    await page.goto(`${BASE_URL}/404.html`);
    await expect(page.locator('h1')).toContainText('does not exist');

    const hrefs = await page.locator('a[href]').evaluateAll(as =>
      as.map(a => a.getAttribute('href'))
        .filter(h => h && !/^(https?:|mailto:|#|data:)/.test(h)));
    const broken = [];
    for (const href of hrefs) {
      const file = href.split('#')[0];
      if (!file) continue;
      if (!fs.existsSync(path.resolve(__dirname, '../public', file))) {
        broken.push(href);
      }
    }
    expect(broken).toEqual([]);
    expect(hrefs).toContain('case-study.html');
  });

  test('no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(String(err)));
    await page.goto(`${BASE_URL}/404.html`);
    expect(errors).toEqual([]);
  });
});
