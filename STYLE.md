# STYLE.md — Guía de Diseño UI UNIMARapp

Este documento establece las directrices visuales y de accesibilidad para el desarrollo del frontend de la aplicación móvil de la Universidad de Margarita (UNIMAR). El diseño fusiona una experiencia de usuario (UX) centrada en el estudiante con una identidad corporativa sobria y estricta.

## 1. Sistema de Color y Accesibilidad

La paleta se rige por los lineamientos corporativos institucionales y principios de accesibilidad modernos, priorizando el formato OKLCH o HSL para manipular la luminosidad y generar consistencia.

* **Azul Corporativo (`#0D4D98`):** Color primario (RGB: 13, 77, 151 / CMYK: 98, 72, 6, 0). Se utiliza exclusivamente para el fondo del *header* superior, botones de acción principal y avatares de iconos.


* **Blanco Puro (`#ffffff`):** Fondo principal y color de texto obligatorio sobre el Azul Corporativo.


* **Gris Claro (`#e8e8e8`):** Se utiliza para separaciones sutiles de tarjetas y bordes.


* **Gris Oscuro (`#413D3C`):** Color principal para toda la tipografía de lectura y datos. Se mantiene la saturación en cero para los textos neutrales, variando únicamente su luminosidad para crear jerarquía.


* **Naranja (Acento):** Uso estrictamente restringido a indicadores urgentes, burbujas de notificaciones (badges) y puntos de estado en el calendario. **Nunca** se debe utilizar para tipografía.
* **Regla de Contraste Estricta:** Todo texto o icono sobre el Azul Corporativo debe ser Blanco Puro (`#ffffff`); queda prohibido el uso de naranja sobre azul para evitar la vibración visual.

## 2. Tipografía y Jerarquía

El manejo tipográfico representa el núcleo de la jerarquía visual del portal.

* **Títulos (Headings):** Se utiliza la fuente corporativa **Montserrat**. Deben escribirse siempre en *Title Case* o *Sentence Case*. Queda **estrictamente prohibido** el uso de Montserrat Bold en mayúsculas sostenidas en la interfaz, ya que este formato está reservado con carácter de exclusividad para el logotipo institucional.


* **Cuerpo y Datos (Body):** Se utilizan fuentes nativas del sistema, **SF Pro** (iOS) o **Roboto** (Android), para mostrar datos académicos, horarios y mensajes, garantizando una lectura limpia.
* **Escala Tipográfica:** Se implementa un sistema simplificado de tres tamaños base, definiendo 14px o 16px como el tamaño estándar de lectura.


* **Agrupación Visual:** El espacio entre un título y su contenido descriptivo se controla mediante el interlineado (`line-height`) en lugar de depender de márgenes manuales, conectando visualmente la información. Para reducir el énfasis de textos secundarios, se debe atenuar su color disminuyendo la luminosidad en lugar de cambiar el tamaño de la fuente.



## 3. Espaciado (Sistema 4px / 0.25rem)

El espaciado se utiliza activamente para agrupar elementos relacionados y separar contextos diferentes en la interfaz.

* **Unidades Relativas:** Todo el espaciado y *padding* debe declararse utilizando `rem` para asegurar la escalabilidad correcta en diferentes dispositivos.


* **Incrementos Constantes:** El sistema escala estrictamente en bloques de `0.25rem` (4 píxeles) para mantener la consistencia matemática en toda la aplicación.


* **Regla de Proximidad:** El espacio vacío entre dos grupos de tarjetas distintos siempre debe ser mayor que el espacio interno de los elementos que componen una sola tarjeta. El diseño debe iniciar con separaciones amplias (ej. `1.5rem`) y reducirse gradualmente según sea necesario.


* **Estructura de Botones:** El *padding* vertical de los botones debe ser menor que el *padding* horizontal para respetar el peso óptico. La separación interna entre un icono y el texto del botón siempre será menor que el *padding* exterior hacia los bordes.



## 4. Profundidad, Sombras y Capas

La aplicación prescinde de divisiones rígidas o líneas negras, generando estructura mediante el uso de luz y sombras para indicar interactividad.

* **Niveles de Elevación (Tokens):** Las sombras se definen centralizadamente en variables globales mediante nombres semánticos como `shadow-sm` para tarjetas estáticas y `shadow-lg` para modales flotantes, dictando la importancia del elemento.


* **Escala Tonal:** Se generan de 3 a 4 matices del color base, alterando la luminosidad en saltos de `0.1` para diferenciar el fondo principal de los contenedores superpuestos.


* **Iluminación Realista:** Las tarjetas y botones principales logran un efecto tridimensional sutil al combinar un resplandor claro en el borde superior y una sombra direccional en el inferior. Las separaciones de secciones se logran mediante el contraste tonal de estos fondos en lugar de usar trazos sólidos.