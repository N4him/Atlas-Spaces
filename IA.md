# IA.md — Uso de inteligencia artificial en este proyecto

## Herramientas de IA utilizadas

- **Claude (Anthropic)**, usado como asistente principal para diseñar la arquitectura, generar el código base del backend y frontend, y redactar la documentación.

## Tareas concretas para las que fue utilizada

1. Diseño del modelo de datos (Usuario, Espacio, Reserva) a partir del documento de requerimientos.
2. Implementación del backend base: autenticación JWT + bcrypt, autorización por rol, CRUD de espacios, CRUD de reservas con paginación/filtros/orden, reglas de negocio (solapamiento, capacidad, horario, fechas pasadas), agregaciones de analítica, exportación CSV y manejo centralizado de errores.
3. Implementación del frontend: React + React Router + Tailwind, contexto de autenticación, páginas de Login, Espacios, Reservas y Dashboard con gráficos (Recharts).
4. Configuración de Docker (Dockerfiles de backend/frontend, nginx, docker-compose.yml) y del script de seed.
5. Redacción de pruebas automatizadas: Jest + Supertest en el backend, y Vitest para componentes puntuales y el `AuthContext` en el frontend.
6. **Mejoras implementadas después de completar los seis tickets**, una vez el alcance mínimo ya funcionaba:
   - Autenticación con **refresh token** rotado, guardado como hash (no en texto plano) en un modelo `RefreshToken`, entregado al frontend en una cookie httpOnly, con renovación automática de sesión.
   - **Logging estructurado** con `pino`/`pino-http` en vez de `console.log`, para registrar cada request de forma consistente.
   - **Documentación OpenAPI** interactiva (Swagger UI servido en `/api/docs`), además de la colección Postman.
   - **Accesibilidad** de los modales del frontend: manejo de foco, cierre con tecla Escape y roles ARIA, mediante un hook reutilizable (`useModalA11y`).
7. Redacción de esta documentación (`IA.md` y `README.md`).

## Cómo se proporcionó el contexto necesario

Se le entregó a la IA el documento completo de la prueba técnica (los 6 tickets, el modelo mínimo de datos, las condiciones técnicas obligatorias y los criterios de evaluación) como base de todo el desarrollo, para que cada decisión de implementación se validara directamente contra un requerimiento explícito del documento, en lugar de asumir un diseño genérico. Para las mejoras del punto 6, que no estaban en el alcance obligatorio, el contexto adicional fue el propio código ya existente del proyecto (para que el refresh token, el logging y la documentación fueran consistentes con lo ya construido) y, en el caso puntual de accesibilidad, patrones conocidos de manejo de foco en modales (focus trap), que no dominaba de antes y tuve que investigar específicamente para esa mejora.

## Al menos una respuesta de IA que se descartó o corrigió

- **Zona horaria**: el primer enfoque sugerido por la IA fue usar una librería completa de zonas horarias (tipo `luxon` o `moment-timezone`) con la base de datos de IANA para "America/Bogota". Se corrigió esta decisión porque Colombia no tiene horario de verano y su offset (UTC-5) es fijo todo el año — agregar una dependencia y una capa de complejidad para resolver un offset constante era sobreingeniería para el alcance de esta prueba. Se reemplazó por una función simple y explícita (`bogotaStringToUTCDate` / `utcDateToBogotaHHmm`) documentada en el código, y solo se usa el soporte nativo de timezone de MongoDB (`$dateToString` con `timezone: 'America/Bogota'`) para la agregación de "reservas por día", donde de todas formas es necesario.
- **Búsqueda de texto**: la IA propuso inicialmente un índice `$text` de MongoDB para el campo `search`. Se descartó porque `$text` solo hace coincidencia por palabra completa (tokenizada), no por subcadena — por ejemplo, buscar "andr" no encontraría a "Andrés". Se reemplazó por una búsqueda con expresión regular (escapando caracteres especiales para evitar inyección de regex) sobre `title`, `clientName` y `clientEmail`, que sí soporta coincidencias parciales, alineado con lo que un operador esperaría al escribir en el buscador.
- **mongodb-memory-server en pruebas**: se verificó manualmente (fuera del entorno de desarrollo con IA, en un sandbox con red restringida) que el runner de pruebas dependía de descargar un binario de MongoDB desde internet en tiempo de ejecución. Ante la posibilidad de que el entorno de revisión también tenga restricciones de red, se documentó explícitamente en el README que `npm test` requiere acceso a internet la primera vez (para descargar el binario en caché), como alternativa transparente en vez de ocultar esa dependencia.

## Cambios, refactorizaciones o validaciones realizadas manualmente

- Se revisó línea por línea la lógica de solapamiento de horarios (`assertNoOverlap`) para confirmar que la condición `startAt: $lt: endAt` y `endAt: $gt: startAt` permite reservas consecutivas (una empieza exactamente cuando termina la otra) sin permitir solapamientos reales. Esta fue, de hecho, la parte que más problemas dio de todo el proyecto: la primera versión comparaba con `<=`/`>=`, lo que rechazaba por error las reservas consecutivas, y solo se detectó al escribir la prueba automatizada específica para ese caso.
- Se corrigió un índice duplicado en el modelo `User` (`unique: true` + `schema.index()` generaban un warning de Mongoose de índice repetido).
- Se corrigió el orden de las rutas de Express: la ruta `/api/reservations/export` debía declararse **antes** de `/api/reservations/:id`, o Express interpretaría "export" como un `:id` y el endpoint de exportación nunca se ejecutaría.
- Se validó manualmente (con scripts de Node ejecutados directamente, sin Jest) toda la lógica pura de negocio y de conversión de fechas, ante la imposibilidad de ejecutar la suite completa de Jest con MongoDB real en el entorno de desarrollo usado (ver README > Nota sobre `npm test`).
- Se probó manualmente con `supertest` que la aplicación Express levanta, responde el health check, protege rutas privadas y maneja 404, sin depender de una conexión real a MongoDB.
- Sobre las mejoras del punto 6: se verificó a mano que el flujo completo de refresh token funciona (login → expira el access token → refresh automático desde el frontend → logout invalida el refresh token), que el logger de pino no filtra información sensible (contraseñas, tokens) en los logs, y que el Swagger UI en `/api/docs` responde y coincide con los endpoints reales.

## Cómo se comprobó que la solución era funcional, segura y coherente

- Se ejecutó `node --check` sobre todos los archivos del backend para descartar errores de sintaxis.
- Se probaron manualmente (con scripts de Node) todas las funciones puras de reglas de negocio: orden de fechas, capacidad, horario del espacio, espacio inactivo, y las conversiones de zona horaria (incluyendo un caso "round-trip" para confirmar que no se pierde información).
- Se revisó que cada endpoint mutante (POST/PUT/PATCH) exigiera autenticación y, donde corresponde, el rol de administrador.
- Se revisó que los mensajes de error no expusieran información sensible (por ejemplo, el login devuelve el mismo mensaje genérico tanto si el correo no existe como si la contraseña es incorrecta, para no permitir enumeración de usuarios).

## Una decisión técnica o de producto que no se delegó a la IA

**Qué hacer con las reservas futuras al desactivar un espacio** (mencionado explícitamente como una decisión no definida en el documento de requerimientos): se decidió **no cancelar automáticamente** las reservas futuras pendientes/confirmadas de un espacio al desactivarlo, sino solo bloquear nuevas reservas sobre él, devolviendo una advertencia informativa al administrador con el conteo de reservas futuras afectadas para que decida manualmente. La razón: cancelar automáticamente reservas ya comprometidas con clientes reales (en un negocio real) es una acción destructiva e irreversible que no debería ejecutarse sin confirmación explícita de una persona; el costo de una advertencia informativa es mucho menor que el de cancelar por error compromisos con clientes. Esta decisión de producto —priorizar no destruir datos/compromisos sobre la conveniencia de un estado "limpio"— se tomó explícitamente y se documentó en el código y en el README, en vez de dejar que la IA decidiera un comportamiento por defecto.
