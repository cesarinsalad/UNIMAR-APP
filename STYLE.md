# STYLE.md — Guía de Diseño UI UNIMARapp

Este documento establece las directrices visuales y de accesibilidad para el desarrollo del frontend de la aplicación móvil de la Universidad de Margarita (UNIMAR). El diseño fusiona una experiencia de usuario (UX) centrada en el estudiante con una identidad corporativa sobria y estricta.

## 1. Sistema de Color y Accesibilidad

La paleta se rige por los lineamientos corporativos institucionales y principios de accesibilidad modernos. Los tokens se nombran de forma semántica y se espejan 1:1 en `mobile/src/shared/ui/theme.ts`.

### 1.1 Tokens de marca (Brand)

* `brand/primary` — **Azul Corporativo `#0D4D98`**: botones de acción principal, encabezados superior y avatares de iconos.


* `brand/on-primary` — **Blanco Puro `#FFFFFF`**: texto e iconos obligatorios sobre el Azul Corporativo. Prohibido el uso de naranja sobre azul para evitar la vibración visual.


* `brand/surface-blue` — **`#EBF2FA`**: variante del azul con alta luminosidad, para pills y fondos de etiquetas activas.

### 1.2 Neutros (superficies y texto)

* `bg/canvas` — **`#F8F9FA`**: fondo general de la pantalla, ligeramente separado del blanco puro para que las tarjetas destaquen por contraste tonal.


* `bg/surface` — **`#FFFFFF`**: fondo de tarjetas, modales y entradas de texto (inputs).


* `border/subtle` — **`#E8E8E8`**: borde sutil para delimitar tarjetas sin recurrir a líneas negras o trazos sólidos.


* `text/primary` — **Gris Oscuro Institucional `#413D3C`**: títulos y datos principales.


* `text/secondary` — **`#7A7574`**: subtítulos, aulas, nombres de profesores y metadatos. La atenuación de textos secundarios se logra restando luminosidad, nunca reduciendo el tamaño de la fuente.

### 1.3 Acento (urgencias)

* `accent/urgent` — **`#FF7A00`**: reservado con exclusividad para puntos de notificación (badges), indicadores urgentes y puntos de estado del calendario. **Nunca** en tipografía, íconos de navegación ni rellenos decorativos.

## 2. Tipografía y Jerarquía

El manejo tipográfico representa el núcleo de la jerarquía visual del portal.

* **Fuente única:** **Montserrat** se usa en toda la aplicación (títulos, cuerpo y datos). Los estilos definidos aquí se espejan en `typography` de `theme.ts`; la fuente se carga en el arranque mediante `@expo-google-fonts/montserrat`.

* **Title/Sentence Case:** Los títulos se escriben siempre en *Title Case* o *Sentence Case*. Queda **estrictamente prohibido** el uso de Montserrat Bold en mayúsculas sostenidas en la interfaz: ese formato está reservado con carácter de exclusividad para el logotipo institucional.

### 2.1 Estilos tipográficos (tokens)

| Token | Tamaño / Interlineado | Peso | Uso |
| --- | --- | --- | --- |
| `headline` | 28px / 34px | Bold | Resaltados y cifras puntuales |
| `title` | 22px / 28px | Bold / SemiBold | Título de pantalla |
| `subtitle` | 18px / 24px | SemiBold | Título de sección |
| `body` | 16px / 24px | Regular | Body/Default: párrafos, descripciones, datos principales |
| `bodySm` | 14px / 20px | Regular / Medium | Texto denso secundario, labels de inputs |
| `caption` | 12px / 16px | Regular | Metadatos: horarios, aulas, códigos (`MAT-401`), timestamps |

* **Escalado en pares:** Todos los tamaños avanzan en pasos de 2px (o múltiplos de 4 en interlineado), garantizando progresión matemática de la jerarquía.

* **Pesos:** Regular para lectura, Medium (500) para énfasis suave (nombres de asignaturas, labels de botón) y SemiBold (600)/Bold (700) exclusivamente para títulos. El abuse del SemiBold en el cuerpo destruye la jerarquía de los encabezados.

* **Legibilidad:** La escala de 2 en 2 parte de 12px como mínimo absoluto (solo metadatos); 16px es el cuerpo por defecto para asegurar lectura cómoda de datos académicos.


* **Agrupación Visual:** El espacio entre un título y su contenido descriptivo se controla mediante el interlineado (`line-height`) en lugar de depender de márgenes manuales, conectando visualmente la información. Para reducir el énfasis de textos secundarios, se debe atenuar su color disminuyendo la luminosidad en lugar de cambiar el tamaño de la fuente.



## 3. Espaciado (Sistema 4px / 0.25rem)

El espaciado se utiliza activamente para agrupar elementos relacionados y separar contextos diferentes en la interfaz.

* **Escala estandarizada:** Incrementos constantes de `0.25rem` (4px), referenciados por nombre semántico (espejados en `spacing` de `theme.ts`):

| Token | Valor | Uso típico |
| --- | --- | --- |
| `xs` | 4px | Espacio interno entre un icono y su texto descriptivo |
| `sm` | 8px | Separación entre el título de una clase y su profesor/aula |
| `md` | 12px | Padding vertical de tarjetas y botones |
| `lg` | 16px | Padding horizontal de tarjetas, márgenes laterales de pantalla, gap entre ítems de lista |
| `xl` | 24px | Separación entre secciones distintas (ej. bloque de materias ↔ comunicados) |

* **Regla de oro 1 — Peso óptico:** El padding interno responde al peso óptico: en botones y tarjetas, el padding vertical siempre es menor que el horizontal.

* **Regla de oro 2 — Proximidad:** El espacio entre elementos de un mismo grupo debe ser menor que el espacio que separa a grupos distintos. El espacio vacío entre dos grupos de tarjetas distintos siempre es mayor que el espacio interno de los elementos que componen una sola tarjeta.

* **Estructura de Botones:** La separación interna entre un icono y el texto del botón es siempre menor que el padding exterior hacia los bordes.



## 4. Profundidad, Sombras y Capas

La aplicación prescinde de divisiones rígidas o líneas negras, generando estructura mediante el uso de luz y sombras para indicar interactividad.

* **Niveles de Elevación (Tokens):** Las sombras se definen centralizadamente en `elevation` de `theme.ts`, con nombres semánticos: `sm` para tarjetas estáticas, `md` para elementos flotantes (chips, pills activos) y `lg` para modales. El nivel dicta la importancia del elemento.

* **Especificación Figma (estilos de sombra):** Cada nivel combina dos drop shadows neutras (negro al 8% y 19%) más un inner shadow de iluminación superior (`#FFFFFF` al 19–44%):

| Token | Drop shadow 1 | Drop shadow 2 | Inner shadow |
| --- | --- | --- | --- |
| `small` | Y 2 · B 4 · 8% | Y 1 · B 2 · 19% | Y 1 · B 2 · 19% |
| `medium` | Y 4 · B 8 · 8% | Y 2 · B 4 · 19% | Y 1 · B 2 · 31% |
| `large` | Y 6 · B 10 · 8% | Y 4 · B 6 · 19% | Y 1 · B 2 · 44% |

* **Aproximación en React Native:** RN nativo solo renderiza una sombra por vista. La implementación en `theme.ts` compone ambas drop shadows en una sombra neutral (`#000000`) única equivalente; el inner shadow de iluminación superior se simula con un resplandor claro (borde superior sutil) dentro del componente `Card`. No se deben importar librerías de sombras múltiple para esto.

* **Escala Tonal:** Diferenciar fondo principal (`bg/canvas #F8F9FA`) de contenedores superpuestos (`bg/surface #FFFFFF`) y superficies tintadas (`brand/surface-blue #EBF2FA`) alterando la luminosidad, en lugar de usar trazos sólidos.

* **Iluminación Realista:** Las tarjetas y botones principales logran un efecto tridimensional sutil combinando el resplandor claro en el borde superior con la sombra direccional en el inferior. Las separaciones de secciones se logran mediante el contraste tonal de estos fondos.