
export type ItemCategory = 'YARN' | 'WIP_BAG' | 'FINISHED_BOX' | 'SUPPLY' | 'SPARE_PART';

export interface CreateRemitoDto {
    numero: string;
    fecha: string;
    plantaId?: string;
    depotId?: string;
    supplierId?: string;
    supplierName?: string;
    taxId?: string; // Moving CUIT here
    observaciones?: string;
    lines: RemitoLineDto[];
}

export interface RemitoProviderDto {
    id?: string;
    name: string;
}

export interface RemitoLineDto {
    itemId?: string;
    codigoInterno: string;
    descripcion: string;
    lotNumber?: string;
    depositoId: string;
    posicionId: string;
    qtyPrincipal: number;
    qtySecundaria?: number;
    categoria?: ItemCategory;
}
