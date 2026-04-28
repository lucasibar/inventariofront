# Guía de Commits (Conventional Commits)

Para mantener el proyecto organizado y profesional, utilizamos la convención de **Conventional Commits**.

## Formato del Mensaje
`tipo(alcance): descripción corta`

## Tipos de Commits
- `feat`: Nueva funcionalidad.
- `fix`: Corrección de un error.
- `docs`: Cambios en la documentación.
- `style`: Cambios de formato o estilo (sin cambios en la lógica).
- `refactor`: Mejora del código existente (ni fix ni feat).
- `perf`: Mejora de rendimiento.
- `test`: Añadir o corregir tests.
- `build`: Cambios en el sistema de construcción o dependencias.
- `ci`: Cambios en la configuración de CI/CD.
- `chore`: Tareas menores de mantenimiento.

## Ejemplos
- `feat(ventas): implementar dashboard de pedidos pendientes`
- `fix(auth): corregir error de redirección tras login`
- `chore(deps): actualizar versión de MUI`
- `refactor(ui): simplificar componente de Sidebar`

---
*Este estándar permite automatizar changelogs y entender rápidamente qué cambió en cada commit.*
