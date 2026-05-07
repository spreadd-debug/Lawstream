# Tests E2E — Lawstream

Tests Playwright que recorren el flujo del caso Ruiz/Colombo contra el deploy de Vercel.
Los datos viven en un firm aislado (`Playwright Testing`) — invisibles para el firm real.

## Setup (una sola vez)

### 1. Crear el user de testing en Supabase

Dashboard → Authentication → Users → "Add user":
- Email: `playwright@lawstream.test`
- Password: `Playwright2026!`
- Auto Confirm User: ✅

### 2. Correr el seed del firm aislado

Dashboard → SQL Editor → pegá y ejecutá `sql/seed_playwright_firm.sql`.
Crea el firm `Playwright Testing` y vincula el profile del user al firm.

### 3. Setear variables de entorno

```bash
# Windows PowerShell
$env:PLAYWRIGHT_BASE_URL = "https://TU-DEPLOY.vercel.app"

# Bash
export PLAYWRIGHT_BASE_URL="https://TU-DEPLOY.vercel.app"
```

(opcional — defaults ya configurados)
- `PLAYWRIGHT_USER_EMAIL` (default `playwright@lawstream.test`)
- `PLAYWRIGHT_USER_PASSWORD` (default `Playwright2026!`)
- `HEADLESS=1` para correr invisible

## Correr los tests

```bash
npm run e2e:headed    # ves el browser correr en vivo
npm run e2e:ui         # modo interactivo (UI mode, recomendado para debug)
npm run e2e            # default — corre todo
npm run e2e:report     # abre el reporte HTML del último run
```

## Estructura

- `fixtures.ts` — login compartido, helpers reusables.
- `01-smoke.spec.ts` — valida setup (login + home carga).
- `02-flujo-ruiz-colombo.spec.ts` — recorre el caso completo paso a paso *(pendiente)*.

## Debugging

Si un test falla:
- `test-results/<test>/trace.zip` → abrir con `npx playwright show-trace`.
- `test-results/<test>/test-failed-1.png` → screenshot del momento del fallo.
- `test-results/<test>/video.webm` → video del run completo.
