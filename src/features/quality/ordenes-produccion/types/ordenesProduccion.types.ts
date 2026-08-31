export type EstadoRevisionArticulo = 'PENDIENTE' | 'CON_DUDAS' | 'CHEQUEADO' | 'INCOMPLETO' | 'NO_ENCONTRADO';

export interface ParsedMachineEntry {
    machine: number;
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
}

export interface ArticuloProduccionSummary {
    codigo: string;
    codigoOriginalPdf: string;
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
    }[];
    estadoRevision: EstadoRevisionArticulo;
    isUnreviewed: boolean;
    advertencia?: string;
    itemRefs: any[];
    articuloId?: string;
}

export interface MaterialAsignadoSummary {
    itemId: string;
    codigoInterno: string;
    descripcion: string;
    rol: string;
    tono?: string | null;
    colorNombre?: string | null;
    proveedor?: string | null;
    rotacion?: string | null;
    unidadPrincipal?: string;
    maquinasCount: number;
    maquinas: number[];
    articulosAsignados: {
        codigoArticulo: string;
        descripcionArticulo: string;
        maquinas: number[];
        isUnreviewed: boolean;
    }[];
}

export interface HojaRepartidorItem {
    id: string;
    area: string;
    maquinas: number[];
    maquinasCount: number;
    codigoArticulo: string;
    descripcionArticulo: string;
    talle: string;
    color: string;
    materiales: {
        codigo: string;
        descripcion: string;
        rol: string;
        colorNombre?: string | null;
    }[];
    isUnreviewed: boolean;
}

export interface HojaPickingItem {
    id: string;
    codigoMaterial: string;
    descripcionMaterial: string;
    tono?: string | null;
    colorNombre?: string | null;
    proveedor?: string | null;
    rol: string;
    maquinasCount: number;
    maquinas: number[];
    areas: string[];
    articulos: string[];
    hasUnreviewedArticles: boolean;
}

export interface ProduccionParseResult {
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
