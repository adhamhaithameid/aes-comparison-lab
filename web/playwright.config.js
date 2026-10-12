// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * The site pulls Chart.js and Mermaid from a CDN. Running the default
 * worker count floods the CDN and produces intermittent page.goto timeouts
 * that are not site defects. Two workers keep the suite fast without
 * saturating the connection.
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  retries: 1,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'file://' + __dirname + '/public',
    trace: 'retain-on-failure',
  },
});
