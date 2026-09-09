import { api } from '../../../../shared/api';
export type CatalogRow = {id:string;code:string;external_code:string;size:string;brand:string;description:string;pairs:number|null;composition:string;designs:number};
export type MaterialGroup = {id:string;code:string;material:string;color:string;status:string;options:{itemId:string;code:string;description:string;enabled:boolean;preferred:boolean;active:boolean;unit:string;position:number}[]};
export type BomLine = {id:string;slot:string;role:string;groupId:string|null;childCode:string|null;quantity:number|null;unit:string;status:string;version:number;source:{percent?:number|null;scope?:string;zones?:string[];color?:string}};
export type CatalogDetail = {sku:{id:string;internalCode:string;external_code:string;description:string;brand:string;sizeNormalized:string;pairsPerPack:number|null;evidence:{compositionStatus:string;yarns:{material:string;percent:number|null;gramsPerSock:number|null;row:number}[];technical:{sheet:string;row:number;zones:Record<string,string>}[];elasticReview:{components:Record<string,{percent:number|null;status:string}>}}};boms:{id:string;internal_code:string;kind:string;size_normalized:string;multiplier:string;status:string;lines:BomLine[]}[]};
const catalogApi=api.injectEndpoints({endpoints:builder=>({
  getCatalogV2:builder.query<CatalogRow[],string>({query:q=>`catalog-v2?q=${encodeURIComponent(q)}`,providesTags:['Articulos']}),
  getCatalogGroups:builder.query<MaterialGroup[],void>({query:()=> 'catalog-v2/groups',providesTags:['Articulos']}),
  getCatalogDetail:builder.query<CatalogDetail,string>({query:id=>`catalog-v2/${id}`,providesTags:['Articulos']}),
  editCatalogLine:builder.mutation<void,{id:string;version:number;quantity:number|null;status:string;groupId?:string}>({query:({id,...body})=>({url:`catalog-v2/lines/${id}`,method:'PATCH',body}),invalidatesTags:['Articulos']}),
})});
export const {useGetCatalogV2Query,useGetCatalogGroupsQuery,useGetCatalogDetailQuery,useEditCatalogLineMutation}=catalogApi;
