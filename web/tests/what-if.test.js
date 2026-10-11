/**
 * what-if.test.js — Playwright tests for What If? Security Lab
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'file://' + path.resolve(__dirname, '../public');

test.describe('What If? Security Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/what-if.html`);
  });

  test('should load the what-if page', async ({ page }) => {
    await expect(page).toHaveTitle(/What If/);
    await expect(page.locator('h1')).toContainText('AES Security Lab');
  });

  test('should have 12 scenario tabs', async ({ page }) => {
    const tabs = await page.locator('.tab').count();
    expect(tabs).toBe(12);
  });

  test('should switch between scenarios', async ({ page }) => {
    // Click on S2 tab
    await page.locator('.tab[data-scenario="2"]').click();
    await expect(page.locator('#s2')).toHaveClass(/active/);

    // Click on S5 tab
    await page.locator('.tab[data-scenario="5"]').click();
    await expect(page.locator('#s5')).toHaveClass(/active/);
  });

  test('S1: should show GCM authentication failure on bit flip', async ({ page }) => {
    await page.locator('#s1Run').click();
    const result = await page.locator('#s1Result').textContent();
    expect(result).toContain('GCM Authentication Failed');
    expect(result).toContain('FAILED');
  });

  test('S2: should show tag verification failure', async ({ page }) => {
    await page.locator('.tab[data-scenario="2"]').click();
    await page.locator('#s2Run').click();
    const result = await page.locator('#s2Result').textContent();
    expect(result).toContain('Tag Verification Failed');
  });

  test('S3: should show wrong key failure', async ({ page }) => {
    await page.locator('.tab[data-scenario="3"]').click();
    await page.locator('#s3Run').click();
    const result = await page.locator('#s3Result').textContent();
    expect(result).toContain('Wrong Key');
  });

  test('S4: should show nonce reuse vulnerability', async ({ page }) => {
    await page.locator('.tab[data-scenario="4"]').click();
    await page.locator('#s4Run').click();
    const result = await page.locator('#s4Result').textContent();
    expect(result).toContain('Nonce Reuse');
    expect(result).toContain('BROKEN');
  });

  test('S5: should show AES comparison', async ({ page }) => {
    await page.locator('.tab[data-scenario="5"]').click();
    await page.locator('#s5Run').click();
    const result = await page.locator('#s5Result').textContent();
    expect(result).toContain('AES-128');
    expect(result).toContain('AES-256');
  });

  test('S6: should show performance scaling data', async ({ page }) => {
    await page.locator('.tab[data-scenario="6"]').click();
    await page.locator('#s6Run').click();
    const result = await page.locator('#s6Result').textContent();
    expect(result).toContain('Performance Scaling');
  });

  test('S7: should show hardware acceleration impact', async ({ page }) => {
    await page.locator('.tab[data-scenario="7"]').click();
    await page.locator('#s7Run').click();
    const result = await page.locator('#s7Result').textContent();
    expect(result).toContain('Hardware Acceleration');
  });

  test('S8: should show broken S-box detection', async ({ page }) => {
    await page.locator('.tab[data-scenario="8"]').click();
    await page.locator('#s8Run').click();
    const result = await page.locator('#s8Result').textContent();
    expect(result).toContain('Broken S-box');
  });

  test('S9: should show mid-file authentication failure', async ({ page }) => {
    await page.locator('.tab[data-scenario="9"]').click();
    await page.locator('#s9Run').click();
    const result = await page.locator('#s9Result').textContent();
    expect(result).toContain('Mid-File Corruption');
  });

  test('S10: should show ECB pattern leakage', async ({ page }) => {
    await page.locator('.tab[data-scenario="10"]').click();
    await page.locator('#s10Run').click();
    const result = await page.locator('#s10Result').textContent();
    expect(result).toContain('ECB Pattern Leakage');
  });

  test('S11: should show measurement variance', async ({ page }) => {
    await page.locator('.tab[data-scenario="11"]').click();
    await page.locator('#s11Run').click();
    const result = await page.locator('#s11Result').textContent();
    expect(result).toContain('Measurement Variance');
  });

  test('S12: should show implementation recommendation', async ({ page }) => {
    await page.locator('.tab[data-scenario="12"]').click();
    await page.locator('#s12Run').click();
    const result = await page.locator('#s12Result').textContent();
    expect(result).toContain('Implementation Recommendation');
  });

  test('should show educational warning on all scenarios', async ({ page }) => {
    const warning = await page.locator('.alert-warning').first().textContent();
    expect(warning).toContain('Educational JavaScript implementation');
    expect(warning).toContain('NOT for production use');
  });
});
