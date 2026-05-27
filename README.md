# Universal Brick Inventory

Aplicación de inventario para bloques de construcción y sets de LEGO y terceros, con integración a la API de Rebrickable para obtener información detallada de los sets y piezas, y gestión de inventario con SQLite. Desarrollada con Astro y empaquetada como aplicación de escritorio con Tauri.

## Qué hace la aplicación

- Dashboard con métricas globales (piezas totales, sets activos, piezas faltantes y prioridades).
- Catálogo de sets con filtros por marca y porcentaje de completitud por set.
- Alta de sets desde Rebrickable por número de set.
- Alta manual de sets (LEGO y terceros).
- Inventario de piezas con filtros y edición de stock por set.
- Lista de compras con planificación separada por Tienda LEGO y BrickLink.
- Gestión de piezas por set (agregar, editar y eliminar piezas).
- Edición de datos de set y edición de pieza individual.
- Gestión de piezas sobrantes (spare parts) con asignación a sets.
- Gestión de colores con alta, edición y eliminación.

## Stack

- Astro `6.1.8`
- `@astrojs/node` `10.0.6` (adapter `standalone`)
- `@astrojs/preact` `5.1.2`
- Preact `10.29.1` + `@nanostores/preact` `1.1.0`
- nanostores `1.3.0`
- TypeScript estricto (`astro/tsconfigs/strict`)
- Tailwind CSS v3 + PostCSS + Autoprefixer
- `@tailwindcss/forms`, `@tailwindcss/container-queries`
- `@midudev/tailwind-animations`
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
  - `host: true`, `port: 4322`, `strictPort: true`, `checkOrigin: false`
  - Aliases Vite: `@/`, `@lib/`, `@components/`, `@hooks/`, `@utils/`, `@stores/`, `@types/`, `@styles/`, `@data/`, `@pages/`, `@layouts/`, `@mocks/`
- `tsconfig.json`
  - extiende `astro/tsconfigs/strict`

## Variables de entorno

- `REBRICKABLE_API_KEY`: API key de Rebrickable v3.
- `APP_DATA_DIR`: (opcional) directorio personalizado para datos SQLite.

## Persistencia de datos

La persistencia principal está en SQLite:

- DB: `data/inventory.sqlite`
- Tablas: `sets`, `bricks`, `set_bricks`, `colors`

Migración inicial desde `data/inventory.json` cuando la base está vacía.

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
- `src/pages/index.astro` — Dashboard
- `src/pages/sets/index.astro` — Catálogo de sets
- `src/pages/sets/[setID].astro` — Detalle de set
- `src/pages/add-set.astro` — Alta de sets
- `src/pages/bricks.astro` — Inventario de piezas
- `src/pages/shopping.astro` — Lista de compras
- `src/pages/edit-piece.astro` — Edición de pieza individual
- `src/pages/colors.astro` — Gestión de colores
- `src/pages/spare-parts.astro` — Gestión de piezas sobrantes
- `src/pages/test.astro` — Página de pruebas
- `src/pages/api/bricks/index.ts`
- `src/pages/api/bricks/[brickID]/index.ts`
- `src/pages/api/bricks/catalog/index.ts`
- `src/pages/api/bricks/external/[brickID].ts`
- `src/pages/api/bricks/set/[setID].ts`
- `src/pages/api/bricks/spare/index.ts`
- `src/pages/api/bricks/spare/[elementId].ts`
- `src/pages/api/bricks/spare/assign.ts`
- `src/pages/api/colors/index.ts`
- `src/pages/api/sets/index.ts`
- `src/pages/api/sets/[setID].ts`
- `src/pages/api/sets/rebrickable-preview.ts`
- `src/lib/inventoryStore.ts`
- `src/lib/rebrickable.ts`
- `src/lib/setMapper.ts`
- `src/types/archiveData.ts`
- `src/types/rebrickable.ts`
- `src/stores/` (6 stores: counter, feedback, storage-bricks, storage-sets, storage-newPieceForm, storage-spare-bricks)
- `src/components/` (22 componentes: filtros, tarjetas, formularios, color manager, spare parts manager, etc.)
- `src/hooks/useBricks.tsx`
- `src/hooks/useSetStore.tsx`
- `src/utils/bricksData.ts`
- `src/styles/tailwind.css`
- `src/styles/select.css`
- `src/mocks/bricks.json`
- `src-tauri/`

## Store API (`src/lib/inventoryStore.ts`)

- `getInventorySets`
- `getInventoryBricks`
- `getInventoryBricksSet`
- `getBricksCatalog`
- `getColors`
- `addSetToInventory`
- `updateBrickStock`
- `updateBrickPurchasePlan`
- `updateSetInInventory`
- `deleteSetFromInventory`
- `addBrickToSet`
- `updateBrickInSet`
- `removeBrickFromSet`
- `getSpareBricks`
- `addSpareBrick`
- `updateSpareQuantity`
- `removeSpareBrick`
- `assignSpareToSet`
- `addColor`
- `updateColor`
- `deleteColor`

## Reglas de dominio implementadas

- `ownedPieces` por set se recalcula como suma de `min(stock, required)` y se limita por `totalPieces`.
- Stock y cantidades planeadas se normalizan como enteros no negativos.
- No se permiten sets duplicados por `setNumber`.
- No se permiten piezas duplicadas en un mismo set por `elementId`.
- Tabla `colors` poblada desde API de Rebrickable al iniciar la aplicación.
- Piezas sobrantes (`spareQuantity`) almacenadas independientemente de los sets.
- Asignación de sobrantes a sets existentes descontando del spare e incrementando stock del set.

## Advertencia

⚠️ **El ejecutable de Tauri presenta fallos y no funciona correctamente.** Se recomienda utilizar la aplicación en modo web (con `pnpm run dev` o `pnpm run preview`) hasta que los problemas con el empaquetado de Tauri sean resueltos.
