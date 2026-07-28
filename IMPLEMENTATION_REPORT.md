# Informe de implementación

## Resumen

Se amplió el portafolio existente sin cambiar el stack ni reemplazar su parte
pública. Se añadió un portal privado conectado al backend, autorización real
por roles, proyectos, solicitudes, notificaciones, actividad y un panel
administrativo inicial.

## Archivos creados

- `PROJECT_AUDIT.md`
- `dashboard.html`
- `src/scripts/dashboard.js`
- `src/styles/dashboard.css`
- `server/middleware/auth.js`
- `server/routes/api.js`
- `server/services/portal.js`
- `server/validators/portal.js`
- `server/database/schema.sql`
- `test/portal.test.js`
- `API.md`, `DATABASE.md`, `DASHBOARD.md`
- `IMPLEMENTATION_REPORT.md`

## Archivos modificados

- `.env.example`, `package.json`, `BACKEND.md`
- `server/config.js`, `server/index.js`
- `server/repositories/memory.js`, `server/services/auth.js`
- `src/scripts/auth.js`, `src/scripts/main.js`

El contenido y diseño del portafolio público se conservaron.

## Base de datos

PostgreSQL 18 está conectado mediante un repositorio con consultas
parametrizadas. Usuarios, sesiones, contactos, proyectos, solicitudes,
notificaciones y actividad son persistentes. La memoria queda únicamente para
pruebas unitarias.

## Funcionalidad completada

- Roles `admin`, `client` y `collaborator`.
- Registro público limitado al rol cliente.
- Administrador inicial mediante variables de entorno.
- Protección de rutas y recursos.
- Dashboard responsive cliente/admin.
- Listado, creación y actualización de proyectos.
- Asignación de proyectos a clientes.
- Estados, etapas y progreso validado.
- Solicitud de nuevo proyecto.
- Solicitud de cambios en proyectos propios.
- Estado de usuarios.
- Notificaciones y actividad básicas.
- Estados vacíos, carga, éxito y error.

## Medidas de seguridad

- `scrypt`, salts, tokens aleatorios y hash de tokens.
- Cookies protegidas.
- Permisos comprobados en servidor.
- Recursos filtrados por propietario o asignación.
- Un recurso ajeno responde `404`.
- Validación, rate limits y límites de payload.
- El rol nunca se acepta desde el registro público.

## Pruebas

Se conservaron las pruebas de autenticación y se añadieron pruebas para:

- Creación de proyectos exclusiva de administrador.
- Aislamiento de proyectos entre clientes.
- Validación del rango de progreso.
- Actualización de proyectos.
- Propiedad de solicitudes.
- Protección del listado de usuarios.

Resultado: 8 pruebas aprobadas, 0 fallidas.

También se ejecutó una prueba real contra el servidor:

- login de administrador correcto;
- tres usuarios visibles para administración;
- proyecto asignado al propietario correcto;
- cliente propietario con acceso;
- segundo cliente rechazado con `404`;
- `dashboard.html` servido con `200`.

El servidor inició sin errores y no registró errores durante el flujo. La
revisión visual automatizada en navegador no pudo ejecutarse porque esta sesión
no tenía ningún navegador conectado. El responsive sí fue revisado a nivel de
estructura y CSS, pero queda recomendada una comprobación visual manual en
anchos de 980, 720 y 520 píxeles antes de producción.

## Pendiente

No se declara completo lo que todavía no tiene endpoint, repositorio, permisos y
UI conectados:

- recuperación y cambio de contraseña;
- carga/descarga de archivos;
- mensajería y tareas;
- aprobaciones;
- propuestas/cotizaciones;
- pagos/comprobantes;
- soporte y calendario;
- rate limiting distribuido.

## Integración PostgreSQL y correo

Se añadió:

- base local `romulo_portfolio`;
- adaptador PostgreSQL para los módulos funcionales;
- migraciones versionadas;
- cuentas administrativa y cliente genérico creadas mediante el servicio de
  autenticación y protegidas con `scrypt`;
- persistencia de sesiones;
- almacenamiento de mensajes del formulario y estado de entrega;
- servicio SMTP con Nodemailer y destinatario configurable.

El envío real por Gmail queda pendiente únicamente de añadir una contraseña de
aplicación de Google en `SMTP_PASS`. La contraseña normal de la cuenta no se
utilizó como credencial SMTP.

## Ejecución

```bash
npm run dev
npm run db:migrate
npm test
npm run check
```

Configura el administrador inicial con las variables ficticias explicadas en
`.env.example`. No hay contraseñas reales en el repositorio.
