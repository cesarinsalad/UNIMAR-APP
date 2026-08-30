# Verificación E2E — (Notificaciones)

Fecha: 2026-08-29
Stack: Supabase local + `npm run dev` con `PUSH_PROVIDER=mock`.

## Precondiciones

- `npx supabase start`
- `npx supabase migration up`
- `npm run dev`

## Flujo ejecutado

### 1. Login (3 usuarios mock)

| Usuario | Correo | Decanato | Rol |
| ------- | ------ | -------- | --- |
| Ana | ana.estudiante@unimar.edu.ve | 5 | ESTUDIANTE |
| Flavio | flavio.rosales@unimar.edu.ve | 5 | COMUNICADOR |
| César | cgarcia.5516@unimar.edu.ve | NULL | ADMIN |

```
POST /api/v1/auth/login { email, password }
```

### 2. Registro de dispositivos

Ana y Flavio registran dispositivos con `push_token` `ExpoPushToken[e2e-*]` y
`plataforma: android`:

```
POST /api/v1/dispositivos
```

### 3. Aprobación y fan-out

1. Flavio crea un comunicado en el decanato 5
   (`POST /api/v1/comunicados` con `decanato_ids: [5]`).
2. Flavio solicita revisión (`POST /api/v1/comunicados/:id/solicitar-revision`).
3. El admin aprueba (`POST /api/v1/comunicados/:id/aprobar`) → estado PUBLICADO.

Observado en los logs del servidor:

```
[push:mock] enviando 1 mensaje(s)
```

Ana consulta su bandeja (`GET /api/v1/notificaciones?solo_no_leidas=true`) y
obtiene una notificación:

```json
{
  "tipo": "COMUNICADO_PUBLICADO",
  "cuerpo": "E2E comunicado publicado",
  "referenciaId": "<id del comunicado>"
}
```

### 4. Marcado de lectura

- `POST /api/v1/notificaciones/:id/leer` → `leida = true`.
- `GET /api/v1/notificaciones/no-leidas` → el total decrementa.

### 5. Rechazo con motivo

1. Flavio crea otro comunicado → `POST /api/v1/comunicados` y solicita revisión.
2. El admin rechaza con `{"motivo": "..."}` → estado BORRADOR.
3. Flavio consulta su bandeja: notificación `COMUNICADO_RECHAZADO` con el
   motivo en `cuerpo`.

### 6. Seguridad HTTP

- `GET /api/v1/notificaciones` sin `Authorization` → `401`.
- UUID inválido en `POST /api/v1/notificaciones/:id/leer` → `400`.

## Observaciones

- Sin claims activos (flujos `uow.run`), la política `dispositivos_select_sistema`
  aplica vía `current_setting('request.jwt.claims', true) IS NULL`, porque el GUC
  nunca se establece en una conexión nueva del pool.
- Un token de dispositivo reutilizado por otro usuario devuelve `409` al intentar
  re-registrarlo (escenario de reasignación de token Expo).
- `INSERT ... RETURNING` sobre `notificaciones` aplica la política SELECT al
  devolver la fila: el fan-out usa `INSERT ... SELECT unnest(...)` sin
  `RETURNING`, así que no se ve afectado.