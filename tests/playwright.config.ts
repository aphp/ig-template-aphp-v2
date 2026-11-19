import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Les IG sont construits au préalable avec tests/scripts/build-ig.sh.
// Par défaut on suppose l'arborescence du workspace "fig" ; surcharger via
// IG_DM_OUTPUT / IG_TLS_OUTPUT si les IG sont ailleurs.
const repoRoot = path.resolve(__dirname, '..');
const IG_DM_OUTPUT = process.env.IG_DM_OUTPUT ?? path.resolve(repoRoot, '../../aphp/IG-fhir-dm/output');
const IG_TLS_OUTPUT = process.env.IG_TLS_OUTPUT ?? path.resolve(repoRoot, '../../msd/fig-tls/output');

export const DM_URL = 'http://127.0.0.1:8081';
export const TLS_URL = 'http://127.0.0.1:8082';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure' },
  webServer: [
    { command: `npx http-server "${IG_DM_OUTPUT}" -p 8081 -s -c-1`, url: DM_URL, reuseExistingServer: true },
    { command: `npx http-server "${IG_TLS_OUTPUT}" -p 8082 -s -c-1`, url: TLS_URL, reuseExistingServer: true },
  ],
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
