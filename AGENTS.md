# AGENTS.md — UNIMARapp

Monorepo no-oficial con dos paquetes independientes:

- **Backend BFF** (raíz): Express + TypeScript + PostgreSQL/Supabase. Node ≥ 20.
- **Mobile** (`mobile/`): React Native + Expo SDK 57 + TypeScript. Su propio `package.json` — **instalar y correr comandos dentro de `mobile/`**.

Tesis de Ingeniería de Sistemas. Backend completado; mobile completo (5 pasos).

## Comandos

### Backend (raíz)
```bash
npm run dev          # BFF en http://localhost:3000 (requiere Supabase arriba)
npm run dev:all      # Un comando: supabase start + BFF + Metro (dev build Android) con prefijos [supa,bff,metro]
npm test             # Unit tests (sin DB)
npm run test:db      # Integration RLS (requiere Supabase, RUN_DB_TESTS=1 interno)
npm run typecheck
npm run lint
```

### Mobile (`mobile/`)
```bash
npm start            # Metro bundler (QR para Expo Go)
npm test             # Jest con preset jest-expo (NO vitest)
npm run typecheck
npm run lint
```

**Orden de validación**: `typecheck` → `lint` → `test` → bundle si mobile.

## Testing

### Prerrequisitos backend
```bash
npx supabase start          # Docker corriendo
npx supabase migration up
npm run test:db             # integration RLS; se salta si Supabase no está arriba
```
- `npm test` (unit) no toca DB: los 5 archivos `rls.integration.test.ts` van con `describe.skipIf(!RUN_DB_TESTS)`.
- **Gotcha**: tras `npx supabase db reset` se pierde el GRANT manual `GRANT USAGE ON SCHEMA auth TO app_bff`; re-aplicarlo como `supabase_admin` antes de `test:db` (documentado en `docs/e2e-notificaciones.md`).
- Conectar a la DB con el rol **`app_bff`** (puerto 54322), nunca `postgres`: sin bypass de RLS, o los tests de RLS no prueban nada real.

### Single test
- Backend: `npx vitest run src/modules/notificaciones/application/notificaciones.test.ts`
- Mobile: `cd mobile && npx jest src/features/calendario/calendario-calculo.test.ts`

## Wire format (lo más fácil de romper)

- Request bodies: **snake_case** (lo dictan los schemas Zod del BFF).
- Responses: **camelCase** — la capa HTTP serializa las entidades de dominio directamente (`res.json({ data: dominio })`), sin transformar. La doc (`onboarding-frontend.md`) dice snake_case para el wire completo: **no confiar, el wire real es mixto**.
- DTOs del mobile espejan el wire exacto (ver `mobile/src/features/*/types.ts`), sin normalizar ni transformers de runtime.
- **Zod v4** (no v3): `z.coerce.boolean()` trae `Boolean('false') === true` — para query params booleanos usar `z.enum(['true','false']).default('false').transform(v => v === 'true')` (patrón en `notificaciones/http/schemas.ts`).
- Fechas circulan como string ISO en DTOs; `Date` solo al formatear en UI.

## Arquitectura

### Backend: DSBC + Clean Architecture
- `src/modules/{modulo}/{domain,application,infrastructure,http}/` — 5 módulos: identidad, comunicaciones, notificaciones, calendario, academico.
- Shared kernel en `src/shared/` (unitOfWork con `set_config('request.jwt.claims')`, RBAC, errores, bus de eventos).
- **Fronteras**: los módulos NUNCA se importan entre sí; solo vía el `index.ts` público de cada módulo y el bus de eventos. Comunicación inter-módulos por puertos/eventos.
- **Regla de disciplina**: ningún repo consulta fuera de transacción del UnitOfWork (`uow.runAs(claims)` inyecta claims; `uow.run` es modo sistema sin claims).
- **Seguridad**: RBAC en BFF (`authorize()` con jerarquía ESTUDIANTE<COMUNICADOR<ADMIN) + ABAC con RLS en PostgreSQL. Segunda barrera: RLS.
- Migraciones SQL versionadas en `supabase/migrations/` (`YYYYMMDDHHMMSS_nombre.sql`), seeds en `supabase/seed.sql`.

### Mobile: features + shared
- `mobile/src/features/{modulo}/{api,hooks,components,store}/` — espeja los módulos del backend.
- `mobile/src/shared/` — axios con interceptores, UI primitives (theme de STYLE.md), lib (jwt, paginar, etiquetas), notifications (push + deep-link).
- **Frontera**: features nunca se importan entre sí; lo común va a `mobile/src/shared/`.
- Pantallas en `mobile/app/` (Expo Router file-based): `app/(app)/(tabs)/` para las 5 tabs, `mobile/app/{modulo}/[id].tsx` para deep-links de push.
- Path alias: `@/*` → `./src/*` (tsconfig + jest moduleNameMapper ambos, order importa en jest).
- Validación de UI en cliente: espejo de los schemas Zod del BFF (fallar antes de llegar al 400).

## Quirks de herramientas

- Zod **v4** en backend (coerción de boolean rota, ver arriba).
- Mobile `noUncheckedIndexedAccess: true` — destructuring de `.split()` da `number | undefined`, parsear con `parts[n] ?? fallback`.
- Módulo móvil en web: `expo-secure-store` build web es objeto vacío y `expo-notifications` lanza `UnavailabilityError` — guards `Platform.OS === 'web'` ya existentes en `shared/notifications/` y `sesion.store.ts`; web vive sin persistencia ni push a propósito (segunda clase).
- `expo-file-system/legacy` para `uploadAsync` (SDK 57 lo movió ahí).
- `.env` nunca se commitea (mirar `.env.example`).

## Gotchas operacionales

- Supabase local exige **Docker**; puerto Postgres 54322.
- `mobile/app.json > extra.apiBaseUrl` debe apuntar a la IP del host (no localhost) para dispositivo físico; **no commitear** ese cambio (usado solo para pruebas — revertear con `git checkout mobile/app.json`).
- Dev en **WSL2**: IP de WSL cambia por reinicio; iOS físico requiere portproxy netsh (3000 y 8081) + firewall + URL manual `exp://<IP-WINDOWS>:8081` en Expo Go (detallado en `docs/guia-expo-go.md`).
- Mock data activo con `UNIMAR_API_URL=` vacío (`.env`); `PUSH_PROVIDER=mock` loguea push en consola del BFF. `PUSH_PROVIDER=expo` envía push real (requiere dev build EAS; Expo Go no recibe push remoto).

## Referencias

- `ARCHITECTURE.md` — decisiones backend (DSBC, RLS, modelo pruebas); es la fuente de verdad de diseño.
- `STYLE.md` — guía de diseño UI (colores, espaciado 4px, tipografía); materializada en `mobile/src/shared/ui/theme.ts`.
- `docs/onboarding-frontend.md` — contrato API completo + usuarios mock (todos password `unimar123`).
- `docs/e2e-notificaciones.md` — verificación E2E de notificaciones.
- `docs/guia-expo-go.md` — runbook de pruebas en dispositivo físico (WSL2, portproxy, idempotencia por paso).
