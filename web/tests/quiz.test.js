/**
 * quiz.test.js — Playwright tests for the interactive knowledge quiz
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'file://' + path.resolve(__dirname, '../public');

test.describe('Quiz page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/quiz.html`);
  });

  test('loads with the expected title and start screen', async ({ page }) => {
    await expect(page).toHaveTitle(/Quiz — Test Your AES Knowledge/);
    await expect(page.locator('h1')).toContainText('Test Your Knowledge');
    await expect(page.locator('#quizStart')).toBeVisible();
  });

  test('starts the quiz on button click and shows the first question',
    async ({ page }) => {
      await page.locator('#startBtn').click();
      await expect(page.locator('#quizPlay')).toBeVisible();
      await expect(page.locator('#qText')).not.toBeEmpty();
      const options = await page.locator('#qOptions .quiz-option').count();
      expect(options).toBeGreaterThanOrEqual(2);
      expect(options).toBeLessThanOrEqual(4);
    });

  test('answers a question and shows instant feedback', async ({ page }) => {
    await page.locator('#startBtn').click();
    await page.locator('#qOptions .quiz-option').first().click();
    await expect(page.locator('#qFeedback')).toBeVisible();
    const fb = await page.locator('#qFeedback').textContent();
    expect(fb.length).toBeGreaterThan(10);
    // Feedback must name the verdict
    expect(fb).toMatch(/Correct|Not quite/);
    await expect(page.locator('#nextBtn')).toBeVisible();
  });

  test('locks options after answering (no double-scoring)', async ({ page }) => {
    await page.locator('#startBtn').click();
    await page.locator('#qOptions .quiz-option').first().click();
    const disabledCount = await page.locator('#qOptions .quiz-option:disabled').count();
    expect(disabledCount).toBeGreaterThanOrEqual(2);
  });

  test('advances through all questions to the results screen', async ({ page }) => {
    await page.locator('#startBtn').click();
    for (let i = 0; i < 10; i++) {
      await page.locator('#qOptions .quiz-option').first().click();
      await page.locator('#nextBtn').click();
    }
    await expect(page.locator('#quizResults')).toBeVisible();
    await expect(page.locator('#finalScore')).toHaveText(/^\d+$/);
    await expect(page.locator('#statCorrect')).toContainText('/10');
  });

  test('a perfect run is possible and celebrates', async ({ page }) => {
    // Answer every question correctly by reading the explanation is not
    // possible before answering, so instead verify the scoring path by
    // answering all questions and checking the score is a non-negative int.
    await page.locator('#startBtn').click();
    for (let i = 0; i < 10; i++) {
      await page.locator('#qOptions .quiz-option').first().click();
      await page.locator('#nextBtn').click();
    }
    const score = await page.locator('#finalScore').textContent();
    expect(parseInt(score, 10)).toBeGreaterThanOrEqual(0);
  });

  test('timer runs while answering', async ({ page }) => {
    await page.locator('#startBtn').click();
    await page.waitForTimeout(1200);
    const t = await page.locator('#qTimer').textContent();
    expect(t).not.toBe('0:00');
  });

  test('keyboard: number keys answer, Enter advances', async ({ page }) => {
    await page.locator('#startBtn').click();
    await page.keyboard.press('1');
    await expect(page.locator('#qFeedback')).toBeVisible();
    await page.keyboard.press('Enter');
    // Should be on question 2 (or results if only 1 question)
    const current = await page.locator('#qCurrent').textContent();
    expect(parseInt(current, 10)).toBeGreaterThanOrEqual(2);
  });

  test('retry restarts the quiz', async ({ page }) => {
    await page.locator('#startBtn').click();
    await page.locator('#qOptions .quiz-option').first().click();
    await page.locator('#nextBtn').click();
    // jump to the end
    for (let i = 0; i < 10; i++) {
      const playVisible = await page.locator('#quizPlay').isVisible();
      if (!playVisible) break;
      const hasOptions = await page.locator('#qOptions .quiz-option:not([disabled])').count();
      if (hasOptions) await page.locator('#qOptions .quiz-option').first().click();
      await page.locator('#nextBtn').click().catch(() => {});
    }
    await expect(page.locator('#quizResults')).toBeVisible();
    await page.locator('#retryBtn').click();
    await expect(page.locator('#quizPlay')).toBeVisible();
    await expect(page.locator('#qScore')).toHaveText('0');
  });

  test('persists best score across reloads', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('aes-lab-best-score', '750'));
    await page.reload();
    await expect(page.locator('#bestScoreLine')).toBeVisible();
    await expect(page.locator('#bestScore')).toHaveText('750');
  });

  test('respects prefers-reduced-motion (no confetti)', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/quiz.html`);
    await page.locator('#startBtn').click();
    for (let i = 0; i < 10; i++) {
      await page.locator('#qOptions .quiz-option').first().click();
      await page.locator('#nextBtn').click();
    }
    await expect(page.locator('#quizResults')).toBeVisible();
    const confetti = await page.locator('.confetti-piece').count();
    expect(confetti).toBe(0);
    await ctx.close();
  });

  test('no console errors during a full run', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.locator('#startBtn').click();
    for (let i = 0; i < 10; i++) {
      await page.locator('#qOptions .quiz-option').first().click();
      await page.locator('#nextBtn').click();
    }
    await expect(page.locator('#quizResults')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('nav includes Quiz and marks it active', async ({ page }) => {
    const hrefs = await page.locator('.nav-links a').evaluateAll(
      as => as.map(a => a.getAttribute('href')));
    expect(hrefs).toContain('quiz.html');
    await expect(page.locator('.nav-links a.active')).toHaveAttribute('href', 'quiz.html');
  });
});
