# God Nodes del Backend: UnitOfWork, DbTx y Claims

> Fuente: grafo de conocimiento generado con `/graphify` sobre el repositorio
> (756 nodos, 2291 aristas, 37 comunidades). Fecha: 2026-08-31.
>
> Este documento responde a las tres preguntas de mayor betweenness centrality
> que el grafo identifica como puentes arquitectónicos, y las traduce a la
> arquitectura real del proyecto (Clean Architecture + DSBC + RBAC/ABAC).

## Resumen ejecutivo

Los tres nodos más conectados del grafo son las abstracciones del **shared
kernel** que sostienen todo el sistema:

| Nodo | Ubicación | Vecinos directos | Comunidades distintas alcanzadas |
|------|-----------|------------------|----------------------------------|
| `UnitOfWork` | `src/shared/kernel/unitOfWork.ts` | 58 | 20 |
| `Claims` | `src/shared/security/jwt.ts` | 80 | 18 |
| `DbTx` | `src/shared/kernel/db.ts` | 74 | 16 |

Ninguno pertenece a un módulo de negocio: son el "esqueleto" transversal sobre
el que se apoyan los cinco módulos (Identidad, Comunicaciones, Notificaciones,
Calendario y Académico). Su alta conectividad no es casualidad ni deuda: es la
**consecuencia directa** de las decisiones arquitectónicas del proyecto.

---

## Pregunta 1 — ¿Por qué `UnitOfWork` conecta 20 de las 37 comunidades?

**Respuesta corta:** porque *todas* las operaciones que tocan la base de datos
pasan obligatoriamente por él. Es la pieza que garantiza la seguridad ABAC.

### Qué es `UnitOfWork`

`UnitOfWork` (patrón "unidad de trabajo") es la clase que abre una transacción
de PostgreSQL en cada request y **inyecta la identidad del usuario** en ella:

```
run(claims?, fn)  →  BEGIN  →  set_config('request.jwt.claims', claims)  →  fn(tx)  →  COMMIT/ROLLBACK
```

- `runAs(claims, fn)` — transacción **con** claims del usuario autenticado.
- `run(fn)` — transacción **sin** claims (modo sistema: login, jobs, fan-out).

### Por qué conecta tantas comunidades

Toda la disciplina de seguridad del BFF dice: *"ningún repositorio consulta
fuera de una transacción proporcionada por UnitOfWork"*. Cada caso de uso de
los cinco módulos recibe un `UnitOfWork` en su constructor y lo usa para
envolver su trabajo. Como cada módulo tiene **casos de uso, repositorios,
rutas HTTP y tests**, todos dependen de `UnitOfWork` → de ahí sus 58 vecinos
repartidos en 20 comunidades.

La comunidad `Composition Root` (el `server.ts` que ensambla todo) también lo
toca porque es el único lugar donde se instancia una sola vez y se inyecta a
los cinco módulos.

### Qué significa arquitectónicamente

`UnitOfWork` es el **eje del modelo de seguridad híbrido RBAC + ABAC**:

- RBAC (roles) se decide en el servidor con los claims.
- ABAC (RLS en la base) se alimenta de los claims que `UnitOfWork` inyecta vía
  `set_config`. Sin esa inyección, las políticas RLS niegan todo (fail-closed).

Que el grafo lo muestre como el mayor puente valida que el "modo sistema vs.
modo usuario" es una preocupación transversal bien centralizada: si quisieras
migrar a otra base de datos, cambiarías una sola clase y todos los módulos la
seguirían usando sin modificarse.

---

## Pregunta 2 — ¿Por qué `DbTx` conecta 16 comunidades?

**Respuesta corta:** porque es el *contrato* que todos los repositorios
reciben para ejecutar sus consultas, y está diseñado para que el dominio **no
dependa del driver de PostgreSQL**.

### Qué es `DbTx`

```ts
export type DbTx = PoolClient; // alias del cliente de pg
```

Es un alias de `PoolClient` de `pg`, pero tipado como **contrato del shared
kernel**. Los puertos de dominio (`IComunicadoRepository`, `IEventoRepository`,
`INotificacionRepository`, `IUsuarioRepository`, ...) declaran sus métodos con
`tx: DbTx` — nunca con el tipo concreto del driver.

### Por qué conecta tantas comunidades

Todos los repositorios de infraestructura (Postgres) reciben una `DbTx` en
cada método y la usan para `tx.query(...)`. Los fan-outs (`FanOutComunicado...`,
`FanOutEventoOficialCreado`, `FanOutNotaPublicada`), los jobs (`RecordatoriosJob`)
y los casos de uso de escritura también la pasan de forma explícita.

Las 16 comunidades alcanzadas son justamente las que contienen repositorios o
escrituras: Comunicados (CRUD, adjuntos, ciclo de vida), Calendario (repo de
eventos, job), Notificaciones (bandeja, fan-outs), Identidad (upsert de
usuarios), Académico (publicar nota) y el EventBus.

### Qué significa arquitectónicamente

`DbTx` materializa la **Regla de Dependencia** de Clean Architecture: el
dominio no importa `pg`; importa un tipo del shared kernel. Esto mantiene el
dominio puro y permite:

- Testear casos de uso con `fakeTx` (un objeto vacío cast a `DbTx`), como hacen
  todos los `*.test.ts`.
- Cambiar el driver (pg → otro cliente) sin tocar ningún puerto de dominio.

---

## Pregunta 3 — ¿Por qué `Claims` conecta 18 comunidades?

**Respuesta corta:** porque es la **identidad del usuario que viaja por todo el
sistema** — del JWT a la base de datos, pasando por cada caso de uso.

### Qué es `Claims`

```ts
export interface Claims {
  sub: string;            // UUID interno del usuario
  role: string;           // rol (ESTUDIANTE | COMUNICADOR | ADMIN)
  decanato_id: number | null;
  nombre: string;
}
```

Es la forma tipada de lo que viaja dentro del JWT propio del BFF y lo que se
inyecta como `request.jwt.claims` en la base de datos.

### Por qué conecta tantas comunidades

Cada caso de uso recibe `claims: Claims` como primer argumento y lo usa para:

1. **Autorizar** (RBAC): `claims.role` decide si puede crear/editar/eliminar.
2. **Identificar al dueño**: `claims.sub` se compara contra `autor_id`,
   `usuario_id`, `usuario_id` de dispositivos, notificaciones, etc.
3. **Escalar al decanato**: `claims.decanato_id` alimenta las políticas RLS de
   audiencias (comunicados y eventos) y las reglas anti-global de los
   COMUNICADOR.
4. **Resolver la cédula**: en Académico, `claims.sub` → cédula vía el puerto
   compartido `ICedulaResolver`.

Las 18 comunidades incluyen: los 5 módulos de negocio, las capas HTTP (que
extraen claims del request), los middlewares de autenticación, y los tests de
RLS (que simulan claims con `set_config`).

### Qué significa arquitectónicamente

`Claims` es el puente entre las **dos barreras de seguridad**:

```
JWT (RBAC en BFF)  →  claims  →  set_config  →  RLS (ABAC en Postgres)
```

Un `Claims` bien formado es lo único que necesita el sistema para saber *quién*
es el usuario y *qué* puede hacer en cada contexto. Por eso su tipo vive en el
shared kernel (`shared/security/jwt.ts`) y no en un módulo: lo consumen todos.

---

## Conexión entre los tres: un mismo ciclo

Los tres god nodes forman un **ciclo de datos de una sola dirección** que se
repite en cada request:

```
1. JWT se verifica  →  Claims (identity tipada)
2. Claims se pasa a UnitOfWork.runAs(claims, fn)   →  transacción + set_config
3. Dentro, el caso de uso pide un DbTx a los repositorios
4. Los repos hacen tx.query() bajo la transacción con claims
5. RLS en Postgres lee request.jwt.claims y decide fila por fila
```

- `Claims` = *quién*.
- `UnitOfWork` = *en qué contexto seguro* (transacción con identidad).
- `DbTx` = *cómo* se habla con la base sin acoplar el dominio.

Ninguno contiene lógica de negocio: son **infraestructura transversal**,
correctamente aislada en el shared kernel. Su alta centralidad es la firma de
una arquitectura donde la seguridad no es un afterthought sino el esqueleto.

---

## Implicaciones prácticas (para desarrollo futuro)

1. **No dupliques estos contratos.** Si un nuevo módulo necesita DB, debe
   recibir `UnitOfWork` y usar `DbTx` en sus puertos — nunca abrir su propio
   pool ni hacer `tx.query` fuera de un `runAs`/`run`.
2. **`Claims` es inmutable por request.** La capa HTTP lo extrae una vez; los
   casos de uso no deben construirlo ni mutarlo.
3. **El grafo detectó 0 ciclos de imports.** Eso confirma que la regla de
   dependencias acíclicas se mantiene: los módulos dependen del shared kernel,
   nunca entre sí.
4. **Deuda conocida:** 178 aristas "dangling" del AST apuntan a dependencias
   externas (express, pg, zod) que no son nodos del corpus — normal en un grafo
   de código TypeScript, no es corrupción.

---

## Cómo consultar esto en el grafo

```bash
# Ver el grafo interactivo en el navegador
open graphify-out/graph.html

# Trazar desde UnitOfWork (BFS amplio)
graphify query "Why does UnitOfWork connect the modules?" --budget 1500

# Camino entre dos conceptos
graphify path "UnitOfWork" "Claims"
```