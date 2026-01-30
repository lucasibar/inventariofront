import { api } from '../../../shared/api';

export const ItemCategory = {
    YARN: 'YARN',
    WIP_BAG: 'WIP_BAG',
    FINISHED_BOX: 'FINISHED_BOX',
    SUPPLY: 'SUPPLY',
    SPARE_PART: 'SPARE_PART',
} as const;

export type ItemCategory = typeof ItemCategory[keyof typeof ItemCategory];

export interface Item {
    id: string;
    codigoInterno: string;
    descripcion: string;
    categoria: ItemCategory;
    unidadPrincipal: string;
    cantidadPrincipal: number;
    unidadSecundaria: string | null;
    cantidadSecundaria: number | null;
    trackLot: boolean;
    activo: boolean;
}

export interface CreateItemDto {
    codigoInterno: string;
    descripcion: string;
    categoria: ItemCategory;
    unidadPrincipal: string;
    cantidadPrincipal: number;
    unidadSecundaria: string | null;
    cantidadSecundaria: number | null;
    trackLot: boolean;
}

export const itemApi = api.injectEndpoints({
    endpoints: (build) => ({
        createItem: build.mutation<Item, CreateItemDto>({
            query: (body) => ({
                url: 'items',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Items'],
        }),
        getItems: build.query<Item[], void>({
            query: () => 'items',
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Items' as const, id })),
                        { type: 'Items', id: 'LIST' },
                    ]
                    : [{ type: 'Items', id: 'LIST' }],
        }),
    }),
});

export const { useCreateItemMutation, useGetItemsQuery } = itemApi;
