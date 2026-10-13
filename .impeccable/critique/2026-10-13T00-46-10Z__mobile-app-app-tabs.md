---
target: pantallas principales de la app (5 tabs + login)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/cesarinsalad/dev/UNIMARapp/mobile/app/(app)/(tabs)"
timestamp: 2026-10-13T00-46-10Z
slug: mobile-app-app-tabs
---
# Critique — pantallas principales UNIMARapp (5 tabs + login)

⚠️ DEGRADED: single-context (no sub-agent tool exposed) — Assessment A (review de diseño) y Assessment B (detector) corridos en secuencia en este contexto, no en sub-agentes aislados.

## Design Health Score

| # | Heurística | Score | Hallazgo clave |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | 3 | Spinner por sección (CargandoSeccion), pull-to-refresh con tinte azul, "Cargando más..." en Agenda; pero Clases carga con texto plano "Cargando clases..." — inconsistente con el spinner del resto |
| 2 | Match con el mundo real | 4 | es-VE nativo (Intl en todo), "Trimestre" no "Semestre", escala 0–20, lenguaje sereno de registro |
| 3 | Control y libertad del usuario | 3 | Back circular en detalles, cancelar en logout, chips reseteables con "Todas"; sin undo para acciones menores |
| 4 | Consistencia y estándares | 4 | Tokens en todas partes, UNA receta de evento (TarjetaProximoEvento) repetida como firma, HeaderTab idéntico en las 5 tabs; única fisura: la diferenciación de icono activo/inactivo de la tab bar nunca se ejecuta (ternario muerto) |
| 5 | Prevención de errores | 3 | Validación de login en cliente, confirmación Alert para cerrar sesión, espejos Zod del BFF |
| 6 | Reconocimiento antes que recuerdo | 3 | Tabs con ícono+label, chips etiquetadas, campana con badge; sin búsqueda en ninguna lista |
| 7 | Flexibilidad y eficiencia | 2 | Sin búsqueda (noticias/agenda/historial); filtros = 4 chips + selector de período; deep-links push como único acelerador |
| 8 | Estética y diseño minimalista | 3 | Disciplinado y sin ruido, pero monótono: la contención que calma es también la que adormece (ver P1-1) |
| 9 | Recuperación de errores | 3 | Mensajes claros ("El servidor no responde. Intenta de nuevo en unos minutos.") + Reintentar en azul |
| 10 | Ayuda y documentación | 2 | Sin ayuda in-app; empty states explican bien; "¿Olvidaste tu contraseña?" enlaza al portal web |
| **Total** | | **30/40** | **Good — base sólida, áreas débiles por dirigir** |

## Veredicto de especificidad de diseño

**Assessment LLM**: El sistema está "authored" — Montserrat única, sello azul con reglas propias (Sello ≤10%, Naranja exclusivo), motivo "documento con estado" (bloque de fecha + barra lateral 3px, file-rule). Pero la especificidad vive en las REGLAS más que en las PANTALLAS: quitando el copy (skeleton test), las 4 tabs de contenido son indistinguibles entre sí — la misma procesión de rectángulos blancos elevation.sm radius 20 sobre #F8F9FA. La identidad a plena voz solo existe en dos momentos: el login (canvas azul completo) y la ProximaClaseCard del Home. Después del login, el sello baja a susurros: chevrons de 22px, "Ver más" de 14px, badges diminutos. Ese es el diagnóstico del "dull": no es falta de sistema, es el sistema racionándose por debajo de sus propias reglas (la Regla del Sello permite hasta 10% por pantalla; la ejecución ronda 2–4% en Noticias/Clases/Agenda/Perfil).

**Scan determinístico**: `impeccable detect` sobre `mobile/app/(app)/(tabs)` + `mobile/src/shared/ui` + `mobile/src/features` — 0 findings (exit 0). Sin overlay visual: app nativa React Native/Expo sin tool de browser automation expuesto; la verdad visual son las 6 capturas provistas (login + 5 tabs), verificadas contra el código leído.

## Impresión general

Lo que funciona funciona de verdad: hay un sistema, se respeta, y el Home responde la pregunta del estudiante antes de que la haga. El problema no es falta de diseño — es que el diseño se auto-censura: el "dull" que sientes es la distancia entre la voz del login (azul completo, la pantalla más viva de la app) y las tabs (blanco sobre gris con acentos de 14px). La mayor oportunidad: desplegar el vocabulario que ya te pertenece — sello, surfaceBlue, file-rule, cifras grandes — a la intensidad que tus propias reglas permiten.

## Lo que funciona

1. **Disciplina de sistema real**: tokens en todas partes, UNA receta de evento repetida en Inicio/Noticias/Agenda (la repetición como firma), reglas del sello/naranja respetadas en el código, no solo en la doc.
2. **El Home jerarquiza de verdad**: tarjeta azul de próxima clase arriba (la respuesta en 0 toques), saludo con nombre, campana con triage real ("9+").
3. **Base de accesibilidad honesta**: roles/labels en casi todos los controles, selected state en la tab bar, empty states que explican el futuro ("Cuando tu decanato publique comunicados, aparecerán aquí") sin dramatismo.

## Priority Issues

### [P1] Ritmo monótono — las tabs fallan el skeleton test
- **What**: las 5 tabs son la misma procesión de tarjetas blancas idénticas (elevation.sm, radius 20, gap 12/24); sin picos ni valles; el azul ejecuta al 2–4% de pantalla cuando la regla permite 10%.
- **Why it matters**: el "dull" que sientes; nada compite, pero tampoco nada señala; una app de otra universidad podría usar estas tabs sin cambiar nada.
- **Fix**: un pico por pantalla con vocabulario PROPIO del sistema: anclas de sección con la banda surfaceBlue o el file-rule que ya existe; la "Acumulada" de Clases a escala display; el día seleccionado de Agenda ya lo hace bien (celda azul) — extender esa convicción al resto.
- **Suggested command**: /impeccable bolder

### [P1] Cero movimiento + icono activo que nunca activa
- **What**: sin pressed states en las tarjetas principales (solo Perfil tiene opacity 0.85), sin transiciones; y el ternario del tabBarIcon renderiza duotone en ambas ramas — la diferenciación activo/inactivo planeada nunca existió (app/(app)/(tabs)/_layout.tsx:99–170).
- **Why it matters**: el tacto no confirma nada (también toca la heurística 1); una UI estática lee "dull" más que cualquier paleta; el bug del icono niega feedback de posición en la nav principal.
- **Fix**: pressed feedback (escala/tono) en PressableCards, peso bold/fill para el icono enfocado, transiciones de cambio de chip/mes.
- **Suggested command**: /impeccable animate (o el skill animate-expo)

### [P2] Targets táctiles < 44pt en la navegación de mes
- **What**: carets de 22px y plus de 24px de Agenda sin hitSlop ni padding de frame (calendario/index.tsx:115–135); viola touchTarget.min=44 del propio theme.
- **Why it matters**: zona de error para el pulgar apurado; inconsistente con el estándar que la app se fija a sí misma.
- **Fix**: frame de 44+ (padding o hitSlop) en los tres botones.
- **Suggested command**: fix directo en /impeccable polish

### [P2] El carrusel del Home se apaga sin imagen
- **What**: NoticiaCard sin portada = rectángulo plano surfaceBlue mudo, sin icono ni señal; con 5 noticias sin imagen, la segunda sección más vista de la app es una fila de rectángulos anónimos.
- **Why it matters**: el placeholder niega la affordance de "esto es una noticia"; la sección cae bajo el estándar de la Destacada (full-bleed + gradiente).
- **Fix**: placeholder con IconTile duotone + Badge de categoría (ambos ya existen en el sistema); meta relativa con haceRelativo (ya existe en lib/tiempo).
- **Suggested command**: /impeccable bolder

### [P2] El grid del calendario es mudo para lectores de pantalla y para el daltonismo
- **What**: celdas sin accessibilityLabel contextual, estado seleccionado no anunciado, punto de evento azul/naranja = significado solo por color (GridMes.tsx).
- **Why it matters**: el lector de pantalla pierde la función central de la Agenda (qué días tienen eventos); el semántico OFICIAL/PERSONAL no existe sin color.
- **Fix**: label por celda ("14 de octubre, 2 eventos"), accessibilityState selected, texto alternativo en la leyenda.
- **Suggested command**: /impeccable audit + /impeccable harden

## Persona Red Flags

**Casey (móvil distraído)**: La navegación de mes en Agenda usa carets de 22px y plus de 24px sin hitSlop — targets ~22–30px, bajo el mínimo de 44pt que el propio theme declara (touchTarget.min). El resto está bien ubicado: contenido arriba, tab bar flotante en zona de pulgar.

**Sam (accesibilidad)**: Base excelente — accessibilityRole/Label en casi todo, accessibilityState selected en la tab bar. Falla el grid del calendario: celdas sin label contextual, selección no anunciada, punto de evento solo por color. Pendiente verificar contraste AA del texto secondary sobre surfaceBlue en audit.

**Ana (persona del proyecto — estudiante entre clases, de PRODUCT.md)**: "Próxima clase" resuelto en 0 toques extra (tarjeta azul arriba del Home: excelente). Pero la métrica de éxito "próxima evaluación en <2 toques" no tiene dónde cumplirse: los cortes no exponen fecha en el wire (nombre/ponderación/nota) — el Home no puede prometer lo que la API no respalda. Dato para la tesis, no para fabricar.

## Minor Observations

- "Ver más →" usa el carácter flecha en texto en vez de icono Phosphor — único desvío del sistema de iconos.
- fileRule hardcodea radius 20 (perfil.tsx, TarjetaHistorial.tsx) en vez del token radius.card.
- Chips de Noticias mezclan spacing.two (alias legacy) con tokens semánticos en el mismo archivo.
- "Bienvenido, Ana!" hardcodea género en el saludo; "¡Hola, Ana!" (o el truco unisex "unimarista" del login) lo esquiva.
- 5 ternarios idénticos muertos en _layout.tsx (ambas ramas renderizan lo mismo) — código duplicado + intención perdida.
- Clases carga con texto plano mientras el resto usa CargandoSeccion.
- Dark mode no implementado (deuda reconocida en PRODUCT.md; las guías nativas iOS/Android lo tratan como primera clase en la próxima pasada).

## Questions to Consider

- ¿Qué pasaría si cada pantalla tuviera UN momento azul a la escala del login — el sello a plena voz, no en susurros de 14px?
- Si la API expusiera fechas de cortes, ¿qué lugar merece la "próxima evaluación" en el Home? La métrica de éxito del producto hoy no tiene pantalla.
- ¿"Registro institucional sereno" tiene que significar también quieto al tacto? ¿Qué se movería si la tocaras?
- Skeleton test: ¿podrías distinguir tus tabs por su silueta sin leer el texto?
