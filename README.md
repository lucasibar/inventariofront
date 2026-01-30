# Inventario WMS - Frontend

Interfaz de usuario para el sistema WMS, construida con React, Vite y Material UI.

## Arquitectura

Este proyecto sigue **Feature-Sliced Design (FSD)**:
*   `app/`: Configuración global (Providers, Rutas, Store).
*   `pages/`: Páginas completas (Login, Create Item).
*   `widgets/`: Bloques de UI complejos.
*   `features/`: Funcionalidades de usuario (Formularios, Acciones).
*   `entities/`: Modelos de negocio (Item, User).
*   `shared/`: Componentes reutilizables y utilidades.

## Requisitos Previos

*   Node.js (v18+)
*   Backend (`inventarioserver`) corriendo en puerto 3000 (por defecto).

## Configuración

1.  Clonar el repositorio.
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  (Opcional) Configurar URL del backend si es diferente a localhost:
    *   Editar `src/shared/api.ts` o configurar variables de entorno VITE_.

## Ejecutar

```bash
# Desarrollo
npm run dev

# Construir para produccion
npm run build
```

## Credenciales de Acceso (Local)
Si el backend sembró el usuario por defecto:
*   **Usuario**: `admin`
*   **Contraseña**: `Admin258$$`
