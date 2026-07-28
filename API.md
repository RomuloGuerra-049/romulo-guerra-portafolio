# API del portal

Todas las respuestas son JSON. Las operaciones privadas usan la cookie de sesión
y comprueban permisos en el servidor.

## Públicas

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/health` | Estado del servidor |
| POST | `/api/auth/register` | Registrar cliente |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual o `null` |
| POST | `/api/contact` | Enviar contacto |

## Portal

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/portal/dashboard` | Cualquier sesión |
| GET | `/api/projects` | Proyectos visibles para la sesión |
| GET | `/api/projects/:id` | Propietario, colaborador asignado o admin |
| POST | `/api/projects` | Admin |
| PATCH | `/api/projects/:id` | Admin o colaborador asignado |
| POST | `/api/project-requests` | Cliente |
| POST | `/api/projects/:id/change-requests` | Cliente propietario |
| GET | `/api/change-requests` | Solicitudes de proyectos visibles |
| GET | `/api/users` | Admin |
| PATCH | `/api/users/:id/status` | Admin |
| POST | `/api/notifications/read-all` | Usuario destinatario |

Los recursos ajenos responden `404` para no confirmar su existencia.
