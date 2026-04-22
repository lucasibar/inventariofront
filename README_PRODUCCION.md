# Plan de Renovación del Módulo de Producción

Este documento detalla el plan para reestructurar el módulo de rendimiento de producción.

## 1. Cambios en la Base de Datos y Backend

### Estados de Máquina
Se actualizará el enum `MachineStatus` con los siguientes valores:
- `ACTIVA` (Verde)
- `REVISAR` (Amarillo)
- `VELOCIDAD_REDUCIDA` (Rosa)
- `PARADA` (Rojo)
- `ELECTRONICA` (Azul)

### Registro de Historial (Performance Logs)
Se realizará una limpieza completa de la tabla `performance_logs` antes de iniciar.
Campos necesarios en cada registro:
- Máquina ID
- Estado Anterior -> Estado Nuevo
- Tipo de Problema (Lista predefinida)
- Operario (Quién generó el cambio)
- Comentario (Opcional)
- Fecha (Automática)

### Lista de Problemas/Cortes
1. Cosedora Cilindro
2. Cosedora Brazo
3. Cosedora Cierre
4. Error electrónico
5. Error Puesta 0
6. Error Motores
7. Mal vanizado
8. Logo contaminado
9. Tejido (Muerde/revienta/pica/tirones)
10. Goma
11. Puntada
12. Transferencia
13. Aguja
14. Platina
15. Menguados
16. Corta
17. Electrónico
18. Lubricación
19. Mancha
20. Corte
21. REPUESTO
22. Corte de luz

## 2. Cambios en el Frontend

### Página Principal (RendimientoPage)
- **Función única**: Cambio de estados.
- Al hacer clic en una máquina, se abre un formulario para seleccionar el nuevo estado, el operario, el tipo de problema y un comentario.
- Una vez enviado, se genera el registro en el histórico.

### Página de Historial y Métricas (HistorialRendimientoPage)
- **Métricas**: Estarán en la parte superior.
- **Filtros**: Por fecha, tipo de error, operario, etc.
- **Dinamismo**: Las métricas deben actualizarse automáticamente según los registros filtrados en la tabla inferior.

### Página de Mapa (MapaProduccionPage)
- Representación visual de la distribución de las máquinas en planta.
- Al tocar una máquina, se abre un modal con toda su información técnica y estado actual.

## 3. Acciones Inmediatas (Wipe)
- Ejecutar limpieza de `performance_logs`.
- Mantener la cantidad de máquinas y sectores de depósito tal como están actualmente.
