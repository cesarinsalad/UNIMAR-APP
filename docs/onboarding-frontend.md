# Onboarding — Frontend móvil de UNIMARapp

> Documento de "handoff" para un chat o persona que vaya a desarrollar el
> **cliente móvil (React Native + Expo)** sobre el backend ya terminado.
> Léelo completo antes de tocar código: resume el estado del backend, el
> contrato de API, las convenciones y los conceptos de dominio que el
> cliente debe respetar.
>
> Última actualización: 2026-08-31. Backend en estado **completado**
> (Paso 5 — Académico incluido).

---

## 1. Qué es UNIMARapp y cómo está el backend

UNIMARapp es una aplicación móvil para la **Universidad de Margarita
(UNIMAR)**: comunicación institucional (comunicados, eventos, notificaciones)
y servicios académicos (materias, notas, pénsum). Proyecto de Tesis de
Ingeniería de Sistemas.

El repositorio actual contiene el **backend (BFF)** — *Backend For Frontend*:
un servicio Express en TypeScript que es el **único punto de acceso** del
cliente móvil. La app **nunca** se conecta directamente a Supabase/PostgreSQL;
toda consulta pasa por el BFF, que aplica seguridad y traduce datos.

Arquitectura: **Clean Architecture** + **DSBC** (módulos independientes que se
comunican por el *shared kernel* y un bus de eventos). Modelo de seguridad
híbrido **RBAC** (roles en servidor) + **ABAC** (RLS en la base de datos).

### Módulos del backend (todos completados)

| Módulo | Carpeta | Responsabilidad |
|--------|---------|-----------------|
| Identidad | `src/modules/identidad/` | Login institucional, JWT, roles |
| Comunicaciones | `src/modules/comunicaciones/` | Comunicados, audiencias, adjuntos, lecturas |
| Notificaciones | `src/modules/notificaciones/` | Bandeja in-app, dispositivos, push, fan-out |
| Calendario | `src/modules/calendario/` | Eventos oficiales/personales, recordatorios |
| Académico | `src/modules/academico/` | Perfil, materias, pénsum, historial médico (proxy) |

### Roadmap del backend: completo
- ✅ Paso 1: Identidad y Seguridad
- ✅ Paso 2: Comunicaciones
- ✅ Paso 3: Notificaciones
- ✅ Paso 4: Calendario
- ✅ Paso 5: Académico
- Estado de verificación: **235 tests pasando** (`npm test` + `npm run test:db`), `typecheck` y `lint` limpios.

---

## 2. Cómo correr el backend local

Requisitos: Node ≥ 20, Docker (Supabase local), Supabase CLI.

```bash
# 1. Levantar el stack de Supabase (PostgreSQL + Storage + Auth local)
npx supabase start

# 2. Aplicar migraciones (crea esquema + políticas RLS)
npx supabase migration up

# 3. Arrancar el BFF (lee .env)
npm run dev          # http://localhost:3000
```

Comandos de verificación:

```bash
npm run typecheck    # tipos de TypeScript
npm run lint         # eslint
npm test             # tests unitarios (sin DB)
npm run test:db      # tests de integración RLS (requiere Supabase arriba)
```

> **Nota operativa:** si se ejecuta `npx supabase db reset`, el GRANT manual
> `GRANT USAGE ON SCHEMA auth TO app_bff` se pierde. Re-aplicarlo como
> `supabase_admin` antes de `npm run test:db` (documentado en
> `docs/e2e-notificaciones.md`).

### Variables de entorno (`/.env`, ver `.env.example`)
- `DATABASE_URL` — conexión como rol `app_bff` (sin bypass de RLS).
- `JWT_SECRET`, `JWT_EXPIRES_IN` — firma del token propio del BFF.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Storage (URLs firmadas).
- `PUSH_PROVIDER` — `mock` (sin red) o `expo` (push real).
- `SISTEMA_API_KEY` — API Key para endpoints de sistema.
- `UNIMAR_API_URL`, `UNIMAR_API_KEY` — vacío = se usa el mock académico.

---

## 3. Contrato de API completo

Base URL: `http://localhost:3000/api/v1`.

**Autenticación:**
- Todas las rutas de negocio usan **`Authorization: Bearer <JWT>`** (obtenido en login).
- El endpoint de sistema usa **`X-API-Key: <SISTEMA_API_KEY>`** (no JWT).

**Envoltorio de respuesta:**
- Éxito: `{ "data": <payload> }`
- Error: `{ "error": { "code": "SNAKE_CASE", "message": "..." } }`

**Convención:** el JSON se envía y recibe en **`snake_case`** (p. ej.
`decanato_ids`, `programado_para`, `mime_type`).

---

### 3.1 Identidad

#### `POST /auth/login` — iniciar sesión
```jsonc
// request
{ "email": "ana.estudiante@unimar.edu.ve", "password": "unimar123" }
// response 200
{
  "data": {
    "token": "<JWT>",
    "usuario": {
      "id": "<uuid>",
      "cedula": "20123456",
      "nombre": "Ana Estudiante",
      "rol": "ESTUDIANTE",
      "decanato_id": 5
    }
  }
}
```
El JWT expira en 8h (configurable). El móvil debe persistirlo (AsyncStorage) y
enviarlo en el header `Authorization` de los demás requests.

**Usuarios mock** (hasta que UNIMAR entregue API real):

| Usuario | Correo | Rol | Decanato |
|---------|--------|-----|----------|
| Ana | ana.estudiante@unimar.edu.ve | ESTUDIANTE | 5 |
| Bruno | bruno.otra@unimar.edu.ve | ESTUDIANTE | 3 |
| Flavio | flavio.rosales@unimar.edu.ve | COMUNICADOR | 5 |
| César | cgarcia.5516@unimar.edu.ve | ADMIN | null |

(Todas las contraseñas: `unimar123`)

---

### 3.2 Comunicaciones

#### Comunicados — CRUD y ciclo de vida
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/comunicados` | COMUNICADOR | Crear (body: `titulo`, `cuerpo` [Markdown], `decanato_ids`[], `programado_para`?, `expira_at`?) |
| GET | `/comunicados?estado=&limit=&offset=` | todos | Listar visibles |
| GET | `/comunicados/:id` | todos | Detalle (registra lectura si no eres autor) |
| PATCH | `/comunicados/:id` | autor/ADMIN | Editar (solo BORRADOR/PUBLICADO) |
| POST | `/comunicados/:id/solicitar-revision` | autor | BORRADOR → PENDIENTE |
| POST | `/comunicados/:id/aprobar` | ADMIN | PENDIENTE → PUBLICADO (dispara fan-out) |
| POST | `/comunicados/:id/rechazar` | ADMIN | PENDIENTE → BORRADOR con `motivo` |
| POST | `/comunicados/:id/publicar` | ADMIN | BORRADOR → PUBLICADO directo |
| POST | `/comunicados/:id/archivar` | autor/ADMIN | PUBLICADO → ARCHIVADO |
| GET | `/comunicados/:id/estadisticas` | autor/ADMIN | `{ lecturas: number }` |

**Regla de audiencia:** `decanato_ids` vacío (`[]`) = **GLOBAL** (toda la
universidad). Con decanatos = solo esos. Un COMUNICADOR solo puede publicar a
**su propio** decanato; el ADMIN a cualquiera o global.

#### Adjuntos (subida en dos fases)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/comunicados/:id/adjuntos/url-carga` | COMUNICADOR | Fase 1: pide URL firmada. Body: `nombre`, `mime_type`, `tamano`. Devuelve `urlFirmada` + `path`. |
| POST | `/comunicados/:id/adjuntos` | COMUNICADOR | Fase 2: registra tras subir. Body: `path` (de la fase 1), `nombre`, `mime_type`, `tamano`. |
| GET | `/comunicados/:id/adjuntos` | todos | Listar adjuntos del comunicado |
| GET | `/adjuntos/:id/url-descarga` | todos | URL firmada de descarga (TTL 300s) |
| DELETE | `/adjuntos/:id` | autor/ADMIN | Eliminar |

> **Flujo de subida para el móvil:** (1) `POST url-carga` → el BFF devuelve
> una URL firmada de Supabase Storage; (2) el cliente sube el archivo
> directamente a esa URL; (3) `POST /comunicados/:id/adjuntos` registra los
> metadatos. El cliente **nunca** usa claves de Storage.

---

### 3.3 Notificaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/dispositivos` | Registrar dispositivo. Body: `push_token`, `plataforma` (`android`\|`ios`\|`web`). |
| GET | `/dispositivos` | Listar mis dispositivos |
| DELETE | `/dispositivos/:id` | Eliminar dispositivo |
| GET | `/notificaciones?solo_no_leidas=&limit=&offset=` | Bandeja |
| GET | `/notificaciones/no-leidas` | `{ total: number }` |
| POST | `/notificaciones/:id/leer` | Marcar leída |
| POST | `/notificaciones/leer-todas` | Marcar todas leídas |

**Tipos de notificación** (campo `tipo`):

| Tipo | Origen |
|------|--------|
| `COMUNICADO_PUBLICADO` | Un comunicado fue publicado a tu audiencia |
| `COMUNICADO_RECHAZADO` | Tu comunicado fue rechazado (cuerpo = motivo) |
| `EVENTO_OFICIAL_CREADO` | Un evento oficial fue creado en tu audiencia |
| `EVENTO_RECORDATORIO` | Un evento que te importa comienza pronto |
| `NOTA_PUBLICADA` | Un profesor subió una nota (Académico) |

El `push_token` debe ser un **Expo Push Token** (formato `ExpoPushToken[...]`),
obtenido con `expo-notifications` en el cliente. `PUSH_PROVIDER=expo` activa el
envío real; `mock` lo loguea.

---

### 3.4 Calendario

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/eventos` | todos (PERSONAL), ADMIN/COMUNICADOR (OFICIAL) | Body: `titulo`, `descripcion`?, `tipo` (`OFICIAL`\|`PERSONAL`), `inicio_at`, `fin_at`?, `dia_completo`?, `recordatorio_minutos`?, `decanato_ids`? |
| GET | `/eventos?desde=&hasta=&limit=&offset=` | todos | Listar en rango (máx. 90 días) |
| GET | `/eventos/:id` | todos | Detalle |
| PATCH | `/eventos/:id` | dueño/ADMIN | Editar (no cambia `tipo`) |
| DELETE | `/eventos/:id` | dueño/ADMIN | Eliminar |

**Reglas de tipo:**
- `PERSONAL`: lo crea cualquier usuario; solo lo ve su dueño.
- `OFICIAL`: lo crea ADMIN (cualquier audiencia o global) o COMUNICADOR (solo
  su decanato). Se ve por audiencia.
- `recordatorio_minutos`: el job del BFF notifica a los involucrados N minutos
  antes del inicio.

---

### 3.5 Académico (proxy a UNIMAR)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/academico/perfil` | Perfil académico: `carrera`, `semestre`, `promedio`, `estatus` |
| GET | `/academico/materias?periodo=` | Materias del estudiante (unión discriminada, ver §5) |
| GET | `/academico/materias/:id` | Detalle de una materia |
| GET | `/academico/pensum?carrera_id=` | Plan de estudios con prerequisitos |
| GET | `/academico/historial-medico` | **Solo el propio estudiante** (ni el ADMIN lo ve) |

> Todos los GET usan la identidad del JWT; el cliente **no** puede consultar
> datos de otra persona. El historial médico es de acceso restringido por
> privacidad.

---

### 3.6 Sistema (para ingesta, no lo usa la app)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/sistema/notas` | `X-API-Key` | Simula publicación de nota. Body: `materia_id`, `materia_nombre`, `cedula_estudiante`, `nota` (0-20), `periodo`. Dispara `NOTA_PUBLICADA` al estudiante. |

---

## 4. Convenciones de consumo (resumen)

1. **Auth:** `Authorization: Bearer <JWT>` en todos los requests de negocio.
2. **Envoltorio:** éxito `{ data }`, error `{ error: { code, message } }`.
3. **snake_case:** los campos JSON son `snake_case` (no `camelCase`).
4. **Errores típicos por código:** `UNAUTHORIZED` (401, token inválido/ausente),
   `FORBIDDEN` (403, rol insuficiente), `BAD_REQUEST` (400, validación Zod),
   `NOT_FOUND` (404), `CONFLICT` (409, p. ej. token push duplicado),
   `SERVICE_UNAVAILABLE` (503, API UNIMAR caída o caché sin dato previo).
5. **Paginación** en listas: `limit` (1-100, default 20) y `offset` (default 0).

---

## 5. Conceptos de dominio que el cliente debe conocer

### Roles y jerarquía
`ESTUDIANTE` (0) < `COMUNICADOR` (1) < `ADMIN` (2). El rol se deriva del JWT;
la UI debe ocultar/mostrar acciones según el rol:
- Solo `COMUNICADOR`/`ADMIN`: crear/editar comunicados y eventos oficiales.
- Solo `ADMIN`: aprobar/rechazar/publicar comunicados, crear oficiales globales.
- Cualquier rol: bandeja de notificaciones, eventos personales, académico.

### Audiencias: "0 filas = GLOBAL"
En comunicados y eventos oficiales, la ausencia de audiencia significa que va
dirigido a **toda la universidad**. Si hay decanatos listados, solo a ellos. El
cliente debe representar esto (p. ej. etiqueta "Toda la universidad").

### DTO discriminado de materias (unión discriminada)
`GET /academico/materias` devuelve objetos con el discriminador `es_actual`:

```jsonc
// Materia ACTUAL (en curso): detalle completo
{
  "id": "mat-1", "codigo": "IS-701", "nombre": "Bases de Datos II",
  "creditos": 4, "es_actual": true,
  "profesor": "Dra. Pérez", "aula": "A-12", "horario": "Lun-Mié 9:00-10:30",
  "cortes": [ { "nombre": "Parcial 1", "fecha": "2026-09-15", "ponderacion": 30, "nota": 14 } ]
}
// Materia HISTÓRICA: resumen con nota final
{
  "id": "mat-hist-1", "codigo": "IS-501", "nombre": "Algoritmos I",
  "creditos": 4, "es_actual": false,
  "periodo": "2025-2", "nota_final": 18, "estado": "APROBADA"
}
```
La UI debe renderizar según `es_actual` (no asumir campos comunes).

### Notificaciones y push
- El registro de dispositivo (token Expo) debe ocurrir **después del login** y
  en cada arranque (para refrescar `ultimo_uso_at`).
- Al recibir un push, el `data` del payload incluye `tipo` y `referencia_id`
  para hacer **deep-link** (p. ej. `COMUNICADO_PUBLICADO` → pantalla del
  comunicado; `EVENTO_OFICIAL_CREADO` → evento; `NOTA_PUBLICADA` → materia).
- El token único de Expo no se puede compartir entre usuarios: si el BFF
  responde `409 CONFLICT` en `POST /dispositivos`, el token ya está asociado a
  otro usuario (caso de reasignación al reinstalar).

### Calendario
- Los eventos `PERSONAL` son privados (solo dueño); los `OFICIAL` se muestran
  según audiencia. El cliente puede mezclar ambos en una sola vista de agenda.

---

## 6. Stack recomendado: React Native + Expo

El backend ya está preparado para el stack **React Native + Expo**:

- **Push:** Expo Push Tokens (`expo-notifications`) son exactamente lo que el
  backend espera en `POST /dispositivos`. Con `PUSH_PROVIDER=expo` el BFF
  envía a la Expo Push API.
- **Entorno:** Expo simplifica builds, gestión de notificaciones y el SDK
  unificado — ideal para una tesis donde el tiempo de setup importa.

### Decisiones abiertas a resolver al arrancar el front

| Tema | Opciones a considerar |
|------|------------------------|
| Navegación | React Navigation (stack + tabs) — recomendado |
| Estado global | Zustand / React Query (para caché de API y bandeja) |
| Persistencia del token | AsyncStorage o expo-secure-store (recomendado el segundo para el JWT) |
| Deep-links de push | `expo-notifications` → `linking` de React Navigation |
| Render de Markdown (cuerpo de comunicados) | `react-native-markdown-display` |
| Manejo de `stale` en Académico | React Query: usar la bandera `stale` para refresco en segundo plano |

### Hoja de ruta sugerida del front (por módulo)
1. **Esqueleto + auth:** login, guardado del JWT, cliente HTTP con header Bearer.
2. **Notificaciones:** registro de dispositivo, bandeja, marcar leídas.
3. **Comunicados:** feed (visibles), detalle, y gestión para COMUNICADOR/ADMIN
   (crear, revisar, adjuntar).
4. **Calendario:** vista de agenda (oficial + personal), crear/editar eventos.
5. **Académico:** perfil, materias (discriminadas), pensum, historial médico.

---

## 7. Recursos adicionales en el repo

- `ARCHITECTURE.md` — documento de arquitectura completo (decisiones, esquema
  RLS, roadmap).
- `docs/e2e-notificaciones.md` — verificación E2E del flujo de notificaciones
  (ejemplos de curl y usuarios).
- `docs/graphify-god-nodes.md` — análisis de las abstracciones centrales del
  backend (UnitOfWork, Claims, DbTx).
- `graphify-out/graph.html` — grafo interactivo del código (si existe).

---

## 8. Checklist para validar que entendiste

1. Puedes armar un `POST /auth/login` y extraer el token.
2. Sabes que todos los demás requests llevan `Authorization: Bearer <token>`.
3. Distingues `data` vs `error` en las respuestas.
4. Sabes que un comunicado/evento con `decanato_ids: []` es **global**.
5. Sabes que `materias` devuelve dos formas según `es_actual`.
6. Sabes cómo registrar el token Expo y qué significa un `409`.
7. Sabes qué endpoints usan `X-API-Key` en lugar de JWT (solo sistema).