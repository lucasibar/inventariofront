export type EstadoRevisionArticulo = 'PENDIENTE' | 'CON_DUDAS' | 'CHEQUEADO' | 'INCOMPLETO' | 'NO_ENCONTRADO';

export interface ParsedMachineEntry {
    machine: number;
    machineDbId?: string | null;
    machineTypeName?: string | null;
    machineStatus?: string | null;
    articleRaw: string;
    descRaw: string;
    colorRaw: string;
    page: number;
    file: string;
    date: string;
    shift: 'M' | 'N' | string;
    area: string;
    talle?: string;
    articleCode?: string;
    matchedArticle?: any | null;
    isUnreviewed?: boolean;
    orderInShift?: number;
    totalArticlesInMachineShift?: number;
    hasChangeover?: boolean;
    changeoverRole?: 'UNICO' | 'SALIENTE_08AM' | 'ENTRANTE_08AM';
    changeoverType?: string | null;
    changeoverTypes?: string[];
    changeoverDurationMinutes?: number;
    horarioTexto?: string;
    grossHours?: number;
    netHours?: number;
    netSeconds?: number;
    cycleTimeSeconds?: number;
    mediasEstimadas?: number;
    paresEstimados?: number;
    docenasEstimadas?: number;
    hiladosMaquina?: {
        codigoComponente: string;
        codigoItem: string;
        descripcion: string;
        kgPorDocena: number;
        consumoKg: number;
        conosEstimados: number;
    }[];
}

export interface ArticuloProduccionSummary {
    codigo: string;
    codigoOriginalPdf: string;
    codigoSusi?: string | null;
    descripcion: string;
    marca: string;
    talles: string[];
    colores: string[];
    turnos: string[];
    fechas: string[];
    maquinasCount: number;
    maquinas: number[];
    maquinasDetalle: {
        machine: number;
        shift: string;
        area: string;
        talle: string;
        color: string;
        date: string;
        hasChangeover?: boolean;
        changeoverRole?: string;
        changeoverType?: string | null;
        netHours?: number;
        cycleTimeSeconds?: number;
        mediasEstimadas?: number;
        paresEstimados?: number;
        docenasEstimadas?: number;
    }[];
    cycleTimeSecondsPromedio?: number;
    horasTejidoTotales?: number;
    mediasTotales?: number;
    paresTotales?: number;
    docenasTotales?: number;
    kilosHiladoTotales?: number;
    estadoRevision: EstadoRevisionArticulo;
    isUnreviewed: boolean;
    advertencia?: string;
    itemRefs: any[];
    articuloId?: string;
}

export interface MaterialAsignadoSummary {
    itemId: string;
    codigoInterno: string;
    codigoComponenteBom?: string;
    descripcion: string;
    categoriaNombre?: string | null;
    rol: string;
    tono?: string | null;
    colorNombre?: string | null;
    proveedor?: string | null;
    rotacion?: string | null;
    unidadPrincipal?: string;
    pesoConoKg?: number;
    maquinasCount: number;
    maquinas: number[];
    consumoTotalKg?: number;
    consumoMananaKg?: number;
    consumoNocheKg?: number;
    conosTotales?: number;
    stockEnPickingKg?: number;
    stockEnReservaKg?: number;
    stockActualTotalKg?: number;
    stockMinimoKg?: number;
    aPasarAPickingKg?: number;
    stockRestanteTotalKg?: number;
    aComprarKg?: number;
    posicionesPickingSugeridas?: string[];
    posicionesStockReserva?: string[];
    estadoAbastecimiento?: 'CRITICO_COMPRAR' | 'ALERTA_MINIMO' | 'REPONER_PICKING' | 'OK';
    articulosAsignados: {
        codigoArticulo: string;
        descripcionArticulo: string;
        maquinas: number[];
        docenasTejidas?: number;
        consumoKg?: number;
        isUnreviewed: boolean;
    }[];
}

export interface HojaRepartidorItem {
    id: string;
    area: string;
    shift?: string;
    maquinas: number[];
    maquinasCount: number;
    codigoArticulo: string;
    codigoOriginalPdf?: string;
    descripcionArticulo: string;
    talle: string;
    color: string;
    horasTejido?: number;
    mediasEstimadas?: number;
    paresEstimados?: number;
    docenasEstimadas?: number;
    cambiosDetalle?: string[];
    materiales: {
        codigo: string;
        descripcion: string;
        rol?: string;
        colorNombre?: string | null;
        kgPorDocena?: number;
        consumoKg?: number;
        conos?: number;
        posicionPicking?: string;
    }[];
    isUnreviewed: boolean;
}

export interface HojaPickingItem {
    id: string;
    itemId?: string;
    codigoMaterial: string;
    descripcionMaterial: string;
    categoriaNombre?: string | null;
    tono?: string | null;
    colorNombre?: string | null;
    proveedor?: string | null;
    rol: string;
    maquinasCount: number;
    maquinas: number[];
    areas: string[];
    articulos: string[];
    consumoDiaKg?: number;
    consumoMananaKg?: number;
    consumoNocheKg?: number;
    conosNecesarios?: number;
    stockEnPickingKg?: number;
    stockEnReservaKg?: number;
    stockActualTotalKg?: number;
    stockMinimoKg?: number;
    aPasarAPickingKg?: number;
    stockRestanteTotalKg?: number;
    aComprarKg?: number;
    posicionesPickingSugeridas?: string[];
    posicionesStockReserva?: string[];
    estadoAbastecimiento?: 'CRITICO_COMPRAR' | 'ALERTA_MINIMO' | 'REPONER_PICKING' | 'OK';
    hasUnreviewedArticles: boolean;
}

export interface ProduccionParseResult {
    planillaId?: string;
    creadoEn?: string;
    fechas: string[];
    turnos: string[];
    areas: string[];
    archivosProcesados: {
        filename: string;
        entriesCount: number;
        machinesFound: number[];
    }[];
    resumenAlertas: {
        totalArticulosDistintos: number;
        totalMaquinasAsignadas: number;
        articulosChequeados: number;
        articulosNoRevisados: number;
        articulosNoEncontrados: number;
        alertaGlobal: boolean;
        mensajeAlerta: string;
        totalMediasEstimadas?: number;
        totalParesEstimados?: number;
        totalDocenasEstimadas?: number;
        totalKilosHiladoDia?: number;
        totalCambiosProgramados08AM?: number;
        totalItemsReponerPicking?: number;
        totalItemsCriticosComprar?: number;
    };
    articulos: ArticuloProduccionSummary[];
    maquinas: ParsedMachineEntry[];
    colores: {
        color: string;
        maquinasCount: number;
        maquinas: number[];
        articulos: string[];
    }[];
    materiales: MaterialAsignadoSummary[];
    hojaRepartidor: HojaRepartidorItem[];
    hojaPicking: HojaPickingItem[];
}
