import React, { useState } from 'react';
import type { ArticuloProduccionSummary } from '../types/ordenesProduccion.types';
import { useGetArticulosQuery, useUpdateArticuloMutation } from '../../../desarrollo/api/articulos.api';
import { Modal, Btn, Input, Badge, Spinner } from '../../../../shared/ui';

interface ConciliarSusiModalProps {
    isOpen: boolean;
    onClose: () => void;
    articuloSusi: ArticuloProduccionSummary | null;
    onSuccess?: (codigoSusiAsignado: string, articuloVinculadoCodigo: string) => void;
}

export const ConciliarSusiModal: React.FC<ConciliarSusiModalProps> = ({
    isOpen,
    onClose,
    articuloSusi,
    onSuccess,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedArticuloId, setSelectedArticuloId] = useState<string>('');
    const [selectedArticuloCodigo, setSelectedArticuloCodigo] = useState<string>('');

    const codigoSusiRaw = articuloSusi?.codigoOriginalPdf || articuloSusi?.codigoSusi || articuloSusi?.codigo || '';

    // Buscar articulos de etapa TEJIDO en el catalogo
    const { data: articulosTejidoData, isLoading: loadingArticulos } = useGetArticulosQuery(
        {
            etapa: 'TEJIDO',
            search: searchTerm || undefined,
            limit: 15,
        },
        { skip: !isOpen }
    );

    const [updateArticulo, { isLoading: isUpdating }] = useUpdateArticuloMutation();

    if (!isOpen || !articuloSusi) return null;

    const handleConfirmarVinculacion = async () => {
        if (!selectedArticuloId || !codigoSusiRaw) {
            alert('Por favor selecciona un artículo de tejido del catálogo para vincular.');
            return;
        }

        try {
            await updateArticulo({
                id: selectedArticuloId,
                data: {
                    codigoSusi: codigoSusiRaw.trim(),
                },
            }).unwrap();

            alert(`¡Código SUSI "${codigoSusiRaw}" vinculado exitosamente al artículo ${selectedArticuloCodigo}!`);
            if (onSuccess) {
                onSuccess(codigoSusiRaw, selectedArticuloCodigo);
            }
            onClose();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al vincular el código SUSI al artículo');
        }
    };

    return (
        <Modal
            onClose={onClose}
            title="⚡ Asistente de Conciliación In-Situ (Código Susana / PDF)"
            wide
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Datos del código en el PDF */}
                <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '14px',
                }}>
                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                        Datos leídos en el PDF de Tejeduría de Susana:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                            Código PDF: <span style={{ color: '#fbbf24' }}>{codigoSusiRaw}</span>
                        </span>
                        {articuloSusi.marca && <Badge color="#60a5fa">{articuloSusi.marca}</Badge>}
                        {articuloSusi.talles.length > 0 && <Badge color="#8b5cf6">Talles: {articuloSusi.talles.join(', ')}</Badge>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '6px' }}>
                        Descripción: {articuloSusi.descripcion || 'Sin descripción en PDF'}
                    </div>
                    {articuloSusi.maquinas.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            Máquinas asociadas: {articuloSusi.maquinas.map(m => `M${m}`).join(', ')}
                        </div>
                    )}
                </div>

                {/* Explicación */}
                <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.4' }}>
                    Seleccioná a qué <strong>artículo de tejido</strong> de nuestro catálogo técnico corresponde este código de Susana. El sistema recordará esta equivalencia permanentemente en la base de datos para todas las futuras planillas.
                </div>

                {/* Buscador de artículos de tejido */}
                <div>
                    <label style={{ fontSize: '12px', color: '#d1d5db', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                        🔍 Buscar artículo de tejido en Catálogo:
                    </label>
                    <Input
                        placeholder="Escribí modelo, código o descripción (ej: JZ0534, SX4700, BLANCO...)"
                        value={searchTerm}
                        onChange={(val) => setSearchTerm(val)}
                        inputProps={{ autoFocus: true }}
                    />
                </div>

                {/* Lista de resultados de candidatos */}
                <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                }}>
                    {loadingArticulos ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                            <Spinner /> Cargando artículos de tejido...
                        </div>
                    ) : articulosTejidoData?.items?.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                            No se encontraron artículos de tejido con ese término de búsqueda.
                        </div>
                    ) : (
                        articulosTejidoData?.items?.map((art) => {
                            const isSelected = selectedArticuloId === art.id;
                            return (
                                <div
                                    key={art.id}
                                    onClick={() => {
                                        setSelectedArticuloId(art.id);
                                        setSelectedArticuloCodigo(art.codigo);
                                    }}
                                    style={{
                                        padding: '10px 14px',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        cursor: 'pointer',
                                        background: isSelected ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, color: isSelected ? '#60a5fa' : '#f3f4f6', fontSize: '13px' }}>
                                            {art.codigo}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                            {art.descripcion} {[art.marca, art.talle].filter(Boolean).join(' • ')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {art.codigoSusi && (
                                            <Badge color="#8b5cf6">SUSI actual: {art.codigoSusi}</Badge>
                                        )}
                                        <input
                                            type="radio"
                                            checked={isSelected}
                                            onChange={() => {
                                                setSelectedArticuloId(art.id);
                                                setSelectedArticuloCodigo(art.codigo);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <Btn variant="secondary" onClick={onClose} disabled={isUpdating}>
                        Cancelar
                    </Btn>
                    <Btn
                        variant="primary"
                        onClick={handleConfirmarVinculacion}
                        disabled={!selectedArticuloId || isUpdating}
                    >
                        {isUpdating ? 'Vinculando...' : '✓ Vincular y Guardar Equivalencia'}
                    </Btn>
                </div>
            </div>
        </Modal>
    );
};
