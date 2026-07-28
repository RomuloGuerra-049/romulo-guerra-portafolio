# Portal privado

La página `dashboard.html` funciona como una aplicación de vistas internas para
evitar duplicar sidebar, header y lógica en múltiples HTML.

## Cliente

Puede ver exclusivamente sus proyectos, progreso, etapas, notificaciones y
actividad; solicitar un proyecto y crear solicitudes de cambio sobre proyectos
propios.

## Administrador

Puede consultar usuarios, activar o suspender cuentas, ver todos los proyectos,
crear y asignar proyectos, y actualizar estado y progreso.

## Colaborador

El backend reconoce el rol y permite consultar únicamente proyectos incluidos
en `collaboratorIds`. Puede actualizar estado y progreso de esos proyectos. La
interfaz específica de asignación es una mejora pendiente.

## Responsive y accesibilidad

El sidebar se convierte en menú móvil; formularios y tarjetas pasan a una sola
columna. Las vistas ocultas no participan en la navegación, los formularios
tienen etiquetas y estados accesibles, y las animaciones respetan
`prefers-reduced-motion`.
