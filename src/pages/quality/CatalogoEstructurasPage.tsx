import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper } from '@mui/material';
import { useEditCatalogLineMutation, useGetCatalogDetailQuery, useGetCatalogGroupsQuery, useGetCatalogV2Query } from '../../features/quality/articulos/api/catalog-v2.api';
import type { BomLine, MaterialGroup } from '../../features/quality/articulos/api/catalog-v2.api';

const roles:Record<string,string>={COMPONENT:'Par componente',BASE:'Base',LOGO:'Logo',SIZE:'Talle tejido',TRIANGLE:'Triángulo',HEEL_TOE:'Talón y puntera',GOMA:'Goma',LYCRA:'Lycra',SEWING_YARN:'Costura',DESPERDICIO:'Desperdicio',PACKAGING:'Armado'};
const stages:Record<string,string>={PACK:'Pack terminado',SEWN_PAIR:'Par cosido',KNITTED_PAIR:'Par tejido'};
const statuses:Record<string,string>={UNKNOWN:'Pendiente',ESTIMATED:'Estimado',CONFIRMED:'Confirmado'};
function errorText(error:unknown) {
  if (error && typeof error==='object' && 'data' in error) {
    const data=error.data as {message?:string|string[]};return Array.isArray(data?.message)?data.message.join('. '):data?.message || 'No se pudo completar la operación.';
  }
  return 'No se pudo conectar con el servidor.';
}
function EditDialog({line,groups,stage,onClose}:{line:BomLine;groups:MaterialGroup[];stage:string;onClose:()=>void}) {
  const [quantity,setQuantity]=useState(line.quantity===null?'':String(line.unit==='KG'?line.quantity*1000:line.quantity));
  const [status,setStatus]=useState(line.status);const [groupId,setGroupId]=useState(line.groupId || '');
  const [save,{isLoading,error}]=useEditCatalogLineMutation();
  const selected=groups.find(g=>g.id===groupId);
  const allowed=groups.filter(g=>!['GOMA','LYCRA'].includes(line.role)||g.material===line.role);
  const parsed=Number(quantity.replace(',','.'));
  const valid=quantity.trim()==='' || Number.isFinite(parsed)&&parsed>0;
  async function submit() {
    if (!valid)return;
    try { await save({id:line.id,version:line.version,quantity:quantity.trim()===''?null:parsed/(line.unit==='KG'?1000:1),
      status:quantity.trim()===''?'UNKNOWN':status==='UNKNOWN'?'ESTIMATED':status,groupId}).unwrap();onClose(); } catch { /* Display mutation error below. */ }
  }
  return <Dialog open onClose={isLoading?undefined:onClose} fullWidth maxWidth="sm"><DialogTitle>Editar {roles[line.role] || line.role}</DialogTitle><DialogContent>
    <Stack gap={2} mt={1}>
      {error && <Alert severity="error">{errorText(error)}</Alert>}
      <TextField select label="Material y color" value={groupId} onChange={e=>setGroupId(e.target.value)}>
        {allowed.map(g=><MenuItem key={g.id} value={g.id}>{g.material} · {g.color} · {g.options.length} opciones{g.status==='DRAFT'?' · Por revisar':''}</MenuItem>)}
      </TextField>
      <TextField label={line.unit==='KG'?`Gramos por ${stage==='PACK'?'pack':'par'}`:`Unidades por ${stage==='PACK'?'pack':'par'}`} value={quantity} onChange={e=>setQuantity(e.target.value)} error={!valid} helperText="Dejar vacío si falta el consumo. No equivale a cero." slotProps={{htmlInput:{inputMode:'decimal'}}}/>
      <TextField select label="Estado de la cantidad" value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statuses).map(([v,t])=><MenuItem key={v} value={v}>{t}</MenuItem>)}</TextField>
      <Typography variant="subtitle2">Alternativas del grupo</Typography>
      {selected?.options.length?selected.options.map(o=><Typography key={o.itemId} variant="body2">{o.position}. {o.code} · {o.unit} {!o.enabled?'— Deshabilitada':o.preferred?'— Preferida':''}{!o.active?' — Ítem inactivo':''}</Typography>):<Alert severity="info">Este color todavía no tiene un ítem asociado.</Alert>}
    </Stack>
  </DialogContent><DialogActions><Button onClick={onClose} disabled={isLoading}>Cancelar</Button><Button variant="contained" onClick={submit} disabled={isLoading||!valid||!groupId}>Guardar</Button></DialogActions></Dialog>;
}
function Detail({id,onClose,groups}:{id:string;onClose:()=>void;groups:MaterialGroup[]}) {
  const {data,isLoading,error}=useGetCatalogDetailQuery(id);const [editing,setEditing]=useState<{line:BomLine;stage:string}|null>(null);
  const user=useSelector(selectCurrentUser);
  const canEdit=user?.role?.toUpperCase()==='ADMIN'||(user?.role?.toUpperCase()==='SUPERVISOR'&&['CALIDAD','PRODUCCION'].includes(user?.sector?.toUpperCase()));
  return <Dialog open onClose={onClose} fullWidth maxWidth="lg"><DialogTitle>{data?`${data.sku.external_code} · Talle ${data.sku.sizeNormalized}`:'Estructura del artículo'}</DialogTitle><DialogContent>
    {isLoading&&<CircularProgress/>}{error&&<Alert severity="error">{errorText(error)}</Alert>}
    {data&&<Stack gap={2}>
      <Typography>{data.sku.brand} · {data.sku.description} · {data.sku.pairsPerPack??'Sin definir'} pares por pack</Typography>
      <Alert severity="info">Los consumos de tejido y costura se muestran por par; los insumos de armado, por pack. Las alternativas sustituyen al material preferido; no se suman. Los valores estimados requieren revisión.</Alert>
      {data.sku.evidence.compositionStatus==='PENDING'&&<Alert severity="warning">Falta definir la composición de este pack. Sus fuentes e insumos conocidos están disponibles abajo.</Alert>}
      {data.boms.map(b=><Accordion key={b.id} defaultExpanded={b.kind==='PACK'}><AccordionSummary><Typography>{stages[b.kind]} · {b.internal_code} · {b.multiplier} por pack</Typography></AccordionSummary><AccordionDetails>
        <TableContainer><Table size="small"><TableHead><TableRow>{['Zona','Material / componente','Consumo','% de origen','Estado',''].map((x,i)=><TableCell key={i}>{x}</TableCell>)}</TableRow></TableHead><TableBody>
        {b.lines.map(l=>{const g=groups.find(g=>g.id===l.groupId);return <TableRow key={l.id}>
          <TableCell>{l.source.zones?.map(z=>roles[z]||z).join(' + ') || roles[l.role] || l.role}</TableCell><TableCell>{l.childCode || `${g?.material||''} ${g?.color||l.source.color||''}`}<br/><Typography variant="caption">{g?.options.find(o=>o.preferred)?.code || (g?'Sin ítem asignado':'')}</Typography></TableCell>
          <TableCell>{l.quantity===null?'Sin dato':l.unit==='KG'?`${(l.quantity*1000).toLocaleString('es-AR',{maximumFractionDigits:4})} g`:`${l.quantity} ${l.unit==='PAIR'?'pares':'unidades'}`}</TableCell>
          <TableCell>{l.source.percent==null?'—':`${(l.source.percent*100).toLocaleString('es-AR',{maximumFractionDigits:2})}%`} {l.source.scope==='ARTICLE_AVERAGE'&&<Typography variant="caption" display="block">Promedio de origen</Typography>}</TableCell>
          <TableCell><Chip size="small" label={statuses[l.status]} color={l.status==='UNKNOWN'?'warning':l.status==='ESTIMATED'?'default':'success'}/></TableCell>
          <TableCell>{canEdit&&!['COMPONENT','DESPERDICIO'].includes(l.role)&&<Button onClick={()=>setEditing({line:l,stage:b.kind})}>Editar</Button>}</TableCell>
        </TableRow>})}</TableBody></Table></TableContainer>
      </AccordionDetails></Accordion>)}
      <Accordion><AccordionSummary><Typography>Receta del archivo original</Typography></AccordionSummary><AccordionDetails>
        <Typography variant="body2" mb={1}>Porcentajes del artículo de origen. No representan necesariamente el reparto entre los pares distintos de un pack.</Typography>
        <Table size="small"><TableHead><TableRow><TableCell>Material</TableCell><TableCell>Porcentaje</TableCell><TableCell>Gramos por media de origen</TableCell><TableCell>Fila de origen</TableCell></TableRow></TableHead><TableBody>{data.sku.evidence.yarns.map((y,i)=><TableRow key={i}><TableCell>{y.material}</TableCell><TableCell>{y.percent==null?'Sin dato':(y.percent*100).toFixed(2)+'%'}</TableCell><TableCell>{y.gramsPerSock??'Sin dato'}</TableCell><TableCell>{y.row}</TableCell></TableRow>)}</TableBody></Table>
      </AccordionDetails></Accordion>
    </Stack>}
    {editing&&<EditDialog line={editing.line} stage={editing.stage} groups={groups} onClose={()=>setEditing(null)}/>}
  </DialogContent><DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions></Dialog>;
}
export default function CatalogoEstructurasPage() {
  const [q,setQ]=useState('');const [selected,setSelected]=useState<string|null>(null);const [pending,setPending]=useState(false);
  const {data=[],isLoading,error,refetch}=useGetCatalogV2Query('');const {data:groups=[],error:groupsError}=useGetCatalogGroupsQuery();
  const filtered=data.filter(r=>(!pending||r.composition==='PENDING')&&q.toLowerCase().split(/\s+/).every(w=>`${r.code} ${r.external_code} ${r.size} ${r.brand} ${r.description}`.toLowerCase().includes(w)));
  return <Box p={{xs:2,md:3}}><Stack gap={2}>
    <Typography variant="h4">Artículos y estructuras</Typography>
    <Typography color="text.secondary">Catálogo de pedidos pendientes, pares componentes e hilados por zona.</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap"><Chip label={`${data.length} artículos por talle`}/><Chip label={`${data.filter(r=>r.composition==='INTERPRETED').length} con composición`}/><Chip label={`${data.filter(r=>r.composition==='PENDING').length} por definir`}/></Stack>
    {error&&<Alert severity="error" action={<Button onClick={refetch}>Reintentar</Button>}>{errorText(error)}</Alert>}
    {groupsError&&<Alert severity="error">No se pudieron cargar las alternativas: {errorText(groupsError)}</Alert>}
    <Stack direction={{xs:'column',sm:'row'}} gap={2}><TextField fullWidth label="Buscar código, marca, talle o descripción" value={q} onChange={e=>setQ(e.target.value)}/><Button onClick={()=>setPending(!pending)} variant={pending?'contained':'outlined'} sx={{minWidth:180}}>Composición pendiente</Button></Stack>
    {isLoading?<CircularProgress/>:<TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Artículo','Marca','Talle','Descripción','Pares/pack','Composición',''].map((x,i)=><TableCell key={i}>{x}</TableCell>)}</TableRow></TableHead><TableBody>
      {filtered.map(r=><TableRow key={r.id} hover><TableCell>{r.external_code}<Typography display="block" variant="caption">{r.code}</Typography></TableCell><TableCell>{r.brand}</TableCell><TableCell>{r.size}</TableCell><TableCell>{r.description}</TableCell><TableCell>{r.pairs??'Sin dato'}</TableCell><TableCell>{r.composition==='INTERPRETED'?`${r.designs} diseños`:'Por definir'}</TableCell><TableCell><Button onClick={()=>setSelected(r.id)}>Ver estructura</Button></TableCell></TableRow>)}
      {!filtered.length&&!error&&<TableRow><TableCell colSpan={7}>No hay artículos para esta búsqueda.</TableCell></TableRow>}
    </TableBody></Table></TableContainer>}
  </Stack>{selected&&<Detail id={selected} groups={groups} onClose={()=>setSelected(null)}/>}</Box>;
}
