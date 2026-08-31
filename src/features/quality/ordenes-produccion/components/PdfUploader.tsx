import React, { useState, useRef } from 'react';
import { Card, Btn, Spinner } from '../../../../shared/ui';

interface PdfUploaderProps {
    onUpload: (files: File[]) => void;
    isLoading: boolean;
    hasData: boolean;
    onReset: () => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onUpload, isLoading, hasData, onReset }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).filter((f) =>
                f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf',
            );
            setSelectedFiles((prev) => {
                // Avoid duplicates by name
                const map = new Map<string, File>();
                prev.forEach((f) => map.set(f.name, f));
                newFiles.forEach((f) => map.set(f.name, f));
                return Array.from(map.values());
            });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
                f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf',
            );
            setSelectedFiles((prev) => {
                const map = new Map<string, File>();
                prev.forEach((f) => map.set(f.name, f));
                droppedFiles.forEach((f) => map.set(f.name, f));
                return Array.from(map.values());
            });
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAll = () => {
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleProcess = () => {
        if (selectedFiles.length === 0) return;
        onUpload(selectedFiles);
    };

    return (
        <Card
            style={{
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid var(--border-color, #2a2d3e)',
                background: 'var(--bg-secondary, #1a1d2e)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #f3f4f6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📂 Carga Masiva de PDFs — Órdenes de Producción Diarias</span>
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted, #9ca3af)' }}>
                        Selecciona o arrastra todos los archivos PDF del día (Áreas 1 a 5, Turnos Mañana y Noche).
                    </p>
                </div>

                {hasData && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Btn
                            variant="secondary"
                            onClick={onReset}
                            style={{ fontSize: '13px', padding: '6px 14px' }}
                        >
                            🔄 Cargar Otra Planificación
                        </Btn>
                    </div>
                )}
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: isDragging ? '2px dashed #6366f1' : '2px dashed var(--border-color, #374151)',
                    borderRadius: '12px',
                    padding: '32px 20px',
                    textAlign: 'center',
                    background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f3f4f6)', marginBottom: '4px' }}>
                    Arrastra aquí tus archivos PDF o haz clic para seleccionarlos
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                    Puedes subir todos los PDFs juntos (ej: <code>25-08 1 M.pdf</code>, <code>25-08 1 N.pdf</code>, etc.)
                </div>
            </div>

            {/* Selected files chip list */}
            {selectedFiles.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#a5b4fc' }}>
                            {selectedFiles.length} archivo(s) seleccionado(s):
                        </span>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '12px',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                            }}
                        >
                            Limpiar selección
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
                        {selectedFiles.map((file, idx) => (
                            <div
                                key={`${file.name}_${idx}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 12px',
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    border: '1px solid rgba(99, 102, 241, 0.25)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: 'var(--text-primary, #f3f4f6)',
                                }}
                            >
                                <span>📄 {file.name}</span>
                                <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '10px' }}>
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFile(idx);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted, #9ca3af)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        lineHeight: 1,
                                        padding: '0 2px',
                                    }}
                                    title="Quitar archivo"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Btn
                            onClick={handleProcess}
                            disabled={isLoading || selectedFiles.length === 0}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 24px',
                                fontSize: '14px',
                                fontWeight: 700,
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="sm" />
                                    <span>Analizando y Cruzando con Catálogo...</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡ Procesar {selectedFiles.length} Órdenes de Producción</span>
                                </>
                            )}
                        </Btn>
                    </div>
                </div>
            )}
        </Card>
    );
};
