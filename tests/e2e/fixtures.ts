// Fixtures compartidos para tests E2E.
//
// Login una vez al inicio del worker (saveAuthState) y reutiliza la
// sesión en cada test — no perdemos 5s loguéandonos en cada uno.

import { test as base, expect, Page } from '@playwright/test';

const EMAIL    = process.env.PLAYWRIGHT_USER_EMAIL    || 'playwright@lawstream.test';
const PASSWORD = process.env.PLAYWRIGHT_USER_PASSWORD || 'Playwright2026!';

/**
 * Loguea con el user de testing y deja la app en la home autenticada
 * con el bootstrap del AppContext terminado (sin "Cargando...").
 *
 * Pasos:
 *   1. Va a la home; si aparece form de login, lo llena.
 *   2. Tras submit, espera que la URL deje /login.
 *   3. Espera que termine el bootstrap del context — la app muestra
 *      <p>Cargando...</p> mientras hace todos los fetch iniciales,
 *      así que esperamos a que ese texto desaparezca.
 *   4. networkidle como red de seguridad.
 */
export async function login(page: Page) {
  await page.goto('/');

  // Si aparece el form de login, lo llenamos. Si ya estamos autenticados
  // (cookies / localStorage), salteamos esa parte.
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    const submitBtn = page.getByRole('button', { name: /ingresar|iniciar sesión|login|entrar/i }).first();
    await submitBtn.click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }).catch(() => {});
  }

  // El AppContext muestra "Cargando..." mientras corre el bootstrap
  // (fetch de matters, clients, hijos, bienes, etc. — varias decenas de
  // queries en paralelo). Esperamos a que ese loader desaparezca.
  const loader = page.getByText(/^Cargando\.\.\.?$/i).first();
  if (await loader.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loader.waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
  }

  // Red de seguridad: que no haya requests en vuelo.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect };
