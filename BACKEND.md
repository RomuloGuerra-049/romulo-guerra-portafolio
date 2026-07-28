# Backend del portafolio y portal

## Ejecución

Requiere Node.js 20 o superior y PostgreSQL:

```bash
npm run dev
```

Abre `http://localhost:3000`. Las pruebas se ejecutan con `npm test` y la
verificación sintáctica con `npm run check`.

## Administrador inicial

Copia `.env.example` a `.env` o proporciona las variables al proceso:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

El administrador se crea al iniciar únicamente cuando las tres variables están
presentes y el correo todavía no existe. No hay credenciales reales incluidas.

## Arquitectura

- `server/routes/api.js`: rutas y códigos HTTP.
- `server/middleware/auth.js`: autenticación y roles.
- `server/services/auth.js`: contraseñas, sesiones y usuarios.
- `server/services/portal.js`: proyectos, solicitudes, notificaciones y actividad.
- `server/validators/portal.js`: validaciones de dominio.
- `server/repositories/memory.js`: almacenamiento temporal sustituible.
- `server/repositories/postgres.js`: persistencia PostgreSQL.
- `server/database/schema.sql`: esquema completo.
- `server/database/migrate.js`: migraciones versionadas.
- `server/services/mail.js`: entrega SMTP del formulario.

## Seguridad implementada

- Hash de contraseña con `scrypt` y salt individual.
- Token de sesión aleatorio; solo se almacena su hash.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción y con vencimiento.
- Roles `admin`, `client` y `collaborator` asignados exclusivamente en servidor.
- Registro público siempre con rol `client`.
- Protección de endpoints privados y comprobación de roles en servidor.
- Filtrado por propietario para impedir acceso horizontal.
- Validación de progreso entre 0 y 100.
- Límite de intentos y tamaño de JSON.
- Validación de origen para operaciones que cambian estado.
- Respuestas sin hashes de contraseñas ni tokens.

## Persistencia

PostgreSQL está integrado mediante `server/repositories/postgres.js`. Cuando
`DATABASE_URL` está definida, usuarios, sesiones, contactos, proyectos,
solicitudes, notificaciones y actividad sobreviven a los reinicios. La memoria
se conserva solamente como alternativa para pruebas.

```bash
npm run db:migrate
```

## Formulario y correo

Cada mensaje se guarda primero en `contacts`. Después se intenta enviar por SMTP
y se registra `sent` o `failed`.

Gmail requiere `SMTP_PASS` con una contraseña de aplicación de Google, no la
contraseña normal de la cuenta. Hasta configurarla, los mensajes quedan
guardados en PostgreSQL y el frontend informa que el envío está pendiente.

## Alcance actual

Completos en el MVP:

- Registro, login, logout y sesión.
- Roles y estado de cuenta.
- Dashboard cliente/admin.
- Usuarios para administración.
- Proyectos, asignación, progreso y estados.
- Solicitudes de proyectos.
- Solicitudes de cambios.
- Notificaciones internas básicas.
- Historial de actividad.

Pendientes de una fase posterior:

- Recuperación/cambio de contraseña.
- Archivos y almacenamiento externo.
- Mensajería, tareas y aprobaciones.
- Propuestas y cotizaciones.
- Pagos y comprobantes.
- Tickets de soporte y calendario.
