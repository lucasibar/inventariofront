export const MAINTENANCE_STATUS_COLORS: Record<string, string> = {
    ACTIVA: '#10b981',
    REVISAR: '#eab308',
    VELOCIDAD_REDUCIDA: '#f472b6',
    PARADA: '#ef4444',
    ELECTRONIC: '#3b82f6',
    FALTA_COSTURA: '#a855f7',
    FALTA_PROGRAMA: '#fb923c',
    REPUESTOS: '#94a3b8',
    OTRO: '#6b7280',
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
    ACTIVA: 'Activa',
    REVISAR: 'En Revisión',
    VELOCIDAD_REDUCIDA: 'Vel. Reducida',
    FALTA_COSTURA: 'Costura',
    PARADA: 'Parada',
    ELECTRONIC: 'Electrónica',
    FALTA_PROGRAMA: 'Programa',
    REPUESTOS: 'Repuestos',
    OTRO: 'Otro',
};

export const FAILURE_TYPES = [
    'Sin Asignar', 'Ninguna', 'Cosedora Cilindro', 'Cosedora Brazo', 'Cosedora Cierre', 'Error electronico',
    'Error Puesta 0', 'Error Motores', 'Mal vanizado', 'Logo contaminado',
    'Tejido(Muerde/revienta/pica/tirones)', 'Goma', 'Puntada', 'Transferencia',
    'Aguja', 'Platina', 'Menguados', 'Corta', 'Electronico', 'Lubricacion',
    'Mancha', 'Corte', 'REPUESTO', 'Corte de luz.', 'Programacion'
];

export const RESPONSABLES = [
    'Sin Asignar', 'Gaston', 'Ruben', 'Daniel', 'Alexis', 'Violeta', 'Leandro', 'Gaspar', 'Ramón', 'Tejedor'
];
