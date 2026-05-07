// Smoke test mínimo — valida que:
//   1. Playwright puede llegar a la URL del deploy.
//   2. El user de testing puede loguearse.
//   3. La app autenticada carga sin errores fatales.
//
// Si este test pasa, el setup de Playwright + firm aislado + credenciales
// está OK y podemos escribir el test del flujo completo.

import { test, expect } from './fixtures';

test('smoke — login y carga de home autenticada', async ({ authedPage: page }) => {
  // Tras loguearse el helper ya cargó la home. Verificamos que NO estamos
  // en la URL de login.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  // Tomamos screenshot para inspección manual.
  await page.screenshot({ path: 'test-results/smoke-home.png', fullPage: true });

  // Sanity: el body tiene contenido y NO está en estado de loading.
  const bodyText = await page.locator('body').innerText();
  console.log(`[smoke] body text length: ${bodyText.length}, preview: "${bodyText.slice(0, 200)}"`);

  expect(bodyText.length, `body text muy corto — la app sigue cargando? Texto: "${bodyText}"`).toBeGreaterThan(50);
  expect(bodyText, 'la app quedó atrapada en el loader').not.toMatch(/^Cargando\.\.\.?$/i);
  expect(bodyText, 'error fatal en la página').not.toMatch(/uncaught|error 500|application error/i);
});

test('smoke — sidebar / navegación visible', async ({ authedPage: page }) => {
  // Buscamos elementos típicos de la app autenticada — el menú o algún
  // link interno. Como el markup exacto puede variar, probamos varias
  // pistas comunes.
  const indicios = [
    page.getByRole('link', { name: /asuntos|matters/i }),
    page.getByRole('link', { name: /clientes/i }),
    page.getByRole('link', { name: /bit[áa]cora/i }),
    page.getByRole('button', { name: /nuevo|crear/i }),
  ];

  let encontrado = false;
  for (const loc of indicios) {
    if (await loc.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      encontrado = true;
      break;
    }
  }
  expect(encontrado).toBeTruthy();
});
