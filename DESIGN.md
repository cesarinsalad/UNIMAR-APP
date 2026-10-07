---
name: UNIMARapp
description: >-
  App académica de la Universidad de Margarita — documentos sobre papel bond
  con sello azul único: tarjetas blancas, Montserrat institucional, sombra
  estructural, naranja reservado a advertencias.
colors:
  primary: "#0D4D98"
  on-primary: "#FFFFFF"
  surface-tint-blue: "#EBF2FA"
  neutral-bg: "#F8F9FA"
  neutral-surface: "#FFFFFF"
  neutral-border: "#E8E8E8"
  neutral-border-strong: "#D1D1D4"
  neutral-text-primary: "#413D3C"
  neutral-text-secondary: "#7A7574"
  accent-urgent: "#FF7A00"
  success: "#2E7D32"
  warning: "#FF7A00"
  danger: "#C62828"
typography:
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "34px"
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
  subtitle:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  caption:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  card: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.button}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.button}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.card}"
    padding: "16px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text-primary}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
  chip-selected:
    backgroundColor: "{colors.surface-tint-blue}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  badge:
    backgroundColor: "{colors.surface-tint-blue}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: UNIMARapp

## Overview

**Creative North Star: "El Registro Institucional"**

UNIMARapp se percibe como el escritorio de registro académico del estudiante:
el fondo de pantalla es papel bond (`{colors.neutral-bg}`), cada bloque de
información es un documento —tarjeta blanca con sombra estructural y un
resplandor sutil en su borde superior— y toda acción que modifique o confirme
lleva el sello institucional, el azul UNIMAR (`{colors.primary}`). El sistema
es **Operate** puro: la estudiante escanea, encuentra su clase y actúa; el
diseño nunca compite por la atención.

La personalidad es **institucional serena**: transferible a notario más que a
red social. La densidad es media (tarjetas con aire, listas de historial
apretadas solo en datos), la tipografía sube la voz con peso, no con decoración,
y el color es un semáforo — azul institucional solo identifica dónde interactuar.

Los datos que se muestran vienen de la API institucional vía BFF; el diseño
refleja estados reales (cortes sin nota en gris, nota reprobada en rojo) en vez
de estados aspiracionales.

**Key Characteristics:**

- Tarjeta blanca `20px` sobre canvas `#F8F9FA` con sombra compuesta + resplandor superior.
- Azul `#0D4D98` exclusivo de acción, identidad y selección (≈10% de cada pantalla).
- Naranja `#FF7A00` solo en puntos de notificación/estado de calendario.
- Montserrat única, escala 2-en-2 desde 12px; jerarquía por peso.
- Tab bar flotante tipo pill, siempre blanca con 5 iconos duotone.
- Headers de pantalla vivos en el contenido (headline + campana), sin headers nativos.
- Estados vacíos y errores con texto sereno, sin dramatismo rojo salvo reprobadas.

## Colors

Paleta sobria de una sola voz azul, neutros cálidos y tres semáforos de estado.

### Primary

- **Azul Sello Institucional** (`{colors.primary}` `#0D4D98`): botón primario,
  chevrons/enlaces interactivos, cifras de nota aprobada, día seleccionado del
  calendario, avatares de iniciales, franja superior del carnet. Toda
  interactividad primaria pasa por aquí.
- **Sobre-azul** (`{colors.on-primary}` `#FFFFFF`): texto e iconos sobre el
  azul. Prohibido naranja sobre azul (vibración visual).

### Secondary

- **Tinta Activa** (`{colors.surface-tint-blue}` `#EBF2FA`): la variante de
  luz del azul para fondos de pills/badges activos, días "hoy" del calendario
  y cuadros leading tintados de settings. Es descanso del ojo, no decoración.

### Neutral

- **Papel Bond** (`{colors.neutral-bg}` `#F8F9FA`): fondo de pantalla;
  ligeramente perla para que las tarjetas destaquen por tono, no por borde.
- **Blanco Documento** (`{colors.neutral-surface}` `#FFFFFF`): tarjetas,
  inputs, modales, tab bar flotante.
- **Gris Institucional** (`{colors.neutral-text-primary}` `#413D3C`):
  títulos y datos principales.
- **Gris Metadato** (`{colors.neutral-text-secondary}` `#7A7574`): subtítulos,
  aulas, profesores, timestamps. La atenuación se logra con luminosidad,
  nunca reduciendo tamaño de fuente.
- **Borde Sutil** (`{colors.neutral-border}` `#E8E8E8`): divisores
  hairline y delimitación sin líneas duras.
- **Borde Fuerte** (`{colors.neutral-border-strong}` `#D1D1D4`): contornos de
  selects que deben ser visibles (selector de período).

### Semáforo (estado de datos)

- **Success** (`{colors.success}` `#2E7D32`), **Warning** (`{colors.warning}`
  `#FF7A00`), **Danger** (`{colors.danger}` `#C62828`): notas de estado,
  badges Aprobada/Reprobada, cierre de sesión. En notas aprobadas la UI de
  Clases/Historial usa el azul sello (`{colors.primary}`) en vez del verde:
  el verde queda para estados de sistema (badge, helpers).

### Named Rules

**La Regla del Sello Único.** El azul de acción aparece en ≤10% de cada
pantalla: se usa para aquello sobre lo que la estudiante puede actuar o lo que
confirma su identidad; su rareza es la que hace que se vea.

**La Regla Naranja Exclusiva.** `#FF7A00` es solo para puntos de
notificación, indicadores urgentes y puntos de estado del calendario — nunca
tipografía, iconos de navegación ni rellenos decorativos.

## Typography

**Única fuente:** Montserrat (400 Regular · 500 Medium · 600 SemiBold · 700
Bold, cargada con `@expo-google-fonts/montserrat`).

**Character:** geométrica, administrativa y amable — la fuente de una
universidad que firma, no la de una startup que grita.

### Hierarchy

- **Headline** (600 · 28/34): título de pantalla ("Clases", "Agenda",
  "Perfil") en el header de contenido; cifras puntuales con 700.
- **Title** (600-700 · 22/28): títulos de detalle, cifras grandes de
  "Acumulada", fecha del carnet.
- **Subtitle** (600 · 18/24): títulos de sección ("Materias en curso") y
  selectores de mes.
- **Body** (400, medium 500 para nombres de materia · 16/24): datos
  principales, párrafos de descripción.
- **Label** (400/500 · 14/20): labels de inputs, texto denso secundario.
- **Caption** (400-600 · 12/16): códigos de materia (`MAT-301`), horarios,
  aulas, timestamps y todo metadato.

La escala avanza en pares de 2px (o múltiplos de 4 en interlineado); 12px es
el piso absoluto, solo para metadatos.

### Named Rules

**La Regla del Peso Reservado.** Montserrat Bold en mayúsculas sostenidas es
del logotipo institucional y de nada más; los títulos se escriben en
Title/Sentence Case para conservar la calma del registro.

## Layout

Sistema de 4px con progresión nombrada (xs 4 → xxl 32). **Regla de
proximidad**: el espacio entre elementos de un grupo es menor que el que
separa grupos (cards separadas por `{spacing.md/lg}`–`{spacing.xl}` entre
secciones). **Regla de peso óptico**: en tarjetas/botones, el padding vertical
es siempre menor que el horizontal.

- **Canva:** móvil única (teléfono); sin diseño responsive de escritorio. La
  pestaña web de Expo es preview de desarrollo, no target de diseño.
- **Pantalla:** padding lateral `{spacing.lg}` (16); header de contenido con
  `paddingTop: insets.top + 16` (los tabs usan `headerShown: false` y dibujan
  su propio header claro — headline + campana).
- **Bottom:** ninguna lista termina en el borde; el contenido respeta
  `layout.bottomTabInset` (88px) para la tab bar flotante.
- **Densidad:** naturaleza lista = filas con separadores hairline dentro de
  UNA tarjeta (historial); naturaleza catálogo = tarjetas apiladas con gap
  (materias en curso, próximos eventos).

## Elevation & Depth

**Lifted estructural.** La profundidad se construye con tres voces: contraste
tonal (blanco sobre papel bond), sombra neutra compuesta y el resplandor claro
del borde superior. La sombra es estructura —dice "esto es un documento"—, no
efecto flotante dramático.

### Shadow Vocabulary

La RN compone las dos drop shadows del spec Figma en una sola sombra neutral
`#000000`; el resplandor superior es un borde blanco translúcido de 1px
(`highlight` del theme, α 19–44% según nivel):

- **`elevation.sm`** (opacity .14 · blur 4 · y2 · native 2): tarjetas al
  reposo, botones circulares de back/share.
- **`elevation.md`** (opacity .18 · blur 8 · y4 · native 6): tab bar
  flotante, pills activos.
- **`elevation.lg`** (opacity .22 · blur 12 · y6 · native 10): modales y el
  carnet.

### Named Rules

**La Regla Sin Línea Negra.** Ninguna línea negra ni borde sólido delimita
grupos: la separación es contraste tonal y sombra; los hairlines existen solo
DENTRO de una tarjeta (divisor entre filas) y son `#E8E8E8` de 1px lógico.

## Shapes

Esquinas vivas pero contenidas: tarjetas `{rounded.card}` (20), botones
`{rounded.button}` (16), inputs `{rounded.input}` (12), e íconos tintados de
leading `{rounded.lg}` (12) `{rounded.md}` (8). Todo lo que es identidad
compacta (badges de código de materia, chips, punto de notificación) es pill
(`{rounded.pill}`). Las cajas de datos del carnet y las columnas de cortes no
aplanan elementos; la geometría repetida es la del documento: rectángulos
blancos con esquinas suaves y división por barra vertical color-estado (barra
lateral 3px).

## Components

### Buttons (ThemedButton)

- **Shape:** radius `{rounded.button}` (16); alturas sm 40 · md 48 · lg 56.
- **Primary:** fondo `{colors.primary}`, texto `{colors.on-primary}`, peso
  medium; spinner nativo en `isPending`.
- **Secondary:** fondo blanco, texto azul, mismo shape; para acciones de
  apoyo (Editar, Reintentar).
- **Ghost:** transparente; solo en contextos de apoyo no críticos.

### Chips

- **Style:** pill; seleccionada = `{colors.surface-tint-blue}` + texto azul
  semibold (variant `sunken`); sin seleccionar = tarjeta blanca (variant
  `elevated`).
- **State:** el cambio de variante tonal ES el estado; sin bordes de
  activación.

### Cards / Containers (Card / PressableCard)

- **Corner Style:** `{rounded.card}` (20).
- **Background:** `{colors.neutral-surface}` (blanco).
- **Shadow Strategy:** `elevation.sm` + `highlight` superior blanco (ver
  Elevation).
- **Border:** ninguno por defecto; selects usan hairline
  `{colors.neutral-border}` y estado de error/éxito cambia el borde.
- **Internal Padding:** `{spacing.lg}` (16), vertical `{spacing.md/lg}` (regla
  de peso óptico).

### Inputs / Fields (TextField)

- **Style:** fondo blanco, borde hairline `{colors.neutral-border}`, radius
  `{rounded.input}`, altura mínima 44.
- **Focus:** el borde pasa a `{colors.primary}` (sin glow).
- **Error:** el borde pasa a `{colors.danger}` y aparece caption rojo bajo el
  campo; hint en caption `{colors.neutral-text-secondary}`.

### Navigation

- **Tab bar flotante (firmas):** pill blanca absoluta (alto 72,
  `{rounded.pill}`, `elevation.md`, márgenes 8–24 según plataforma) con 5
  items: icono Phosphor duotone 26 + caption Montserrat; activo = azul sello
  + semibold, inactivo = `{colors.neutral-text-primary}`.
- **Headers de tab:** en contenido; `headline` 600 "Papel Bond" + campana
  `CampanaConBadge` (bell Phosphor, punto naranja `{colors.accent.urgent}`
  con unread > 0); navegación a detalle con botón circular blanco flotante
  (40px, `elevation.sm`, icono `ArrowLeft` azul institucional) + título
  centrado `subtitle` 600.

### Signatures

- **CampanaConBadge:** campana Phosphor 24 sobre contenido claro (tono
  `claro`) o sobre azul (blanca); punto naranja absoluto 8px cuando hay
  no leídas.
- **Tarjetas de estado (Materia/Evento):** fila con bloque de fecha (día en
  cifras 22 bold + mes caption) precedida de barra lateral vertical 3px color
  de estado (azul OFICIAL / gris PERSONAL / rojo…) — la firma visual de
  "esto es un documento con estado".
- **Grid de calendario (GridMes):** celdas cuadradas flex (aspectRatio 1,
  margen 1), cabecera LUN–DOM en caption semibold gris institucional;
  seleccionado = fondo azul sello con texto blanco (la selección gana sobre
  "hoy"); "hoy" = `{colors.surface-tint-blue}`; días de otro mes = cifra en
  `{colors.neutral-text-secondary}`, no interactivos; punto 5px por evento.

## Do's and Don'ts

### Do:

- **Do** dibujar headers de tab en contenido (headline + campana) con
  `headerShown: false` y `paddingTop: insets.top + 16`.
- **Do** usar los tokens de `theme.ts` siempre; valor exacto → token →
  componente, en ese orden de reuso.
- **Do** colorear notas de datos con el semáforo real: aprobada (azul sello
  en Clases/Historial) · reprobada/sin permiso (rojo) · sin calificar (gris
  metadato).
- **Do** separar grupos con gap del sistema (12/16/24) y nunca apilar más de
  una tarjeta por fila de datos.
- **Do** mantener targets ≥ 44pt (`touchTarget.min`) y
  `accessibilityRole`/`accessibilityLabel` en cada botón de icono.

### Don't:

- **Don't** usar el naranja `{colors.accent-urgent}` fuera de badges de
  notificación y puntos de calendario (Regla Naranja Exclusiva).
- **Don't** usar Montserrat Bold en mayúsculas sostenidas fuera del logo
  institucional.
- **Don't** inventar datos visuales sin respaldo del API (asistentes/RSVP de
  eventos, feriados, fotos de perfil) — el producto es un proxy de verdad.
- **Don't** construir sombras ad-hoc fuera del vocabulario
  `elevation.sm/md/lg` + `highlight` del theme.
- **Don't** borrar los guards `Platform.OS === 'web'` ni diseñar pantallas
  que dependan de persistencia o push en la pestaña web.
- **Don't** crear headers nativos azules en las tabs (el header claro del
  contenido es la convención aprobada).
