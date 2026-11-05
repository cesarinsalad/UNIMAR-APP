# Prompt Maestro: Implementación del Módulo de Gestión (Web & Móvil) — UNIMARapp

Actúa como un Arquitecto Frontend Senior experto en **React Native**, **Expo (Mobile & Web)**, **TypeScript** y diseño de interfaces adaptativas (**Responsive Adaptive UI**).

Necesito que construyas el **Módulo de Gestión Institucional** de **UNIMARapp** (la aplicación oficial de la Universidad de Margarita). Este módulo debe funcionar a partir de una única base de código tanto en **navegadores de escritorio (Desktop Web)** como en **dispositivos móviles (iOS / Android)**, adaptando dinámicamente su disposición, componentes de listado y menús de acciones según el tamaño de la pantalla (`useWindowDimensions`).

---

## 1. Reglas de Negocio, Roles y Visibilidad (RBAC)

El módulo es accesible únicamente para dos roles institucionales autenticados (`ADMIN` y `COMUNICADOR`). El alcance de los datos y las acciones permitidas dependen estrictamente del rol del usuario activo:

### A. Visibilidad de Datos
1. **Rol `COMUNICADOR` (Emisor Decanal):**
   - Solo puede visualizar y gestionar los **Comunicados** y **Eventos** asociados exclusivamente a su propio decanato (`decanato_id` del usuario).
2. **Rol `ADMIN` (Administrador General):**
   - Visualiza y gestiona **todos los Comunicados** de todos los decanatos y los de alcance global.
   - Visualiza y gestiona **todos los Eventos institucionales** (`INSTITUCIONAL`, `CAMPUS`, `DECANATO`, `FERIADO`), **excluyendo estrictamente los eventos de categoría `PERSONAL`** (los cuales son privados de cada usuario y jamás deben aparecer en el módulo de gestión).

### B. Máquina de Estados (Comunicados y Eventos)
Tanto los Comunicados como los Eventos comparten el mismo flujo de ciclo de vida y estados:
- `BORRADOR`: Creado por un Comunicador o Admin, pendiente de revisión o publicación.
- `PUBLICADO`: Aprobado y visible para la comunidad estudiantil.
- `RECHAZADO`: Devuelto por el Administrador con observaciones.
- `ARCHIVADO`: Oculto del feed principal pero conservado en el historial.

### C. Matriz de Acciones Permitidas por Rol
Ambos flujos (**Camino A: Comunicados** y **Camino B: Eventos**) deben implementar exactamente la misma lógica de permisos:

- **Acciones del `COMUNICADOR`:**
  - **Crear / Enviar como Borrador:** Todo nuevo comunicado o evento creado por un comunicador se guarda y envía en estado `BORRADOR` para revisión del administrador.
  - **Observar / Ver Detalle:** Puede abrir cualquier comunicado o evento de su decanato para previsualizar su contenido, estado actual y métricas.
  - **Editar:** Solo puede editar borradores propios que aún no hayan sido publicados o que hayan sido rechazados.
  - **Ver Contador de Lecturas:** Puede visualizar el contador de lecturas confirmadas (`lecturas_count`) en los comunicados de su decanato.

- **Acciones del `ADMIN`:**
  - **Crear:** Puede crear comunicados o eventos como `BORRADOR` o publicarlos directamente.
  - **Editar (`EDITAR`):** Puede modificar el contenido, metadatos o audiencia de cualquier comunicado o evento.
  - **Aprobar Borrador (`APROBAR_BORRADOR`):** Aprueba un borrador enviado por un comunicador.
  - **Rechazar Borrador (`RECHAZAR_BORRADOR`):** Rechaza un borrador (permitiendo incluir un motivo opcional).
  - **Publicar Borrador (`PUBLICAR_BORRADOR`):** Cambia el estado de un borrador a `PUBLICADO` y dispara la difusión/notificación.
  - **Archivar (`ARCHIVAR`):** Pasa un registro publicado o inactivo al estado `ARCHIVADO`.
  - **Desarchivar (`DESARCHIVAR`):** Restaura un registro archivado a estado `BORRADOR` o `PUBLICADO`.
  - **Ver Contador de Lecturas:** Visualiza el contador de lecturas (`lecturas_count`) de todos los comunicados.

---

## 2. Estructura de Navegación y Flujo de Usuario

El módulo se divide en **3 vistas principales** interconectadas mediante un selector de navegación superior o barra lateral (según el dispositivo):

### Vista 1: Inicio del Módulo de Gestión (`Dashboard / Resumen`)
Es la pantalla de aterrizaje del módulo. Debe contener:
1. **Encabezado Contextual:**
   - Muestra el título del módulo, el rol activo y el alcance (ej. *"Gestión Decanal — Decanato de Ingeniería y Afines"* para Comunicador, o *"Consola Central de Gestión — UNIMAR"* para Admin).
2. **Botones de Acción Rápida (Destacados):**
   - Botón primario: **`+ Nuevo Comunicado`** (abre el modal/formulario de creación de comunicado).
   - Botón secundario: **`+ Nuevo Evento`** (abre el modal/formulario de creación de evento).
3. **Tarjetas de Resumen / KPIs útiles para el usuario:**
   - **Borradores Pendientes:** Cantidad de comunicados y eventos en estado `BORRADOR` esperando aprobación/publicación.
   - **Publicaciones Activas:** Total de comunicados y eventos vigentes (`PUBLICADO`).
   - **Alcance Acumulado (Lecturas):** Sumatoria total de lecturas confirmadas (`👁 lecturas`) de los comunicados visibles para el rol.
   - **Próximo Evento Oficial:** Fecha y título del evento institucional más cercano.
4. **Secciones de Acceso Rápido (Resumen de actividad reciente):**
   - **Últimos Comunicados (Top 4):** Lista compacta con título, badge de estado, decanato, contador de lecturas (`👁 N`) y un botón claro **"Ver todos los comunicados →"** que navega al **Camino A**.
   - **Últimos Eventos (Top 4):** Lista compacta con fecha, título, categoría, badge de estado y un botón claro **"Ver todos los eventos →"** que navega al **Camino B**.

---

### Vista 2: Camino A — Listado y Gestión de Comunicados
Accesible desde la pestaña `"Comunicados"` o desde el botón *"Ver todos los comunicados"* del resumen:
1. **Barra de Controles y Filtros:**
   - Buscador por texto (filtra por título o resumen).
   - Chips de filtro por estado: `Todos`, `Borradores`, `Publicados`, `Rechazados`, `Archivados`.
   - Filtro por Decanato (solo visible si el rol es `ADMIN`).
   - Botón `+ Nuevo Comunicado`.
2. **Información de cada Comunicado en el listado:**
   - Badge semántico de Estado (`BORRADOR`, `PUBLICADO`, `RECHAZADO`, `ARCHIVADO`).
   - Título del comunicado y extracto/categoría.
   - Decanato emisor / Audiencia objetivo y autor.
   - Fecha de creación o publicación.
   - **Contador de Lecturas destacado:** Icono de ojo con número formateado (ej. `👁 342 lecturas`).
3. **Ejecución de Acciones:**
   - Al hacer clic en un comunicado, se abre la vista de detalle/observación.
   - Botones de acción dinámicos según el rol (`ADMIN` vs `COMUNICADOR`) y el estado actual del registro (`EDITAR`, `APROBAR BORRADOR`, `PUBLICAR BORRADOR`, `RECHAZAR BORRADOR`, `ARCHIVAR`, `DESARCHIVAR`).

---

### Vista 3: Camino B — Listado y Gestión de Eventos
Accesible desde la pestaña `"Eventos"` o desde el botón *"Ver todos los eventos"* del resumen. Sigue exactamente la misma lógica y flujo que los comunicados:
1. **Barra de Controles y Filtros:**
   - Buscador por título o lugar del evento.
   - Chips de filtro por estado: `Todos`, `Borradores`, `Publicados`, `Rechazados`, `Archivados`.
   - Chips de filtro por categoría oficial: `INSTITUCIONAL`, `CAMPUS`, `DECANATO`, `FERIADO` *(NUNCA mostrar ni incluir `PERSONAL`)*.
   - Botón `+ Nuevo Evento`.
2. **Información de cada Evento en el listado:**
   - Badge de Fecha y Hora (inicio / fin) y Ubicación física en el campus (ej. *"Aula Abierta"*, *"Sala de Conferencias 1"*).
   - Badge de Categoría con la paleta de colores oficial:
     - `INSTITUCIONAL`: `#0D4D98` (Azul UNIMAR)
     - `CAMPUS`: `#059669` (Verde Esmeralda)
     - `DECANATO`: `#D97706` (Ámbar / Dorado)
     - `FERIADO`: `#DC2626` (Rojo Coral)
   - Badge semántico de Estado (`BORRADOR`, `PUBLICADO`, `RECHAZADO`, `ARCHIVADO`).
   - Decanato organizador / Audiencia.
3. **Ejecución de Acciones:**
   - Mismo flujo que Comunicados: el `COMUNICADOR` envía nuevos eventos como `BORRADOR` y observa su estado; el `ADMIN` dispone de las acciones `EDITAR`, `APROBAR BORRADOR`, `RECHAZAR BORRADOR`, `PUBLICAR BORRADOR`, `ARCHIVAR` y `DESARCHIVAR`.

---

## 3. Requisitos de Diseño Adaptativo (Desktop Web vs. Móvil)

Implementa un hook o breakpoint responsivo (`isDesktop = width >= 1024`, `isTablet = width >= 768 && width < 1024`, `isMobile = width < 768`):

1. **En Desktop / Web (`>= 1024px`):**
   - Disposición amplia con encabezados horizontales, tarjetas de KPIs en una fila de 4 columnas y el resumen dividido en 2 columnas paralelas (*Últimos Comunicados* a la izquierda, *Últimos Eventos* a la derecha).
   - En el **Camino A** y **Camino B**, renderiza los registros en formato de **Tabla de Datos (`Data Table`)** con cabeceras de columna claras, filas con efecto hover y botones de acción directos o menú desplegable limpio en la última columna.
   - Los formularios de creación/edición y vista de detalle se abren en un **Modal centrado amplio o Drawer lateral derecho**.

2. **En Móvil (`< 768px`):**
   - Navegación entre `Resumen`, `Comunicados` y `Eventos` mediante un **Segmented Control** táctil fijo bajo el header.
   - Tarjetas de KPIs en cuadrícula compacta `2x2`.
   - En el **Camino A** y **Camino B**, en lugar de tablas horizontales que rompan el ancho, renderiza cada registro como una **Tarjeta Vertical (`Card`)** con jerarquía clara (Estado y menú `⋮` arriba, Título en el centro, y pie de tarjeta con Decanato, Fecha y Contador de Lecturas `👁`).
   - Al tocar una tarjeta o el botón de opciones `⋮`, despliega un **Bottom Sheet / Modal táctil** con las acciones permitidas para ese rol y estado.

---

## 4. Identidad Visual y Estética
- **Colores Institucionales UNIMAR:** Azul Primario `#0D4D98`, Azul Oscuro `#071F4E`, Fondo claro `#F8FAFC`, Superficies `#FFFFFF`, Bordes `#E2E8F0`.
- **Colores Semánticos de Estado:**
  - `PUBLICADO`: Texto `#065F46`, Fondo `#D1FAE5`, Borde `#A7F3D0`.
  - `BORRADOR`: Texto `#92400E`, Fondo `#FEF3C7`, Borde `#FDE68A`.
  - `RECHAZADO`: Texto `#991B1B`, Fondo `#FEE2E2`, Borde `#FECACA`.
  - `ARCHIVADO`: Texto `#475569`, Fondo `#F1F5F9`, Borde `#CBD5E1`.
- Tipografía limpia, bordes redondeados (`borderRadius: 12`), sombras sutiles y excelente contraste de lectura.

---

## 5. Entregables de Código Requeridos

Genera una implementación modular, limpia y tipada en TypeScript que incluya:
1. **Tipos e Interfaces (`types/gestion.ts`):** Modelos para `ComunicadoGestion`, `EventoGestion`, `EstadoPublicacion`, `RolGestion`, `CategoriaEventoOficial` y `AccionGestion`.
2. **Helper de Permisos (`utils/permisosGestion.ts`):** Funciones puras que reciban `(rol, usuarioDecanatoId, item)` y devuelvan qué items son visibles (filtrando `PERSONAL` y otros decanatos para comunicadores) y qué arreglo de acciones (`EDITAR`, `APROBAR_BORRADOR`, `PUBLICAR_BORRADOR`, `RECHAZAR_BORRADOR`, `ARCHIVAR`, `DESARCHIVAR`) están habilitadas.
3. **Pantalla/Contenedor Principal (`screens/ModuloGestionScreen.tsx`):** Con estado funcional, datos mock realistas de la Universidad de Margarita (con un selector de simulación en la esquina para alternar en vivo entre `ADMIN` y `COMUNICADOR` durante pruebas), el Dashboard de Resumen, la vista de Comunicados (Camino A), la vista de Eventos (Camino B) y los modales de Creación/Edición/Detalle.