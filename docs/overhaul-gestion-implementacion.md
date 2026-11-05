# Overhaul del Módulo de Gestión — Implementación (2026-11-04)

Implementa `docs/overhaul-gestion.md` (prompt maestro) adaptado al monorepo real: los
supuestos "mock + simulador de roles" del doc se resolvieron a **API real del BFF**, y
los requisitos que el backend no soportaba se materializaron como **extensiones
puntuales**. Decisiones acordadas:

| Tema | Decisión |
|---|---|
| Fuente de datos | BFF real (react-query + RLS). Sin mocks ni simulador: se prueba con `ana.admin` / `flavio.rosales` (password `unimar123`) |
| Backend | Extensiones puntuales; los eventos NO tienen máquina de estados (publican al instante) |
| Estados | Wire real `BORRADOR/PENDIENTE/PUBLICADO/ARCHIVADO`; "Devuelto" es derivado (`BORRADOR` + `motivoRechazo`); `PENDIENTE` se muestra como "En revisión" |
| Desktop | Rutas con layout modal (URLs/deep-links intactos) en lugar de Modal/Drawer real |

## 1. Backend (extensiones)

Sin migraciones nuevas (todo reutiliza tablas y RLS existentes):

- **`desarchivarComunicado`** (`application/desarchivarComunicado.ts`): `ARCHIVADO →
  BORRADOR`, autor o ADMIN, limpia `aprobadoPor`/`publicadoAt`. Ruta
  `POST /comunicados/:id/desarchivar` (rol jerárquico `COMUNICADOR`).
- **`lecturasCount` en el listado y detalle**: subquery escalar de
  `comunicado_lecturas` en el `BASE_SELECT` de `postgresComunicadoRepository.ts`
  + campo opcional en el dominio. Quirk conservado: la RLS de lecturas deja 0 al
  comunicador no-autor (igual que `GET /:id/estadisticas`).
- **Filtro `decanato_id`** en `GET /comunicados` (query Zod + `WHERE` con EXISTS sobre
  `comunicado_audiencias`; los GLOBAL también "alcanzan" al decanato elegido).
- **`GET /comunicados/conteos`** ampliado: devuelve `{ BORRADOR, PENDIENTE, PUBLICADO,
  ARCHIVADO, lecturasTotales }` (KPI "Alcance acumulado"). Para el ADMIN la suma es
  total; para comunicador queda recortada por la misma RLS.
- **`GET /eventos`** ampliado con `tipo` (enum) y `q` (ILIKE sobre título **o** lugar)
  — paía los filtros del Camino B sin recortar el `total` en cliente.
- **Seed** (`supabase/seed.sql`): comunicados en BORRADOR (uno con `motivo_rechazo`
  = "devuelto"), uno PENDIENTE y `Semana de la Salud Mental` ARCHIVADO, con
  audiencias de Flavio (decanato 5). El seed no actualiza la DB en caliente: vale
  tras un `db reset`.

## 2. Mobile

- **Primitivos nuevos** (`mobile/src/shared/ui/`): `useBreakpoint` (3 niveles: movil
  `<768`, tablet `768–1023`, escritorio `>=1024`), `BadgeEstado` (paleta
  `PALETA_ESTADO_PUBLICACION` del theme), `TablaDatos`/`Celda` (data table web con
  hover), `MenuAcciones` (dropdown desktop) + `HojaMenuAcciones` (hoja táctil única
  por sección en móvil). `useEsDesktop` (≥768) sigue disponible para el resto de la app.
- **Consola** (`mobile/app/(app)/gestion/`): el shell sigue siendo UNA pantalla con
  tres secciones — `ResumenSeccion` (KPIs 2×2/4-fila, acciones rápidas, próximo
  evento, Top 4 + "Ver todos →"), `ComunicadosSeccion` (Camino A: chips
  Todos/Borradores/En revisión/Publicados/Devueltos/Archivados + decanato para
  ADMIN + lecturas 👁 por fila + menú de acciones por rol×estado) y
  `EventosSeccion` (Camino B: búsqueda server-side, chips de categoría oficial
  INSTITUCIONAL/CAMPUS/DECANATO/FERIADO con la paleta del calendario, acciones
  ver/editar/eliminar). Deep-links preservados: `?seccion=colas&estado=` sigue
  resolviendo (`colas` = alias de `comunicados`).
- **Transiciones optimistas**: las secciones reusan `useTransicionComunicado` (quita
  la fila al instante, rollback exacto si el BFF rechaza) para VER/EDITAR/ENVIAR/
  APROBAR/RECHAZAR/PUBLICAR/ARCHIVAR/DESARCHIVAR. En móvil, el menú `⋮` abre UNA
  `HojaMenuAcciones` por sección (no una TrueSheet por fila).
- **Detalles**: `DESARCHIVAR` también en `/comunicados/[id]`; Eventos sigue
  excluyendo PERSONAL en cliente (chip "Todas" y default del form de consola).

## 3. Qué NO se hizo (y por qué)

- **Máquina de estados de eventos**: el doc la exige, pero requería migración de
  `eventos` + casos de uso + RLS + notificaciones nuevas; el ciclo real de eventos
  (OFICIAL/INSTITUCIONAL/FERIADO visibles al crearse) ya existía en toda la app.
  El Camino B quedó adaptado: crear (inmediato) / editar / eliminar.
- **Estado `RECHAZADO` real**: se conserva el semáforo del BFF y se presenta "Devuelto"
  como derivación de `motivoRechazo` (función pura `esDevuelto`).
- **`FERIADO` en `#DC2626` (doc)`: se mantiene la terracota `#C2410C` de
  `PALETA_CALENDARIO_UNIMAR`, que ya pinta toda la app (consistencia STYLE.md).

## 4. Validación

- Raíz: `typecheck` ✓ `lint` ✓ `test` (239) ✓ `test:db` (336, RLS integration) ✓
- Mobile: `typecheck` ✓ `lint` ✓ `test` — falla pre-existente en
  `EditorCuerpoEnriquecido.test.tsx` (6 tests, también falla sin este cambio) ✓ resto
- Bundles: `expo export` web (unimarapp/pages ready) y Android ✓

## 5. Gotchas que sobreviven

- El orden de rutas en `comunicadosRoutes.ts` (los endpoints fijos van ANTES de `/:id`).
- Requests snake_case / responses camelCase; el wire nuevo suma `decanato_id` (query),
  `lecturasCount` (response) y `lecturasTotales` en `/conteos`.
- Tras `npx supabase db reset`: re-aplicar el GRANT del schema `auth` a `app_bff`
  (docs/e2e-notificaciones.md) y esperar que las sesiones viejas se reciclen (401 → logout).
- Con `DB reset` el seed crea el comunicado devuelto con estado BORRADOR+motivo: útil
  para demo del Camino A con Flavio.

## 6. Pasada post-auditoría de diseño (2026-11-05)

Auditoría `impeccable critique` (28/40, `detect` limpio; snapshot en
`.impeccable/critique/`). La primera pasada del auditor (headers, insets, recortes)
ya estaba aplicada; esta pasada de cierre añadió:

1. **Anomalía KPI del Resumen (hallazgo P1 en device)**: causa raíz identificada en
   código — la retícula del grid (`flex:1, minWidth:'45%'`) vivía en la ThemedView
   interna mientras el hijo del contenedor `flexWrap` era el `PressableScale` sin
   tamaño: el porcentaje se resolvía contra un ancestro de ancho circular (Yoga lo
   resolvía distinto que web → cards rotas). Fix: retícula movida al wrapper
   (`kpiCelda`/`kpiCeldaDesktop` en ResumenSeccion).
2. **Ruta huérfana eliminada**: `/academico/historial` (historial médico) no tenía
   entry point en toda la app — se retiró la pantalla, su hook, su sección y la
   función de API; el endpoint del BFF sigue existiendo (contrato intacto).
3. **Contraste y recortes**: badge de la campana de notificaciones 10px → 12px
   (pill 19px, hallazgo ~2.1:1); `NoticiaCard` 2:1 → 3:2 (único recorte de portada
   del sistema); `Centrado`/`Centrada` locales de 4 pantallas dedup a
   `EstadoCentrado` de `shared/ui` (ahora con `a11yLabel`).
4. **Migración de alias legacy de theme**: ~190 usages — `colors.primary` →
   `brand.primary`, `grayDark` → `text.primary`, `background.base/elevated/sunken` →
   `bg.surface/brand.surfaceBlue/bg.sunken` (token nuevo), `text.tertiary` →
   `text.secondary`, y los alias numéricos de `spacing` (one/two/three/four/six/
   eight → xs–xxl; `half/five/twelve` → literales 2/20/64 por no existir token).
   Tipografía no tocada (los alias `bodyLg`/`lineHeight` siguen vigentes).
5. **Copy sin jerga interna**: "en esta cola" → "N comunicados"; "Bandeja" →
   "Notificaciones" (accessibility label + strings de carga/error).
   `impeccable` configurado en modo **code-first** (`.impeccable/config.json`).
6. **Backlog pendiente** (fuera de alcance): Dark Mode, búsqueda en listados
   estudiantiles, acciones en lote en las colas.

Validación de la pasada: root `typecheck`/`lint`/`test` ✓ (239), mobile
`typecheck`/`lint`/`test` ✓ (284; 6 fallas pre-existentes en HEAD del editor),
export web ✓.
