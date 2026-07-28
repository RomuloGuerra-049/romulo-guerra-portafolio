# PostgreSQL del portal

El proyecto utiliza PostgreSQL 18 local con la base `romulo_portfolio`.
La conexión se obtiene exclusivamente de `DATABASE_URL` en `.env`; ese archivo
está ignorado por Git y no debe publicarse.

## Migraciones

```bash
npm run db:migrate
```

El ejecutor crea el esquema inicial cuando la base está vacía y registra las
migraciones aplicadas en `schema_migrations`.

## Persistencia implementada

El adaptador `server/repositories/postgres.js` persiste:

- usuarios, roles y sesiones;
- contactos y estado del envío;
- proyectos, etapas y colaboradores;
- solicitudes de proyectos y cambios;
- notificaciones e historial de actividad.

El esquema también deja preparadas las tablas de propuestas, aprobaciones,
archivos, mensajes, tareas, pagos y soporte.

## Seguridad

- Consultas parametrizadas.
- Correos únicos a nivel de base.
- Claves foráneas y eliminaciones controladas.
- Contraseñas derivadas con `scrypt`.
- Tokens de sesión almacenados como hash SHA-256.
- Progreso restringido entre 0 y 100.
- Transacciones al crear proyectos, etapas y colaboradores.

## Copia de seguridad

```bash
pg_dump romulo_portfolio > romulo_portfolio_backup.sql
```

Los respaldos pueden contener información privada y no deben añadirse al
repositorio.
