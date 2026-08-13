# Arquitectura — Backend UNIMARapp

> Tesis de Ingeniería de Sistemas — Universidad de Margarita (UNIMAR)
> Metodología: **Desarrollo de Software Basado en Componentes (DSBC)**
> Principios: **Clean Architecture** (Regla de Dependencia, Dependencias Acíclicas)

## 1. Contexto y alcance

Aplicación móvil para la gestión de servicios y comunicación de UNIMAR. Este
repositorio cubre el **backend** (BFF); el cliente móvil (React Native) se
desarrolla en una fase posterior. Los datos académicos pesados (perfil,
historial médico, pénsum) **no se persisten localmente**: se consumen desde la
API institucional a través del BFF.

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Lenguaje | TypeScript |
| Servidor (BFF) | Node.js + Express |
| Base de datos | Supabase (PostgreSQL) |
| Validación | Zod |
| API | REST |
| Pruebas | Vitest (unitarias + integración de políticas RLS) |
| Entorno local | Supabase CLI (Docker) con migraciones SQL versionadas |

## 3. Decisiones arquitectónicas (registro)

### 3.1 Acceso a datos
- **Solo BFF**: la app móvil nunca se conecta directamente a Supabase. Express
  es el único punto de cumplimiento de seguridad (RBAC), y RLS actúa como
  segunda barrera (ABAC).

### 3.2 Autenticación e identidad
- El BFF valida las credenciales institucionales contra la **API de UNIMAR** y
  mintea un **JWT propio** con claims: `sub` (id_usuario), `rol`, `decanato_id`.
- Se define el puerto de dominio **`IUniversityAuthService`**:
  - `MockUniversityAuthService` (actual): usuarios hardcoded + latencia simulada.
  - `ApiUniversityAuthService` (futuro): cuando UNIMAR entregue los endpoints.
  - El swap se hace por inyección de dependencias sin tocar el dominio (DIP).

### 3.3 Modelo de seguridad híbrido RBAC + ABAC
- **RBAC** (en BFF): un rol por usuario, catálogo `roles` extensible, jerarquía
  `ADMIN > COMUNICADOR > ESTUDIANTE`. El rol se deriva siempre del JWT, nunca
  del cliente. El primer ADMIN nace por seed; los roles los gestiona el ADMIN.
- **ABAC** (en PostgreSQL con RLS): segmentación por decanato.
  - Lectura: estudiantes solo ven comunicados/eventos de su decanato o globales.
  - Escritura: el COMUNICADOR solo publica a **su** decanato; el ADMIN, a cualquiera.
- **RLS real vía BFF**: conexión con rol de DB dedicado **sin bypass de RLS**.
  Cada request abre una transacción y ejecuta
  `set_config('request.jwt.claims', '<claims>', true)`; las políticas leen los
  claims con `current_setting()`. Esto se encapsula en un **unit-of-work** de
  infraestructura, invisible para el dominio. Regla de disciplina: ningún
  repositorio consulta fuera de la transacción con claims.

### 3.4 Datos académicos (proxy defensivo)
- Sin persistencia local. DTO con **unión discriminada** Zod sobre `es_actual`:
  - `true` → vista detallada (cortes, profesor, aula).
  - `false` → vista resumida histórica (nota_final, periodo, estado).
- **Caché LRU en memoria** con TTL de 10–15 min + **stale-if-error**: si la API
  de UNIMAR cae, se sirve la última copia con bandera `stale: true`.

### 3.5 Notificaciones
- Tabla `notificaciones` (bandeja in-app por usuario), separada de
  `comunicados` (difusión). Los mensajes "directos" son notificaciones, no
  comunicados.
- Puerto **`INotificacionService`** → implementación inicial **Expo Push API**
  (reversible según el stack móvil final).
- `dispositivos` (1:N) corrige el `push_token` 1:1: multi-dispositivo real.

## 4. Esquema relacional

```
roles(id, nombre)
decanatos(id, nombre)
usuarios(id, rol_id → roles, decanato_id → decanatos, preferencias jsonb, created_at)
dispositivos(id, usuario_id → usuarios, push_token UNIQUE, plataforma,
             registrado_at, ultimo_uso_at)

comunicados(id, titulo, cuerpo, autor_id → usuarios,
            estado CHECK (BORRADOR|PUBLICADO|ARCHIVADO),
            publicado_at, programado_para, expira_at, created_at, updated_at)
comunicado_audiencias(comunicado_id, decanato_id)          -- PK compuesta; 0 filas = GLOBAL
comunicado_adjuntos(id, comunicado_id, storage_path, nombre, mime_type)
comunicado_lecturas(comunicado_id, usuario_id, leido_at)   -- PK compuesta

eventos(id, titulo, descripcion,
        tipo CHECK (OFICIAL|PERSONAL),
        usuario_id,                                        -- NULL si OFICIAL
        inicio_at timestamptz, fin_at timestamptz,
        dia_completo bool, recordatorio_minutos, created_at)
  CHECK: PERSONAL ⇒ usuario_id NOT NULL; OFICIAL ⇒ usuario_id NULL
evento_audiencias(evento_id, decanato_id)                  -- mismo patrón de audiencias

notificaciones(id, usuario_id → usuarios, tipo, titulo, cuerpo,
               referencia_id, leida bool, created_at)
```

Notas de modelado:
- **Audiencias normalizadas** con tablas pivote (sin arrays): integridad
  referencial, RLS indexable vía `EXISTS`, catálogos editables sin migrar datos.
- Un solo mecanismo de audiencias reutilizado por comunicados y eventos
  (candidato a *shared kernel* DSBC).
- Sin recurrencia en eventos (decisión de alcance v1, documentada).
- Adjuntos en **Supabase Storage**; el BFF genera URLs firmadas (coherente con
  "Solo BFF").

## 5. Políticas RLS clave (en migraciones SQL versionadas)

- `comunicados SELECT`: `estado = PUBLICADO` ∧ no expirado ∧ (audiencia global ∨
  `decanato_id` del claim ∈ audiencias). COMUNICADOR/ADMIN ven sus propios en
  cualquier estado.
- `comunicados INSERT/UPDATE`: COMUNICADOR solo si audiencia ⊆ su decanato;
  ADMIN sin restricción.
- `eventos SELECT`: OFICIAL (∈ audiencia) ∨ PERSONAL propio.
- `eventos INSERT/UPDATE/DELETE` PERSONAL: solo si `usuario_id = claim.sub`.
- `notificaciones`, `comunicado_lecturas`, `dispositivos`: solo filas propias.

## 6. Estructura del monolito modular (DSBC)

```
src/
  modules/
    identidad/        domain | application | infrastructure
                      (auth, usuarios, roles, JWT, IUniversityAuthService + Mock)
    comunicaciones/   (comunicados, audiencias, adjuntos, lecturas)
    notificaciones/   (bandeja, INotificacionService, ExpoPush, fan-out)
    calendario/       (eventos, job de recordatorios)
    academico/        (proxy API UNIMAR, caché LRU, DTO Zod)
  shared/             kernel: audiencias, unit-of-work (set_config),
                      middlewares RBAC, manejo de errores
supabase/
  migrations/         esquema + políticas RLS + seeds (versionados)
```

- Fronteras entre módulos forzadas por lint (sin imports cruzados internos;
  solo vía el `index` público de cada módulo).
- Dependencias acíclicas: los módulos dependen de `shared`, nunca entre sí
  directamente (la comunicación entre componentes ocurre por puertos/eventos).

## 7. Estrategia de pruebas

- **Unitarias** (Vitest): casos de uso con puertos mockeados.
- **Integración de RLS**: scripts contra el Supabase local que actúan como
  distintos roles/decanatos y verifican visibilidad/escritura. Son la evidencia
  ejecutable del modelo ABAC.

## 8. Roadmap de etapas (backend)

1. **Identidad y Seguridad** — esquema base, mock auth, JWT, RBAC,
   unit-of-work `set_config`, RLS base.
2. **Comunicaciones** — CRUD + audiencias + adjuntos + lecturas + ABAC.
3. **Notificaciones** — bandeja + puerto push + Expo + fan-out al publicar.
4. **Calendario** — eventos + audiencias + job de recordatorios.
5. **Académico** — proxy + caché + DTO discriminado.

## 9. Pendientes externos

- Confirmar con UNIMAR si su API expone endpoint de autenticación
  (activa el swap a `ApiUniversityAuthService`).
- Verificar Docker disponible para el stack local de Supabase.
- Definir stack del cliente móvil (afina la implementación de push).
