
export enum ItemCategory {
    YARN = 'YARN',
    WIP_BAG = 'WIP_BAG',
    FINISHED_BOX = 'FINISHED_BOX',
    SUPPLY = 'SUPPLY',
    SPARE_PART = 'SPARE_PART',
}

export interface CreateRemitoDto {
    provider: RemitoProviderDto;
    items: RemitoItemDto[];
    documentId: string;
    userId: string;
    depotId: string;
}

export interface RemitoProviderDto {
    id?: string;
    name: string;
    taxId?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface RemitoItemDto {
    itemId?: string;
    codigoInterno: string;
    descripcion: string;
    categoria: ItemCategory;
    unidadPrincipal: string; // If creating new
    unidadSecundaria?: string; // If creating new
    trackLot: boolean;
    quantity: number;
    lotId?: string;
}
