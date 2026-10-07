# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

(omitido — el código existente lo responde: mobile es React Native + Expo SDK 57 /
RN 0.86 + Expo Router con axios/React Query; backend es un BFF Express +
TypeScript + PostgreSQL con Supabase y RLS.)

## Users

Estudiante activo de la Universidad de Margarita (UNIMAR) — consulta en su
teléfono sus materias y notas por trimestres, comunicados/noticias del campus,
agenda de eventos y notificaciones push con deep-links. Otras audiencias parte
del mismo producto: COMUNICADOR (equipo de comunicaciones de cada decanato —
publica y gestiona comunicados y eventos oficiales) y ADMIN (gestiona audiencias
y moderación). Medida principal de éxito: el estudiante encuentra su clase y su
próxima evaluación en menos de 2 toques.

## Product Purpose

Aplicación móvil (no oficial) que centraliza la vida académica del estudiante
UNIMAR: materias y notas (proxy a la API académica institucional), comunicados
del campus, agenda de eventos personales y oficiales, y bandeja de
notificaciones push. Éxito = confianza en datos correctos y actualizados para
el estudiante + comunicación institucional que llega a tiempo (in-app + push).

## Positioning

Integración exclusiva con la API académica institucional de UNIMAR
(materias/notas/pénsum/historial médico) fusionada con la comunicación del
campus (roles + RLS + notificaciones push con deep-link). Ningún otro
instrumento del campus combina ambas fuentes con granularidad por-estudiante y
el calendario de trimestres UNIMAR.

## Operating Context

- Trimestres UNIMAR: Enero–Abril · Abril–Julio · Septiembre–Diciembre
  (wire "2026-2" → etiqueta "Trimestre Abril-Julio 2026").
- Escala de notas UNIMAR 0–20; aprobado ≥ 10. El carnet NO se emite por la
  app: todo artefacto de carnet es estético y lleva disclaimer explícito.
- Roles decididos por la base (RBAC en el BFF + RLS/Supabase — segunda
  barrera), no por la UI: ESTUDIANTE < COMUNICADOR < ADMIN. Regla de
  integridad: el diseño no dibuja affordances ni datos que el backend no
  respalda (asistentes/RSVP de eventos y feriados NO existen — no fabricarlos).
- Docs operativos: AGENTS.md / STYLE.md / docs/onboarding-frontend.md
  (contrato API + usuarios mock) / docs/e2e-notificaciones.md /
  docs/guia-expo-go.md.

## Capabilities and Constraints

- Módulos backend: identidad, comunicaciones, calendario, académico,
  notificaciones; cada feature móvil espeja 1:1 su módulo (fronteras
  estrictas — features nunca se importan entre sí; lo común vive en
  `mobile/src/shared/`).
- Wire mixto snake/camelCase en académico (`es_actual`, `nota_final` vs
  `semestreSugerido`): los DTOs espejan el contrato literal, sin normalizar.
- Mock académico activo con `UNIMAR_API_URL` vacío (latencia simulada 300 ms);
  el mock ignora el filtro `periodo` — no construir UI que dependa de que
  filtre servidor-side.
- Push: mock (graba RP en consola del BFF) o expo; Expo Go no recibe push
  remoto (requiere dev build EAS).
- Web = segunda-clase a propósito (sin SecureStore persistente, sin push):
  los guards `Platform.OS === 'web'` existentes no se destruyen.
- Validación mobile: `typecheck` → `lint` → `jest` (jest-expo) → bundle.
- decidedly-open: RSVP/asistentes y categorías/feriados de eventos quedan
  fuera del alcance actual (el usuario los retoma "si da tiempo"); sin
  pantallas para "Seguridad y Acceso" ni "Reglamentos y Soporte".

## Brand Commitments

- "UNIMARapp" (app) / "UNIMAR" (universidad) — nombre no negociable.
- Montserrat es la fuente única del UI (`@expo-google-fonts/montserrat`),
  con los compromisos de STYLE.md §2: prohibido Bold en mayúsculas
  sostenidas (reservado al logotipo institucional); títulos en
  Title/Sentence Case.
- Azul corporativo `#0D4D98` = acción primaria e identidad;
  `accent/urgent` `#FF7A00` reservado a puntos de notificación/estado
  (nunca tipografía ni rellenos decorativos).
- Navegación: tab bar flotante tipo pill, 5 tabs fijas — Inicio · Noticias ·
  Clases · Agenda · Perfil.
- Los mocks Figma del usuario (Clases, Agenda, Agregar Evento, Detalles,
  Perfil) son contratos de diseño aprobados.

## Evidence on Hand

- Mockups Figma aprobados de Clases, Agenda, Agregar Evento, Detalles de
  Evento y Perfil (provistos por el usuario en las conversaciones de trabajo).
- Usuarios mock reales: ana.estudiante@ / bruno.otra@ / flavio.rosales@
  (COMUNICADOR) / cgarcia.5516@ (ADMIN) en `@unimar.edu.ve`, todos con
  password `unimar123` — en docs/onboarding-frontend.md.
- Ausencias que el trabajo futuro NO debe fabricar: fotografías de
  perfil/avatares (la API no provee imágenes — iniciales en su lugar),
  logo vectorial institucional, testimonios o métricas de adopción.

## Product Principles

1. Proxy de verdad antes que pantalla bonita: cada elemento de UI que
   promete un dato lo obtiene de la API; sin fabricación (los mocks son
   dev-fallbacks marcados, no pantallas de mentira).
2. La vida del estudiante se organiza por trimestre UNIMAR y materia —
   nunca por "semestre genérico".
3. La profundidad institucional es una capa, no una máscara: los permisos
   y audiencias se muestran como son (roles reales, RLS decide), sin
   disfrazar la experiencia staff dentro del look estudiante.
4. Sistema de diseño cerrado: tarjeta blanca sobre canvas gris
   institucional, azul UNIMAR solo para acción/identidad, escala
   tipográfica 2-en-2 de Montserrat — STYLE.md y `theme.ts` ganan.

## Accessibility & Inclusion

- Objetivos táctiles ≥ 44pt (`touchTarget.min` de theme.ts);
  `accessibilityLabel`/`accessibilityRole` en botones-ícono y tabs.
- Deuda reconocida (no establecida aún como requerimiento de producto):
  Dark Mode no implementado; las guías nativas iOS/Android (platform
  adaptive) lo tratarán como esquema de primera clase en la siguiente
  pasada de diseño.
