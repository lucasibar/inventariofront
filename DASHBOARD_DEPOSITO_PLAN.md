# Plan de Implementación: Dashboard Unificado de Depósito (Inventariado)

Este documento detalla la hoja de ruta para la creación del nuevo Dashboard del sector Depósito, diseñado para centralizar la operativa diaria en una única vista de alta densidad.

## 1. Relevamiento de Funcionalidades y Datos Actuales

### Datos de Visualización
*   **Stock Maestro**: Kilos y Conos/Unidades por material.
*   **Trazabilidad**: Lote, Proveedor y Ubicación (Depósito/Posición).
*   **Alertas de Inventario**: Identificación de materiales por debajo del stock mínimo.
*   **Métricas de Consumo**: Consumo total últimos 30 días, promedio diario y días de stock remanentes.

### Acciones Operativas
*   **Entrada de Material**: Carga rápida de nuevos lotes (Quick Add).
*   **Movimientos Internos**: Traslado entre estanterías o depósitos.
*   **Ajustes de Stock**: Corrección manual de diferencias de inventario.
*   **Egresos**: Registro de salida de material para producción.
*   **Auditoría de Picking**: Validación física vs sistema.

---

## 2. User Stories (Historias de Usuario)

### 🛠️ Operativa de Planta (El "Día a Día")
*   **[Urgencia]** Como operario, quiero ver un contador de **Alertas Críticas** en la cabecera para priorizar la reposición de materiales.
*   **[Búsqueda]** Como operario, quiero buscar un código de artículo y ver instantáneamente su ubicación y lote para agilizar el retiro.
*   **[Agilidad]** Como operario, quiero mover stock entre posiciones con un solo toque en la tarjeta del material.
*   **[Precisión]** Como operario, quiero ajustar el pesaje de un lote directamente desde la lista si detecto una diferencia física.

### 📈 Gestión y Control
*   **[Control]** Como operario, quiero ver los últimos movimientos realizados para validar mis acciones recientes.
*   **[Planificación]** Como gestor, quiero ver el promedio de consumo diario en la tarjeta del material para anticipar compras.
*   **[Enfoque]** Como operario, quiero filtrar rápidamente por Hilados, Insumos o Repuestos para limpiar el ruido visual.
*   **[Mantenimiento]** Como operario, quiero corregir números de lote mal cargados sin borrar el registro.

---

## 3. Propuesta de Diseño (Mobile-First)

El nuevo **DashboardDepositoPage.tsx** seguirá la línea estética de Mantenimiento:

*   **Cabecera de KPIs**: Kilos Totales, Items en Alerta, Movimientos hoy.
*   **Filtros Rápidos**: Chips para categorías (Hilados, Insumos, Repuestos).
*   **Tarjetas Dinámicas**: 
    *   **Vista Móvil**: Lista horizontal de alta densidad.
    *   **Vista Monitor**: Grilla cuadrada (Grid) para supervisión general.
*   **Paleta de Colores**: **Amber (#f59e0b)** y **Slate (#475569)** para una identidad visual logística.

---

## 4. Pregunta Abierta
**¿Mantenemos el buscador de texto tradicional o agregamos un botón de acceso rápido para escanear QR/Código de Barras con la cámara del celular?**
