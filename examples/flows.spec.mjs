// Example: use the catalog's end-to-end flows as visual tests for your own app.
// Each flow step names an OLX page; map it to the URL of the same page in your
// app and Playwright compares your page with the captured one, step by step.
//
//   npm i -D @playwright/test
//   APP_URL=http://localhost:3000 npx playwright test examples/flows.spec.mjs
//
// First run: `--update-snapshots` with BASELINE=1 stores the captured OLX pages
// as the baselines (rendered from their HTML in this repo). Later runs, without
// BASELINE, render your app and fail where it drifts from them.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../catalog/index.json', import.meta.url), 'utf8'));
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const BASELINE = Boolean(process.env.BASELINE);
const FLOWS = (process.env.FLOWS ?? 'kit-motors-finance-and-insurance').split(',');

// Where each OLX page lives in your app. Fill this in as you build pages; steps
// without a route are skipped.
const ROUTES = {
  'kit-motors-home': '/motors',
  'kit-motors-car-finance': '/motors/car-finance',
};

for (const flow of catalog.flows.filter((f) => FLOWS.includes(f.id))) {
  for (const device of ['desktop', 'mobile']) {
    test(`${flow.title} (${device})`, async ({ page }) => {
      await page.setViewportSize(device === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 });
      for (const step of flow.steps) {
        const captured = step[device];
        const route = ROUTES[step.page];
        if (!captured || (!BASELINE && !route)) continue;
        await page.goto(BASELINE ? new URL(`../${captured}`, import.meta.url).href : APP_URL + route);
        await expect(page).toHaveScreenshot(`${flow.id}-${step.step}-${device}.png`, { fullPage: true, maxDiffPixelRatio: 0.02 });
      }
    });
  }
}
