# Universal Brick Inventory

Aplicación de inventario para bloques de construcción y sets de LEGO y terceros, con integración a la API de Rebrickable para obtener información detallada de los sets y piezas, y gestión de inventario con SQLite. Desarrollada con Astro y empaquetada como aplicación de escritorio con Tauri.

## Qué hace la aplicación

- Dashboard con métricas globales (piezas totales, sets activos, piezas faltantes y prioridades).
- Catálogo de sets con filtros por marca y porcentaje de completitud por set.
- Alta de sets desde Rebrickable por número de set.
- Alta manual de sets (LEGO y terceros).
- Inventario de piezas con filtros y edición de stock.
- Lista de compras con planificación separada por Tienda LEGO y BrickLink.
- Gestión de piezas por set (agregar, editar y eliminar piezas).
- Edición de datos de set y edición de pieza individual.

## Últimas mejoras

- **Selección inteligente de piezas existentes**: Al agregar una pieza manualmente a un set, si se selecciona una pieza ya existente en la base de datos (mediante el buscador con datalist), se ocultan automáticamente los campos Reference, Name, Color, Color Hex e Image URL, mostrando solo los campos Required y Stock. Se muestra una vista previa con los datos de la pieza seleccionada.
- **Actualización inmediata del listado de piezas**: Al agregar una pieza a un set, el listado de piezas se actualiza inmediatamente sin necesidad de refrescar la página, permitiendo al usuario ver la nueva pieza agregada en tiempo real.

## Advertencia

⚠️ **El ejecutable de Tauri presenta fallos y no funciona correctamente.** Se recomienda utilizar la aplicación en modo web (con `pnpm run dev` o `pnpm run preview`) hasta que los problemas con el empaquetado de Tauri sean resueltos.

## Stack

- Astro `6.1.8`
- `@astrojs/node` `10.0.6` (adapter `standalone`)
- `@astrojs/preact` `5.1.2`
- Preact `10.29.1` + `@nanostores/preact` `1.1.0`
- nanostores `1.3.0`
- TypeScript estricto (`astro/tsconfigs/strict`)
- Tailwind CSS v3 + PostCSS + Autoprefixer
- `@tailwindcss/forms` y `@tailwindcss/container-queries`
- SQLite nativo con `node:sqlite` (`DatabaseSync`)
- Tauri v2 (`@tauri-apps/cli 2.9.1`)

## Requisitos

- Node.js `>=22.12.0`
- pnpm `10.18.3` (definido en `packageManager`)

## Scripts

Desde `Universal-brick-inventory/`:

- `pnpm run dev` inicia el servidor Astro en desarrollo.
- `pnpm run build` genera el build de producción.
- `pnpm run preview` sirve el build generado.
- `pnpm run astro` ejecuta el CLI de Astro.
- `pnpm run tauri:dev` inicia la app en modo Tauri dev.
- `pnpm run tauri:build` empaqueta la app con Tauri.

## Configuración relevante

- `astro.config.mjs`
  - `output: "server"`
  - adapter Node `standalone`
  - `host: true`, `strictPort: true`, `checkOrigin: false`
- `tsconfig.json`
  - extiende `astro/tsconfigs/strict`

## Variables de entorno

- `REBRICKABLE_API_KEY`: API key de Rebrickable v3.

## Persistencia de datos

La persistencia principal está en SQLite:

- DB: `data/inventory.sqlite`
- Tablas: `sets`, `bricks`, `colors`

## Integración Rebrickable

La capa `src/lib/rebrickable.ts` implementa:

- `fetchRebrickableSet`
- `fetchRebrickableSetParts` (con paginación completa por `next`)
- `fetchRebrickableSetWithParts`
- `fetchRebrickableColors`
- `fetchRebrickablePartColors`

El mapeo de datos a modelos internos se hace en `src/lib/setMapper.ts`.

## Estructura principal

- `src/layouts/AppLayout.astro`
- `src/pages/index.astro`
- `src/pages/sets/index.astro`
- `src/pages/sets/[setID].astro`
- `src/pages/add-set.astro`
- `src/pages/bricks.astro`
- `src/pages/shopping.astro`
- `src/pages/set-parts.astro`
- `src/pages/edit-set.astro`
- `src/pages/edit-piece.astro`
- `src/pages/test.astro`
- `src/pages/api/bricks.ts`
- `src/pages/api/sets.ts`
- `src/pages/api/sets/[setID].ts`
- `src/lib/inventoryStore.ts`
- `src/lib/rebrickable.ts`
- `src/lib/setMapper.ts`
- `src/types/archiveData.ts`
- `src/types/rebrickable.ts`
- `src/stores/` (counter, feedback, storage-bricks, storage-sets)
- `src/components/` (17 componentes: filtros, tarjetas, formularios, etc.)
- `src/hooks/useBricks.tsx`
- `src/styles/tailwind.css`
- `src/mocks/bricks.json`
- `src-tauri/`

## Store API (`src/lib/inventoryStore.ts`)

- `getInventorySets`
- `getInventoryBricks`
- `getColors`
- `addSetToInventory`
- `updateBrickStock`
- `updateBrickPurchasePlan`
- `updateSetInInventory`
- `deleteSetFromInventory`
- `addBrickToSet`
- `updateBrickInSet`
- `removeBrickFromSet`

## Reglas de dominio implementadas

- `ownedPieces` por set se recalcula como suma de `min(stock, required)` y se limita por `totalPieces`.
- Stock y cantidades planeadas se normalizan como enteros no negativos.
- No se permiten sets duplicados por `setNumber`.
- No se permiten piezas duplicadas en un mismo set por `elementId`.
- Tabla `colors` poblada desde API de Rebrickable al iniciar la aplicación.

## Créditos

Esta aplicación fue desarrollada utilizando **vibe coding** con asistencia de:
- **AbacusAI** - Asistente de desarrollo de código
- **opencode** - Entorno de desarrollo interactivo con IA
