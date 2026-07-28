# Auditoría técnica del proyecto

Fecha de revisión: 27 de julio de 2026.

## Arquitectura actual

El repositorio contiene una única aplicación sin framework. El portafolio
público y la autenticación son documentos HTML servidos por un servidor HTTP de
Node.js. Los estilos y scripts del navegador viven en `src/`; los recursos
multimedia en `public/`; el backend se divide actualmente entre configuración,
utilidades HTTP, repositorios y servicios.

No existe otro proyecto, proceso de compilación, framework frontend, ORM ni
gestor de base de datos. `npm start` ejecuta directamente `server/index.js`.

## Tecnologías encontradas

- HTML5, CSS y JavaScript ES modules.
- Node.js 20 o superior y módulos estándar de Node.
- `node:http` para servidor y rutas.
- `node:crypto` (`scrypt`, tokens aleatorios y SHA-256) para autenticación.
- Pruebas con `node:test`.
- Google Fonts y Devicon cargados desde CDN.
- Cero dependencias npm de producción.

## Frontend

- `index.html` conserva todo el portafolio público: header, hero, presentación,
  habilidades, proyectos, experiencia, contacto y footer.
- `auth.html` contiene login y registro con transición lateral.
- `src/scripts/main.js` controla navegación móvil, sesión, logout y contacto.
- `src/scripts/auth.js` controla las vistas de autenticación y consume
  `/api/auth/*`.
- Los estilos están separados por reset, variables, globales, componentes,
  secciones, animaciones, autenticación y responsive.
- La identidad visual reusable es fondo negro, superficies oscuras, acento
  dorado, tipografías Inter/Manrope, bordes finos, tarjetas y transiciones.

## Backend

- `server/index.js` crea el servidor, contiene el enrutamiento API, el servidor
  estático, rate limiting local y el endpoint de contacto.
- `server/services/auth.js` contiene registro, login, emisión/autenticación de
  sesiones y logout.
- `server/repositories/memory.js` implementa usuarios, sesiones y contactos.
- `server/http.js` centraliza JSON, cookies, validación de origen y errores HTTP.
- `server/config.js` normaliza puerto, entorno, TTL y tamaño de solicitudes.

## Autenticación actual

- El registro siempre crea un usuario básico; todavía no existían roles.
- Correos normalizados y únicos.
- Contraseñas derivadas con `scrypt` y salt individual.
- Sesión con token aleatorio; solo el hash SHA-256 se almacena en servidor.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción y vencimiento.
- Rate limit en memoria para login y registro.
- Verificación de origen para operaciones que modifican estado.

## Base de datos y modelos

No hay una base de datos conectada, migraciones ni tablas existentes. Los únicos
modelos temporales eran:

- `users`
- `sessions`
- `contacts`

Todos se pierden al reiniciar Node. El repositorio en memoria ya constituye una
interfaz sustituible, pero todavía no tiene transacciones ni persistencia.

## Endpoints encontrados

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/health` | Público |
| GET | `/api/auth/me` | Público, devuelve usuario o `null` |
| POST | `/api/auth/register` | Público y limitado |
| POST | `/api/auth/login` | Público y limitado |
| POST | `/api/auth/logout` | Sesión actual |
| POST | `/api/contact` | Público y limitado |

## Componentes y estilos reutilizables

- Botones `.button`, variantes primary/outline.
- Tarjetas y etiquetas de proyectos.
- Campos `.form-group`.
- Variables de color, tipografía, radios, sombras y transiciones.
- Navegación móvil y patrón de estado accesible.
- Tarjeta de autenticación y transiciones entre paneles.

## Problemas técnicos encontrados

- `server/index.js` concentra demasiadas responsabilidades.
- No existía autorización ni roles.
- No había rutas privadas ni protección contra acceso horizontal.
- No existían proyectos, solicitudes, etapas, notificaciones o actividad.
- La memoria volátil impide uso real en producción.
- El rate limit se reinicia y no sirve entre varias instancias.
- Faltan varios recursos enlazados por el portafolio: imágenes de proyectos,
  favicon y CV.
- Hay enlaces sociales y demos de ejemplo que deben reemplazarse antes de
  publicar.
- No hay recuperación o cambio de contraseña.
- No hay almacenamiento de archivos.

## Riesgos de seguridad

- La futura base de datos deberá imponer correo único, claves foráneas e índices,
  además de consultas parametrizadas.
- Los permisos nunca deben basarse en datos enviados por el navegador.
- La autorización de recursos debe filtrar por propietario en el repositorio,
  no únicamente ocultar botones.
- El almacenamiento futuro debe validar MIME, extensión, tamaño y nombre.
- Los secretos del administrador inicial y la base de datos deben venir solo de
  variables de entorno.
- Producción debe ejecutarse detrás de HTTPS y un proxy que configure
  correctamente el origen y la IP.

## Archivos previstos para modificación

- `.env.example`, `BACKEND.md`, `package.json`
- `index.html`, `auth.html`
- `server/config.js`, `server/index.js`
- `server/repositories/memory.js`, `server/services/auth.js`
- `src/scripts/auth.js`, `src/scripts/main.js`
- pruebas existentes

## Archivos previstos para creación

- `dashboard.html`
- `src/scripts/dashboard.js`
- `src/styles/dashboard.css`
- módulos de rutas, middleware, validación y servicios del portal
- modelo SQL de referencia compatible con PostgreSQL
- pruebas de roles, recursos y aislamiento
- `API.md`, `DATABASE.md`, `DASHBOARD.md`
- `IMPLEMENTATION_REPORT.md`

## Plan por fases

1. Fundamento: roles, middleware de autenticación/autorización, repositorios
   ampliados, separación de rutas y protección horizontal.
2. MVP: dashboard cliente/admin, proyectos, etapas, solicitudes, cambios,
   notificaciones y actividad.
3. Colaboración: archivos, mensajes, tareas, aprobaciones y propuestas.
4. Operaciones: pagos, comprobantes, soporte y calendario.
5. Calidad: pruebas de seguridad, responsive, accesibilidad y documentación.

La primera entrega integrada prioriza fases 1 y 2. Las fases posteriores solo
se marcarán completas cuando sus datos, endpoints, permisos y UI funcionen de
punta a punta.
