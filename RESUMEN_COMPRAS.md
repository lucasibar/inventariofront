# Resumen de Actualizaciones: Fase 3 (Predicciones y Compras)

**Fecha:** 7 de Abril de 2026

## ¿Qué se hizo en el Frontend hoy?
1. **Página de Volúmenes (`/dashboard/volumes`)**: Se añadió un dashboard para visualizar cuantas cajas entran para cada material según el stock máximo permitido y los kilos por caja, incluyendo alertas si un material sobrepasa su `stockMaximo`.
2. **Dashboard de Compras Expandido (`/dashboard/compras`)**:
    - **Días de Suministro (Days of Supply)**: Ahora los combos muestran para cuántos días te alcanza el stock actual de un combo en base a los promedios de consumo de remitos de salida históricos de los últimos 30 días. Semáforo: Rojo (<15), Amarillo (<60) y Verde (>60).
    - **Pedidos en Tránsito**: Si hay una orden de compra pendiente hacia un proveedor, el dashboard te avisa sumando esos kilos a un apartado llamado "🚚 Sup. en Tránsito".
    - **Alerta de Quiebre Automática**: Compara la "Fecha de llegada esperada" con tu "Día de quiebre de stock proyectado". Si el camión va a llegar después de que te quedes en cero kilos, marca una alerta crítica.
3. **Módulo Administrativo de Compras (`/pedidos-compra`)**: Nueva página exclusiva para el área de compras donde puedes generar OCs u Órdenes de Compra a los Proveedores y setear qué materiales van a traer y cuándo.

## Siguientes Pasos (Para mañana):
- Cargar historial real de movimientos/remitos de salida para que las matemáticas empiecen a calcular los promedios.
- Decidir la lógica de automatización (ej: ¿hacer que la recepción del pedido de proveedor se convierta automáticamente en un "Remito de Entrada" y sume stock, o dejarlo manual?).
