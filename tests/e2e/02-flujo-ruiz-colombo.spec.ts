// Test E2E del flujo del caso Ruiz/Colombo.
//
// Este test recorre la UI desde 0 (con la app vacía para el firm de
// testing) y valida que cada feature implementada en los gaps R1...R15
// responda correctamente:
//   • Aparece el banner X cuando se carga el dato Y.
//   • Las acciones del usuario disparan los efectos esperados.
//   • La navegación responde al estado del caso.
//
// ESTRATEGIA: implementación incremental. Cada `test.step` es chequeable
// solo. Si uno falla, los siguientes se saltan pero los anteriores ya
// dejaron datos en la DB que se pueden inspeccionar manualmente.
//
// IMPORTANTE: el test corre contra el firm aislado "Playwright Testing".
// Cada run deja un matter nuevo con timestamp en el título para no
// pisar runs anteriores. Para limpiar: borrar manualmente desde la UI o
// con `DELETE FROM matters WHERE title LIKE 'PW-RUIZ%' AND firm_id = ...`

import { test, expect } from './fixtures';

// Sufijo único por run para que tests sucesivos no choquen.
const RUN_ID = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const MATTER_TITLE = `PW-RUIZ-${RUN_ID}`;
const CLIENT_NAME  = `Sebastián Ruiz Test ${RUN_ID}`;

test.describe.configure({ mode: 'serial' });

test('flujo Ruiz/Colombo — paso 1: navegar a Asuntos y abrir wizard de creación', async ({ authedPage: page }) => {
  await test.step('llegar a la pantalla de Asuntos', async () => {
    // Intentamos varias formas de llegar (sidebar link o nav directo a /asuntos).
    const linkAsuntos = page.getByRole('link', { name: /asuntos/i }).first();
    if (await linkAsuntos.isVisible({ timeout: 3000 }).catch(() => false)) {
      await linkAsuntos.click();
    } else {
      await page.goto('/asuntos');
    }
    await page.waitForLoadState('networkidle');
  });

  await test.step('click en "Nuevo Asunto" para abrir el wizard', async () => {
    // El botón aparece en el header (AppLayout/Layout) o dentro de la pantalla de Asuntos.
    const btnNuevo = page.getByRole('button', { name: /nuevo asunto/i }).first();
    await expect(btnNuevo, 'no encontré el botón "Nuevo Asunto"').toBeVisible({ timeout: 10_000 });
    await btnNuevo.click();
  });

  await test.step('verificar que aparece el wizard en el step de Identificación', async () => {
    // El header del wizard dice "Nuevo Asunto" + chip "Identificación" del stepper.
    await expect(page.getByText(/identificaci[óo]n/i).first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/flujo-01-wizard-abierto.png', fullPage: true });
  });
});

test('flujo Ruiz/Colombo — paso 2: completar Identificación (cliente nuevo + tipo divorcio CABA)', async ({ authedPage: page }) => {
  // Re-abrimos el wizard (cada test arranca limpio).
  await page.goto('/asuntos');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /nuevo asunto/i }).first().click();
  await expect(page.getByText(/identificaci[óo]n/i).first()).toBeVisible({ timeout: 10_000 });

  // El form abre con Familia + CABA + Ordinario YA seleccionados por default.
  // Solo falta: Materia (Divorcio) y crear cliente.

  await test.step('confirmar tipo Familia (defensivo, ya viene seleccionado)', async () => {
    // Click en el botón "Familia" — si ya estaba activo, queda igual.
    const btnFamilia = page.getByRole('button', { name: /Familia/ }).first();
    await expect(btnFamilia).toBeVisible();
    await btnFamilia.click();
  });

  await test.step('seleccionar Materia: Divorcio', async () => {
    // Los botones de materia (Divorcio, Alimentos, Cuidado, etc.) son <button>
    // con solo el texto. El primer match exacto es "Divorcio".
    const btnDivorcio = page.getByRole('button', { name: /^Divorcio$/ }).first();
    await expect(btnDivorcio, 'botón "Divorcio" no encontrado en Materia').toBeVisible({ timeout: 5_000 });
    await btnDivorcio.click();
    await page.screenshot({ path: 'test-results/flujo-02-materia-divorcio.png', fullPage: true });
  });

  await test.step('crear cliente nuevo via search "Crear nuevo cliente"', async () => {
    // El flujo real: tipear en el search → aparece un botón
    // "Crear nuevo cliente \"X\"" → click → cliente creado y seleccionado.
    const searchCliente = page.getByPlaceholder(/buscar cliente.*dni|buscar cliente/i).first();
    await expect(searchCliente, 'no encontré el search de cliente').toBeVisible({ timeout: 5_000 });
    await searchCliente.fill(CLIENT_NAME);

    // Esperamos un toque a que aparezca el botón de crear (la app puede
    // hacer fuzzy match contra clientes existentes primero).
    const btnCrearCliente = page.getByRole('button', { name: /crear nuevo cliente/i }).first();
    await expect(btnCrearCliente, 'no apareció el botón "Crear nuevo cliente"').toBeVisible({ timeout: 5_000 });
    await btnCrearCliente.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/flujo-03-cliente-creado.png', fullPage: true });
  });

  await test.step('avanzar al paso 2 del wizard (Datos del Caso)', async () => {
    const btnContinuar = page.getByRole('button', { name: /^Continuar$/i }).first();
    await expect(btnContinuar, 'no encontré botón Continuar').toBeVisible({ timeout: 5_000 });

    const isDisabled = await btnContinuar.isDisabled();
    if (isDisabled) {
      await page.screenshot({ path: 'test-results/flujo-04-continuar-disabled.png', fullPage: true });
      const bodyText = await page.locator('body').innerText();
      throw new Error(`Botón Continuar deshabilitado. Body preview: "${bodyText.slice(0, 500)}"`);
    }
    await btnContinuar.click();

    // El paso 2 se llama "Datos del Caso". Esperamos que aparezca el header
    // del nuevo step, lo que nos confirma que avanzamos.
    await expect(page.getByRole('heading', { name: /datos del caso|propuesta|instrucci[óo]n/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/flujo-05-step2.png', fullPage: true });
  });
});
