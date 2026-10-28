// Check that a local MFE build mounts inside the deployed host before spending a full e2e run.
//
// usage (from the e2e repo, so @playwright/test resolves):
//   cp <skill-dir>/scripts/probe-mfe.mjs ./.probe-mfe.mjs && node .probe-mfe.mjs \
//      https://sqa-e2e.sqa.raintreeinc.com [https://local.raintreeinc.com:3004/ehr-scheduler]; rm .probe-mfe.mjs
// Prints failed requests and console errors, then "MOUNTED: true|false".
// Run once without the override as a control: deployed code must print true.
import { chromium } from '@playwright/test';

const [base, override] = process.argv.slice(2);
if (!base) {
  console.error('usage: node .probe-mfe.mjs <host-base-url> [MFE_EHR_SCHEDULER_URL]');
  process.exit(2);
}
const browser = await chromium.launch({ args: ['--disable-features=LocalNetworkAccessChecks'] });
const context = await browser.newContext({
  storageState: '.auth/sqa/automation-user.json',
  ignoreHTTPSErrors: true,
  bypassCSP: true,
});
if (override) {
  await context.addInitScript((url) => sessionStorage.setItem('MFE_EHR_SCHEDULER_URL', url), override);
}
const page = await context.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
page.on('requestfailed', (r) => console.log('REQFAIL', r.url().slice(0, 150), r.failure()?.errorText));
await page.goto(`${base}/ehr-host/calendar`);
const filter = page
  .getByTestId('filter-location-dropdown')
  .or(page.getByTestId('filter-location-multi-select-container'))
  .first();
const mounted = await filter.waitFor({ timeout: 30_000 }).then(() => true, () => false);
console.log('MOUNTED:', mounted);
await browser.close();
