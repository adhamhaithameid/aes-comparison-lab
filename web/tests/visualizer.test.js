/**
 * visualizer.test.js — Playwright tests for AES Visualizer
 *
 * Tests that the visualizer correctly implements AES-128
 * using the FIPS 197 Appendix B test vector.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'file://' + path.resolve(__dirname, '../public');

test.describe('AES Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/visualizer.html`);
  });

  test('should load the visualizer page', async ({ page }) => {
    await expect(page).toHaveTitle(/Round Visualizer/);
    await expect(page.locator('h1')).toContainText('AES-128 Round Visualizer');
  });

  test('should have correct FIPS 197 inputs pre-filled', async ({ page }) => {
    const plaintext = await page.locator('#plaintextInput').inputValue();
    const key = await page.locator('#keyInput').inputValue();
    expect(plaintext).toBe('00112233445566778899aabbccddeeff');
    expect(key).toBe('000102030405060708090a0b0c0d0e0f');
  });

  test('should encrypt and show correct ciphertext', async ({ page }) => {
    await page.locator('#encryptBtn').click();

    // Wait for encryption to complete
    await page.waitForSelector('#ciphertextSection:not([style*="display: none"])');

    const ciphertext = await page.locator('#ciphertextOutput').textContent();
    // Remove spaces from hex dump
    const cleanHex = ciphertext.replace(/\s/g, '').trim();
    expect(cleanHex).toBe('69c4e0d86a7b0430d8cdb78070b4c55a');
  });

  test('should show all 11 round keys', async ({ page }) => {
    await page.locator('#encryptBtn').click();
    await page.waitForSelector('#allKeysSection:not([style*="display: none"])');

    const roundKeys = await page.locator('#allKeysContainer .round-key-item');
    // 11 round keys (0-10)
    // We check the container exists and has content
    const container = await page.locator('#allKeysContainer').textContent();
    expect(container).toContain('Round Key 0');
    expect(container).toContain('Round Key 10');
  });

  test('should navigate through rounds', async ({ page }) => {
    await page.locator('#encryptBtn').click();
    await page.waitForSelector('#vizSection:not([style*="display: none"])');

    // Click next a few times
    await page.locator('#nextBtn').click();
    await page.locator('#nextBtn').click();

    const roundBadge = await page.locator('#roundBadge').textContent();
    expect(roundBadge).toContain('Round');
  });

  test('should display state matrix correctly', async ({ page }) => {
    await page.locator('#encryptBtn').click();
    await page.waitForSelector('#vizSection:not([style*="display: none"])');

    const matrix = await page.locator('#stateMatrix').textContent();
    // Should have 16 bytes displayed
    const cells = await page.locator('#stateMatrix .cell').count();
    expect(cells).toBe(16);
  });

  test('should show educational warning', async ({ page }) => {
    const warning = await page.locator('.alert-warning').first().textContent();
    expect(warning).toContain('Educational JavaScript implementation');
    expect(warning).toContain('NOT for production use');
  });

  test('should load FIPS vector when button clicked', async ({ page }) => {
    // Clear inputs
    await page.locator('#plaintextInput').fill('');
    await page.locator('#keyInput').fill('');

    await page.locator('#loadVectorBtn').click();

    const plaintext = await page.locator('#plaintextInput').inputValue();
    const key = await page.locator('#keyInput').inputValue();
    expect(plaintext).toBe('00112233445566778899aabbccddeeff');
    expect(key).toBe('000102030405060708090a0b0c0d0e0f');
  });
});
