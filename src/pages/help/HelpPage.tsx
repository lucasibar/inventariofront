import { useState, useMemo } from 'react';
import { 
    Box, Typography, Accordion, AccordionSummary, AccordionDetails, 
    TextField, InputAdornment, Card, CardContent, Divider 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';

interface WorkflowStep {
    title: string;
    details: string[];
}

interface HelpSection {
    id: string;
    title: string;
    icon: string;
    description: string;
    workflows: WorkflowStep[];
}

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const helpData: HelpSection[] = [
        {
            id: 'inventariado',
            title: 'Inventariado (Warehouse)',
            icon: '🏭',
            description: 'Gestión de stock físico, ubicaciones, reasignaciones de partidas y ajustes manuales en el depósito.',
            workflows: [
                {
                    title: 'Ver Stock y Posiciones de un Material',
                    details: [
                        'Ingresá a la sección Stock (📋 Stock) en el menú lateral.',
                        'Elegí el Depósito correspondiente en el selector superior.',
                        'Buscá el material por código o descripción en el cuadro de búsqueda.',
                        'Hacés clic sobre la fila del material deseado: se desplegará el detalle mostrando todas las posiciones físicas y lotes (partidas) donde está almacenado actualmente.',
                    ]
                },
                {
                    title: 'Realizar un Ajuste Manual de Stock',
                    details: [
                        'Buscá y desplegá el material deseado en la pantalla de Stock (📋 Stock).',
                        'Ubicá la fila correspondiente al lote y la posición física que querés modificar.',
                        'Hacés clic directo sobre el número de Cant. Principal o Secundaria. Verás que la celda se transforma en un campo de edición.',
                        'Escribí la cantidad física real observada en la estantería y presioná Enter o hacés clic fuera de la celda.',
                        'El sistema registrará el ajuste inmediatamente y lo guardará en el historial de auditoría.',
                    ]
                },
                {
                    title: 'Realizar un Movimiento Interno (Reubicar Stock)',
                    details: [
                        'Ingresá a Movimientos (🔄 Movimientos) en el menú lateral. Verás una pantalla dividida en dos paneles (Izquierdo y Derecho).',
                        'En el panel origen (por ejemplo, Izquierdo), seleccioná el Depósito y la Posición origen de donde querés retirar la mercadería. La tabla cargará los materiales almacenados.',
                        'En el panel destino (por ejemplo, Derecho), seleccioná el Depósito y la Posición de destino a donde querés trasladar el material.',
                        'En la tabla del panel origen, marcá la casilla (checkbox) al inicio de la fila del material/lote que deseás mover.',
                        'Hacé clic en el botón de transferencia (Mover seleccionados -> o <- Mover seleccionados).',
                        'Se abrirá una ventana flotante ("Mover Stock"): ingresá la Cantidad Principal y Secundaria que vas a trasladar (podés transferir el total o realizar un traspaso parcial).',
                        'Presioná el botón Confirmar para procesar el traslado físico en el sistema.',
                    ]
                },
                {
                    title: 'Efectuar una Auditoría de Picking',
                    details: [
                        'Accedé a la sección Picking (✅ Picking) en el menú lateral.',
                        'Filtra por depósito si es necesario.',
                        'Verás un listado de todos los materiales almacenados en ubicaciones tipo PICKING, junto con la Cant. Sistema.',
                        'Contá físicamente el stock en el depósito real y, si hay diferencias, escribí la cantidad contada en la celda Cant. Física de esa fila.',
                        'Al terminar de auditar las filas necesarias, hacés clic en el botón superior derecho Confirmar Auditoría.',
                        'Confirmá el cuadro de diálogo. El sistema generará automáticamente un remito de salida para descontar las diferencias reportadas.',
                    ]
                }
            ]
        },
        {
            id: 'entradas',
            title: 'Remitos de Entrada (Ingreso)',
            icon: '📥',
            description: 'Ingreso formal de mercadería enviada por proveedores y asignación de lotes primarios.',
            workflows: [
                {
                    title: 'Cargar un Nuevo Remito de Entrada',
                    details: [
                        'Entrá a Remitos Entrada (📥 Remitos Entrada) en el menú lateral.',
                        'Hacés clic en el botón superior derecho + Nuevo Ingreso.',
                        'Completá los Datos Generales en la parte superior:',
                        '  - Número de Remito: Escribí el número del documento físico.',
                        '  - Fecha de Emisión: Elegí la fecha del remito.',
                        '  - Planta y Depósito Destino: Seleccioná dónde se guardará la mercadería.',
                        '  - Proveedor: Buscalo y seleccionalo en el autocompletado (o creá uno nuevo pulsando el botón + circular de al lado).',
                        'En la sección Items del Documento, hacés clic en Agregar Fila por cada artículo recibido:',
                        '  - Material: Buscá y elegí el material en el autocompletado.',
                        '  - Cantidad Principal (Kg): Escribí los kilos ingresados.',
                        '  - Secundaria (Unid): (Opcional) Escribí la cantidad en unidades secundarias (cajas o bultos).',
                        '  - Partida: Escribí de forma obligatoria el número de lote del proveedor.',
                        'Hacés clic en el botón inferior Registrar Remito para ingresar el stock al depósito.',
                    ]
                }
            ]
        },
        {
            id: 'salidas',
            title: 'Remitos de Salida (Egreso)',
            icon: '📤',
            description: 'Salida de mercadería terminada o insumos con descuento de stock automatizado mediante FIFO.',
            workflows: [
                {
                    title: 'Generar un Remito de Salida con Lógica FIFO',
                    details: [
                        'Ingresá a Remitos Salida (📤 Remitos Salida) en el menú lateral.',
                        'Presioná el botón superior derecho + Nuevo Remito.',
                        'Completá los campos del formulario:',
                        '  - Pedido (opcional): Si hay una orden de venta previa, seleccionala para precargar los materiales y kilos solicitados.',
                        '  - Número: Dejalo en blanco para auto-generarlo, o escribí el número correspondiente.',
                        '  - Fecha: Elegí la fecha de despacho.',
                        '  - Cliente: Buscá y elegí el cliente en el buscador.',
                        '  - Materiales a despachar: Hacés clic en + Línea para agregar artículos, eligiendo el Material y la Cant. Principal.',
                        'Hacés clic en el botón Ver Preview →.',
                        'El sistema buscará en las posiciones del tipo PICKING y elegirá automáticamente los lotes más antiguos (regla FIFO). Verás la tabla detallada de qué estanterías y lotes se descontarán.',
                        'Si todo está correcto, hacés clic en el botón ✅ Confirmar y Guardar para registrar la salida.',
                    ]
                }
            ]
        },
        {
            id: 'mantenimiento',
            title: 'Mantenimiento de Máquinas',
            icon: '🛠️',
            description: 'Reportes de fallas de maquinaria, historial de registros e informes de turnos.',
            workflows: [
                {
                    title: 'Registrar un Reporte de Falla (Parte Diario)',
                    details: [
                        'Ve a Mantenimiento en el menú lateral y elegí Registrar (📋 Registrar).',
                        'Seleccioná la Máquina defectuosa del listado.',
                        'Elegí el Tipo de Falla (Eléctrica, Mecánica, Neumática, Operativa, etc.).',
                        'Escribí una descripción detallada del problema en el cuadro de texto.',
                        'Presioná Registrar Falla. La tarea se enviará al listado de Pendientes (📑 Pendientes) para que el equipo de soporte lo resuelva.',
                    ]
                },
                {
                    title: 'Ver Monitoreo en Vivo de Máquinas',
                    details: [
                        'Entrá a Mantenimiento -> Monitoreo (📺 Monitoreo en Vivo) en el menú lateral.',
                        'Visualizá el panel en tiempo real que indica si las líneas están activas (verde) o paradas por fallas (rojo).',
                    ]
                }
            ]
        },
        {
            id: 'produccion',
            title: 'Producción',
            icon: '⚙️',
            description: 'Carga de partes diarios de producción por máquina y turno.',
            workflows: [
                {
                    title: 'Cargar Parte de Producción',
                    details: [
                        'Ingresá a Producción -> Cargar (➕ Cargar) en el menú lateral.',
                        'Completá el formulario con la fecha, el turno de trabajo y la máquina utilizada.',
                        'Ingresá la cantidad de piezas/unidades producidas.',
                        'Ingresá la partida o lote del insumo utilizado en el proceso.',
                        'Confirmá haciendo clic en Cargar Producción.',
                    ]
                }
            ]
        },
        {
            id: 'compras',
            title: 'Compras (Purchasing)',
            icon: '🛒',
            description: 'Creación de pedidos de compra a proveedores y conciliación de remitos físicos.',
            workflows: [
                {
                    title: 'Crear un Nuevo Pedido de Compra',
                    details: [
                        'Ingresá a Pedidos de Compra (📝 Pedidos de Compra) en el menú lateral.',
                        'Hacé clic en el botón superior derecho + Nuevo Pedido.',
                        'Completá los datos del formulario:',
                        '  - Proveedor: Seleccioná al proveedor al que le realizarás la compra.',
                        '  - Planta/Depósito: Elegí el destino de la entrega.',
                        '  - Fecha de Entrega Esperada: Indicá la fecha de recepción estimada.',
                        '  - Observaciones: (Opcional) Notas administrativas.',
                        'Hacé clic en + Línea para agregar los materiales:',
                        '  - Material: Buscá y elegí el material de la lista.',
                        '  - Cantidad Pedida: Ingresá la cantidad solicitada.',
                        'Hacé clic en Guardar para registrar el pedido de compra.',
                    ]
                },
                {
                    title: 'Conciliación de Remitos de Entrada',
                    details: [
                        'Entrá a Conciliación (🔗 Conciliación) en el menú lateral bajo el sector Compras.',
                        'En el panel izquierdo verás la lista de Entradas sin vincular (remitos que ingresaron físicamente a stock pero no están asociados a ninguna orden de compra).',
                        'Hacé clic sobre una entrada de la lista para seleccionarla.',
                        'El panel derecho buscará y te sugerirá las Órdenes de Compra abiertas correspondientes a ese mismo proveedor e ítem.',
                        'Hacé clic en el botón de vinculación de la orden de compra sugerida correcta para ligar el remito físico con el documento administrativo.',
                    ]
                }
            ]
        }
    ];

    const handleAccordionToggle = (sectionId: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Filter data based on search input
    const filteredHelpData = useMemo(() => {
        if (!searchQuery) return helpData;
        const query = searchQuery.toLowerCase();

        return helpData.map(section => {
            const sectionMatches = section.title.toLowerCase().includes(query) || 
                                   section.description.toLowerCase().includes(query);
            
            const matchingWorkflows = section.workflows.filter(wf => 
                wf.title.toLowerCase().includes(query) || 
                wf.details.some(detail => detail.toLowerCase().includes(query))
            );

            if (sectionMatches || matchingWorkflows.length > 0) {
                return {
                    ...section,
                    workflows: matchingWorkflows.length > 0 ? matchingWorkflows : section.workflows
                };
            }
            return null;
        }).filter((item): item is HelpSection => item !== null);
    }, [searchQuery]);

    // Automatically expand accordions when searching
    const currentExpanded = useMemo(() => {
        if (!searchQuery) return expandedSections;
        const expanded: Record<string, boolean> = {};
        filteredHelpData.forEach(section => {
            expanded[section.id] = true;
        });
        return expanded;
    }, [filteredHelpData, searchQuery, expandedSections]);

    return (
        <Box sx={{ p: 4, maxWidth: '1000px', mx: 'auto', minHeight: '100vh', color: '#e6e1e5' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-1.5px', color: '#f3f4f6' }}>
                    Centro de Ayuda y Soporte
                </Typography>
                <Typography variant="body1" sx={{ color: '#9ca3af', fontWeight: 500 }}>
                    Encontrá guías rápidas paso a paso para operar el sistema de inventariado, remitos, producción y mantenimiento.
                </Typography>
            </Box>

            {/* Search Bar */}
            <Card sx={{ mb: 4, background: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                <CardContent sx={{ p: '16px !important' }}>
                    <TextField
                        fullWidth
                        placeholder="Buscar por funcionalidad, botón o sector (ej. 'Remito', 'Ajuste', 'Falla')..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        variant="outlined"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: '#9ca3af' }} />
                                </InputAdornment>
                            ),
                            sx: {
                                background: '#0f1117',
                                color: '#f3f4f6',
                                borderRadius: '8px',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#374151',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#6366f1',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#8b5cf6',
                                }
                            }
                        }}
                    />
                </CardContent>
            </Card>

            {/* Accordions */}
            {filteredHelpData.length === 0 ? (
                <Box sx={{ textAlignment: 'center', py: 8, color: '#9ca3af' }}>
                    <InfoIcon sx={{ fontSize: 48, mb: 2, color: '#6b7280' }} />
                    <Typography variant="h6" sx={{ color: '#f3f4f6' }}>No encontramos guías para tu búsqueda</Typography>
                    <Typography variant="body2">Intentá con palabras clave como "stock", "remito", "picking" o "máquina".</Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredHelpData.map((section) => (
                        <Accordion
                            key={section.id}
                            expanded={!!currentExpanded[section.id]}
                            onChange={() => handleAccordionToggle(section.id)}
                            sx={{
                                background: '#1a1d2e',
                                border: '1px solid #2a2d3e',
                                borderRadius: '12px !important',
                                overflow: 'hidden',
                                color: '#e6e1e5',
                                '&:before': { display: 'none' },
                                boxShadow: 'none',
                            }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon sx={{ color: '#a5b4fc' }} />}
                                sx={{
                                    px: 3,
                                    py: 1,
                                    borderBottom: currentExpanded[section.id] ? '1px solid #2a2d3e' : 'none',
                                    '&:hover': {
                                        background: 'rgba(255, 255, 255, 0.02)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="h5" sx={{ fontSize: '24px', m: 0 }}>
                                        {section.icon}
                                    </Typography>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f3f4f6', m: 0 }}>
                                            {section.title}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                            {section.description}
                                        </Typography>
                                    </Box>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 3, background: '#131625' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {section.workflows.map((wf, wIndex) => (
                                        <Box key={wIndex}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#a5b4fc', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DoubleArrowIcon sx={{ fontSize: 16 }} /> {wf.title}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 2 }}>
                                                {wf.details.map((detail, dIndex) => (
                                                    <Box key={dIndex} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                                        <Box sx={{
                                                            background: '#2a2d3e',
                                                            color: '#a5b4fc',
                                                            borderRadius: '50%',
                                                            width: '20px',
                                                            height: '20px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            flexShrink: 0,
                                                            mt: 0.2
                                                        }}>
                                                            {dIndex + 1}
                                                        </Box>
                                                        <Typography variant="body2" sx={{ color: '#cac4d0', lineHeight: 1.5, m: 0 }}>
                                                            {detail}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                            {wIndex < section.workflows.length - 1 && (
                                                <Divider sx={{ mt: 3, borderColor: '#2a2d3e' }} />
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            )}
        </Box>
    );
}
