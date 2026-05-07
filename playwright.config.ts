import { defineConfig, devices } from '@playwright/test';

/**
 * Config de Playwright para tests E2E del flujo Lawstream.
 *
 * Variables de entorno requeridas:
 *   • PLAYWRIGHT_BASE_URL — URL del deploy de Vercel (ej. https://lawstream.vercel.app).
 *   • PLAYWRIGHT_USER_EMAIL — default: playwright@lawstream.test
 *   • PLAYWRIGHT_USER_PASSWORD — default: Playwright2026!
 *
 * Tests corren contra el firm aislado "Playwright Testing" — los datos
 * que crean nunca se mezclan con el firm real del estudio (RLS multi-tenant).
 *
 * Modo headed por default — vos ves el browser correr en vivo.
 * Para CI / runs invisibles: `npx playwright test --reporter=list`
 * y settear HEADLESS=1.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://CHANGE-ME.vercel.app';
const headless = process.env.HEADLESS === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,        // tests del flujo son secuenciales por matter
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                  // un solo worker para evitar pisar datos del mismo firm de testing
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,             // 60s por test — la UI sobre Vercel puede tardar
  expect: { timeout: 10_000 }, // 10s para esperas de selectors

  use: {
    baseURL,
    headless,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
