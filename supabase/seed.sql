INSERT INTO roles (nombre) VALUES ('ESTUDIANTE'), ('COMUNICADOR'), ('ADMIN');

INSERT INTO decanatos (nombre) VALUES
  ('Estudios Generales'),         -- placeholders: ajustar a los reales de UNIMAR
  ('Humanidades, Artes y Educación'),
  ('Ciencias Económicas y Sociales'),
  ('Ciencias Jurídicas y Políticas'),
  ('Ingeniería y Afines');

-- Los roles no-estudiante se pre-aprovisionan: la API de UNIMAR no conoce
-- los roles de la app; el upsert de login NUNCA sobrescribe el rol.
INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES
  ('20123456', 'Ana Administradora', 'ana.admin@unimar.edu.ve',
     (SELECT id FROM roles WHERE nombre = 'ADMIN'), NULL),
  ('17420667', 'Flavio Rosales (Comunicador)', 'flavio.rosales@unimar.edu.ve',
     (SELECT id FROM roles WHERE nombre = 'COMUNICADOR'), 5),
  ('30065516', 'César García', 'cgarcia.5516@unimar.edu.ve',
     (SELECT id FROM roles WHERE nombre = 'ESTUDIANTE'), 5);

-- Comunicados sembrados ya PUBLICADOS (la aprobación ocurre fuera del seed:
-- los INSERT directos no disparan el bus de eventos ni push). Audiencia:
-- 0 filas en comunicado_audiencias = GLOBAL (toda la universidad).
-- Fuente: compilación oficial de carteleras y artículos UNIMAR.
INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, aprobado_por, publicado_at, categoria) VALUES
  ('Recital «EPIC: The Musical»', E'> *«De la gran epopeya clásica a un show musical inolvidable… ¡llegó tu momento de brillar!»*\n\nEl **American Corner** invita a toda la comunidad a participar en el Recital **«EPIC: The Musical»**, una muestra escénica y vocal fundamentada en la obra musical de Jorge Rivera-Herrans, inspirada en la epopeya clásica *La Odisea* de Homero.\n\nMediante la metodología de **«Aprendizaje Basado en el Arte» (ABA)**, los participantes integrarán las disciplinas escénicas con el aprendizaje del idioma inglés, fortaleciendo y demostrando fluidez, pronunciación y desenvolvimiento escénico.\n\n## Cronograma y participación\n\n- **Audiciones (La Odisea):** hasta el 30 de octubre.\n- **Audiciones (Categoría Libre, propuesta artística):** hasta el 5 de noviembre.\n- **Ensayos generales:** todos los viernes.\n- **Fechas del recital:** 17, 18 y 19 de noviembre.\n- **Lugar:** Sala de Conferencias II, UNIMAR.',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), 'PUBLICADO',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), now(), 'EVENTO'),
  ('Programa de Formación «Piensa como INGENIERO: Más allá del Código»', E'El Decanato de Ingeniería y Afines convoca al programa de formación tecnológica **«Piensa como INGENIERO: Más allá del Código»**, concebido como un espacio de análisis sobre los retos, metodologías y destrezas indispensables para sobresalir en el ecosistema y mercado tecnológico internacional.\n\nEsta sesión ofrece un balance estratégico entre el conocimiento técnico especializado y la visión global de negocio requerida por las principales corporaciones tecnológicas.\n\n## Ficha técnica\n\n- **Fecha:** Miércoles 07 de octubre, 12:00 m.\n- **Lugar:** Salón de Conferencias I, Campus UNIMAR.\n- **Acceso:** gratuito, con registro previo vía comunidad WhatsApp.\n\n## Ejes temáticos\n\n1. **Arquitecturas Cloud-Native:** dominio, despliegue y gestión de infraestructuras modernas en la nube.\n2. **Inteligencia Artificial:** implementación estratégica aplicada a la resolución de problemas y valor de negocio.\n3. **Habilidades Blandas y Product Mindset:** enfoque a producto, comunicación y adaptabilidad en entornos multidisciplinarios.',
     (SELECT id FROM usuarios WHERE cedula = '17420667'), 'PUBLICADO',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), now(), 'EVENTO'),
  ('Foro «Alianza por la Educación»', E'Invitación abierta para debatir las acciones y modelos orientados a renovar el sistema educativo venezolano. La jornada expone los alcances y proyectos de la plataforma **«Alianza por la Educación»**, coalición constituida desde 2023 por Fe y Alegría, UCAB, UNIMET, Universidad Monteávila, CERPE, EY Venezuela, Banco Mercantil y Fundación Empresas Polar.\n\n## Datos del encuentro\n\n- **Fecha:** Viernes 09 de octubre, 10:00 a.m.\n- **Lugar:** Sala de Conferencias II, UNIMAR.\n- **Entrada:** libre.\n\n## Ponentes invitados\n\n- **Santiago Perera:** Secretario General de la Universidad Metropolitana (UNIMET).\n- **Mariano Herrera:** Coordinador General del proyecto Alianza por la Educación.\n\n## Pilares del proyecto\n\n- Formación y actualización docente.\n- Educación orientada al trabajo y desarrollo productivo.\n- Escuela digital e infraestructura tecnológica.',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), 'PUBLICADO',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), now(), 'EVENTO'),
  ('Semana de la Salud Mental', E'En el contexto de la concientización psicológica integral, la Escuela de Psicología despliega una semana de sensibilización orientada a la salud mental, herramientas de estabilidad emocional y dinámicas de prevención comunitaria bajo la premisa:\n\n> *«Cuidar de tu mente es el primer paso para construir el futuro que deseas.»*\n\n## Ficha del evento\n\n- **Fechas:** del 13 al 16 de octubre.\n- **Ubicación:** Campus UNIMAR (Sala de Conferencias I, Aula Abierta y Aula de Extensión).\n\n## Programa de actividades\n\n- Conferencias sobre trauma, salud emocional y desarrollo en organizaciones.\n- Cineforos reflexivos y proyecciones de cápsulas audiovisuales informativas.\n- Intervenciones artísticas, talleres de defensa personal y jornadas de bailoterapia.',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), 'PUBLICADO',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), now(), 'EVENTO'),
  ('Del estado docente a la sociedad educadora: Alianza por la Educación', E'La Sala de Conferencias II de UNIMAR albergó la presentación de los avances del proyecto **«Alianza por la Educación»**. La jornada convocó a representantes de la academia, el gremio empresarial y sectores de la sociedad civil con el fin de plantear soluciones sistemáticas ante la situación educativa venezolana.\n\nNacida formalmente en 2023, la alianza integra esfuerzos de Fe y Alegría, UCAB, UNIMET, Universidad Monteávila, CERPE, EY Venezuela, Banco Mercantil y Fundación Empresas Polar.\n\n## ¿De la tutela estatal a la sociedad educadora?\n\nMariano Herrera, coordinador del proyecto, subrayó que el esquema centralizado en el que el Estado asumía en solitario el financiamiento, la pedagogía y la formación de maestros precisa evolucionar:\n\n> *«Hay que entender que la responsabilidad de la educación, incluyendo la educación pública de las escuelas oficiales, no es exclusiva de los gobiernos… sino de toda la sociedad».*\n\nHerrera recalcó que la participación del sector privado debe trascender la filantropía tradicional para verse como una inversión productiva, mientras que el rol universitario se centra en validar las metodologías mediante evidencia científica contrastable.\n\n## Innovación pedagógica y prospectiva regional\n\nEl secretario general de la UNIMET, **Santiago Perera**, defendió la reforma curricular universitaria y la modernización de la educación primaria y media. Entre sus propuestas: uso pedagógico formal de la inteligencia artificial, promoción de la identidad cultural regional, bilingüismo desde las primeras etapas escolares y capacitación técnica media articulada con los sectores productivos locales.\n\n> *«Nueva Esparta va a ser el primer estado no petrolero en recibir los beneficios… El cambio de Nueva Esparta del 2028 depende del petróleo; el del 2040 depende de ustedes».*\n\nEl encuentro cerró con el anuncio del estrechamiento de vínculos y convenios de trabajo conjunto entre UNIMET y UNIMAR para proyectos educativos y de investigación en la región insular.',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), 'PUBLICADO',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), now(), 'INSTITUCIONAL'),
  ('Jornada de salud mental laboral: «Cuidando a quienes mueven la universidad»', E'En el marco del Día Mundial de la Salud Mental, estudiantes de las prácticas profesionales de la Licenciatura en Psicología (mención Intervención Social) desarrollaron la jornada **«Cuidando a quienes mueven la universidad: Cuerpo, Mente y Trabajo»**, llevada a cabo en el Aula Magna bajo la tutoría de la profesora **Lisette Marcano**.\n\nLa actividad estuvo orientada al personal obrero y de servicios generales de la universidad, proporcionando recursos vivenciales de descompresión psicológica, control del estrés y hábitos de autocuidado.\n\n## Módulos y dinámicas\n\n1. **«Soltar la herramienta»:** pausas activas corporales, estiramientos y respiración diafragmática para mitigar el cansancio osteomuscular.\n2. **«El Muro de las Cargas»:** ejercicio anónimo de expresión e identificación de exigencias cotidianas físicas y emocionales.\n3. **Mini-taller de Higiene y Límites:** calidad del sueño, descanso reparador y comunicación asertiva para fijar límites funcionales.\n4. **«Pasa la fuerza» y cierre:** dinámica colectiva de retroalimentación y reconocimiento entre pares.\n\n> *«Tu trabajo sostiene a UNIMAR, pero tu bienestar te sostiene a ti».*',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), 'PUBLICADO',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), now(), 'INSTITUCIONAL'),
  ('UNIMAR y Consecomercio firman alianza estratégica regional', E'La Universidad de Margarita y el Consejo Nacional del Comercio y los Servicios (**Consecomercio**) celebraron la firma de un **Convenio Marco Interinstitucional** en la Sala de Conferencias II del campus, con la meta de enlazar la formación universitaria con la productividad del sector empresarial insular y nacional.\n\n## Adenda N.º 1: Formación especializada\n\nComo parte inicial de la colaboración se oficializó la **Adenda N.º 1**, que abre programas de capacitación en:\n\n- Arbitraje Comercial.\n- Cumplimiento Normativo (*Compliance*).\n- Gestión y Dirección de Proyectos.\n\n## Declaraciones oficiales\n\n- **José Gregorio Rodríguez (Presidente de Consecomercio):** el objetivo es descentralizar la toma de decisiones económicas y operativas, dotando de fuerza técnica a las organizaciones regionales.\n- **Pedro Cabello Poleo (Presidente del Consejo Superior de UNIMAR):** la misión de la universidad es formar ciudadanos conscientes y comprometidos éticamente con sus deberes y derechos cívicos, listos para responder al mercado productivo.\n\nEl acto contó con autoridades rectorales, miembros del Consejo Universitario, coordinadores de las Cátedras Libres Prometeo y Jóvito Villalba, y delegaciones de Fedecámaras Nueva Esparta, la Cámara de Comercio de Nueva Esparta, la Cámara Inmobiliaria y organizaciones ciudadanas.',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), 'PUBLICADO',
     (SELECT id FROM usuarios WHERE cedula = '20123456'), now(), 'INSTITUCIONAL');

-- Audiencias dirigidas (lo no listado aquí queda GLOBAL por no tener filas).
INSERT INTO comunicado_audiencias (comunicado_id, decanato_id)
SELECT c.id, d.id FROM comunicados c, decanatos d
 WHERE c.titulo = 'Programa de Formación «Piensa como INGENIERO: Más allá del Código»'
   AND d.id = 5;
INSERT INTO comunicado_audiencias (comunicado_id, decanato_id)
SELECT c.id, d.id FROM comunicados c, decanatos d
 WHERE c.titulo = 'Semana de la Salud Mental'
   AND d.id = 2;

-- Comunicados del FLUJO DE GESTIÓN (consola de staff): borrador en redacción,
-- pendiente de revisión, devuelto con motivo y archivado (historial). INSERT
-- directos: no disparan el bus ni push, igual que los PUBLICADOS de arriba.
INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, categoria) VALUES
  ('Convocatoria: taller de robótica educativa para docentes', E'El Decanato de Ingeniería y Afines prepara el **taller «Robótica Educativa en el Aula»**, una jornada práctica con sensores, placas de desarrollo y pensamiento computacional para docentes de educación media.\n\n## Ficha preliminar\n\n- **Fecha tentativa:** por confirmar (noviembre).\n- **Lugar:** Laboratorio de Ingeniería, Campus UNIMAR.\n- **Cupo:** 25 participantes.\n\n*Borrador en redacción: falta confirmar fecha y abrir el formulario de registro.*',
      (SELECT id FROM usuarios WHERE cedula = '17420667'), 'BORRADOR', 'EVENTO'),
  ('Cronograma especial de atención administrativa', E'La Dirección de Asuntos Estudiantiles anuncia un cronograma ajustado de atención administrativa durante la semana de evaluaciones parciales, con turnos ampliados de 8:00 a.m. a 5:00 p.m.\n\n*Pendiente de la firma de la Secretaría General antes de publicar.*',
      (SELECT id FROM usuarios WHERE cedula = '17420667'), 'PENDIENTE', 'INSTITUCIONAL'),
  ('Indicaciones para el proceso de matrícula tardía', E'La matrícula tardía se habilitará durante la primera semana del semestre con recargo del 10%, según el calendario académico oficial.\n\n## Requisitos\n\n- Solicitud escrita ante el decanato respectivo.\n- Aprobación del decano o su delegado.\n- Estar al día en el pensum de la cohorte anterior.',
      (SELECT id FROM usuarios WHERE cedula = '17420667'), 'BORRADOR', 'ACADEMICO');
-- El "devuelto": rechazo del ADMIN sobre un PENDIENTE (estado vuelve a
-- BORRADOR con motivo_rechazo — el badge «Devuelto» de la consola).
UPDATE comunicados
   SET motivo_rechazo = 'Falta el link oficial del formulario de inscripción y el nombre del coordinador responsable. Por favor completa antes de re-enviar a revisión.'
 WHERE estado = 'BORRADOR'
   AND titulo = 'Indicaciones para el proceso de matrícula tardía';
-- Un archivado del ADMIN (retiro del feed, historial conservado).
UPDATE comunicados
   SET estado = 'ARCHIVADO'
 WHERE titulo = 'Semana de la Salud Mental'
   AND estado = 'PUBLICADO';

-- Audiencias de los comunicados del flujo de gestión (Flavio emite para el
-- decanato 5; el cronograma queda GLOBAL sin filas, como los PUBLICADOS).
INSERT INTO comunicado_audiencias (comunicado_id, decanato_id)
SELECT c.id, d.id FROM comunicados c, decanatos d
 WHERE c.titulo = 'Convocatoria: taller de robótica educativa para docentes'
   AND d.id = 5;
INSERT INTO comunicado_audiencias (comunicado_id, decanato_id)
SELECT c.id, d.id FROM comunicados c, decanatos d
 WHERE c.titulo = 'Indicaciones para el proceso de matrícula tardía'
   AND d.id = 5;

-- Eventos OFICIALES del calendario institucional, espejo de los comunicados
-- con categoria='EVENTO' (no hay FK comunicado↔evento; solo coherencia
-- editorial). INSERT directos: no disparan el bus ni push, igual que arriba.
-- Audiencia: 0 filas en evento_audiencias = GLOBAL (toda la universidad).
-- Fechas fieles a las carteleras (huso horario de Venezuela, UTC-4).
-- El único evento futuro (Recital, 17–19 nov) lleva recordatorio 24 h antes.
INSERT INTO eventos (titulo, descripcion, tipo, usuario_id, inicio_at, fin_at, dia_completo, recordatorio_minutos, lugar) VALUES
  ('Recital «EPIC: The Musical»',
   'Muestra escénica y vocal del American Corner basada en el musical de Jorge Rivera-Herrans (inspirado en La Odisea de Homero), bajo la metodología de Aprendizaje Basado en el Arte (ABA). Fechas: 17, 18 y 19 de noviembre; audiciones abiertas hasta el 5 de noviembre.',
   'OFICIAL', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   '2026-11-17 00:00:00-04', '2026-11-19 23:59:59-04', true, 1440, 'Sala de Conferencias II'),
  ('Programa de Formación «Piensa como INGENIERO: Más allá del Código»',
   'Programa de formación del Decanato de Ingeniería y Afines: arquitecturas cloud-native, IA aplicada al negocio y product mindset. Sesión del miércoles 7 de octubre, 12:00 m, con registro previo vía la comunidad WhatsApp.',
   'OFICIAL', (SELECT id FROM usuarios WHERE cedula = '17420667'),
   '2026-10-07 12:00:00-04', NULL, false, NULL, 'Salón de Conferencias I'),
  ('Foro «Alianza por la Educación»',
   'Jornada abierta para debatir los alcances de la plataforma «Alianza por la Educación», con Santiago Perera (Secretario General UNIMET) y Mariano Herrera (coordinador del proyecto). Entrada libre.',
   'OFICIAL', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   '2026-10-09 10:00:00-04', NULL, false, NULL, 'Sala de Conferencias II'),
  ('Semana de la Salud Mental',
   'Semana de sensibilización de la Escuela de Psicología: conferencias, cineforos, talleres de defensa personal y bailoterapia sobre salud mental y estabilidad emocional. Del 13 al 16 de octubre en el campus.',
   'OFICIAL', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   '2026-10-13 00:00:00-04', '2026-10-16 23:59:59-04', true, NULL, 'Sala de Conferencias I, Aula Abierta y Aula de Extensión');

-- Audiencias de eventos (lo no listado aquí queda GLOBAL por no tener filas).
INSERT INTO evento_audiencias (evento_id, decanato_id)
SELECT e.id, d.id FROM eventos e, decanatos d
 WHERE e.titulo = 'Programa de Formación «Piensa como INGENIERO: Más allá del Código»'
   AND d.id = 5;
INSERT INTO evento_audiencias (evento_id, decanato_id)
SELECT e.id, d.id FROM eventos e, decanatos d
 WHERE e.titulo = 'Semana de la Salud Mental'
   AND d.id = 2;

-- Eventos INSTITUCIONALES: fechas fijas del calendario académico visibles
-- para toda la universidad (tipo INSTITUCIONAL; estado FUTURO-próximos).
-- Varios a futuro para que la pestaña Agenda y la pantalla de eventos
-- del campus siempre muestren material.
INSERT INTO eventos (titulo, descripcion, tipo, usuario_id, inicio_at, fin_at, dia_completo, lugar) VALUES
  ('Inicio de inscripciones',
   'Apertura del portal de inscripciones para el semestre en curso. Verifica tu cita con antelación en el portal.',
   'INSTITUCIONAL', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   now() + interval '10 day', now() + interval '17 day', true, 'Portal académico'),
  ('Evaluaciones parciales',
   'Semana de evaluaciones parciales: solo se autorizan justificativos por enfermedad o emergencia familiar.',
   'INSTITUCIONAL', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   now() + interval '30 day', now() + interval '37 day', true, 'Campus'),
  ('Ferias de las Facultades',
   'Exposición de proyectos estudiantiles de cada Facultad en el patio central.',
   'INSTITUCIONAL', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   now() + interval '45 day', now() + interval '2 day', true, 'Patio central');

-- Eventos FERIADOS: días no laborables del calendario institucional.
-- Mismo régimen que INSTITUCIONAL (ADMIN, visible a todos); la UI los pinta
-- con su color propio (terracota) como puntos en la agenda.
INSERT INTO eventos (titulo, descripcion, tipo, usuario_id, inicio_at, fin_at, dia_completo, lugar) VALUES
  ('Vacaciones escolares',
   'La universidad permanecerá cerrada durante las vacaciones de fin de semestre.',
   'FERIADO', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   now() + interval '60 day', now() + interval '5 day', true, NULL),
  ('Receso de Semana Santa',
   'La universidad permanecerá cerrada durante el asueto de Semana Santa según el calendario institucional.',
   'FERIADO', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   now() + interval '22 day', now() + interval '26 day', true, NULL),
  ('Feriado conmemorativo local',
   'Día no laborable con motivo de la efeméride institucional (vigilado por Decanato de Asuntos Estudiantiles).',
   'FERIADO', (SELECT id FROM usuarios WHERE cedula = '20123456'),
   now() + interval '75 day', NULL, true, NULL);
