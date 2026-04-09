import React, { useState, useEffect, useRef } from 'react';

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
}

export function PageHeader({ title, subtitle, children, hideTitleOnMobile }: { title: string; subtitle?: string; children?: React.ReactNode; hideTitleOnMobile?: boolean }) {
    const isMobile = useIsMobile();
    const shouldHideTitle = isMobile && hideTitleOnMobile;
    
    return (
        <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: isMobile ? '16px' : '24px', 
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {!shouldHideTitle && (
                <div style={{ minWidth: isMobile ? 'auto' : '200px', flex: 1 }}>
                    <h1 style={{ color: '#f3f4f6', fontSize: isMobile ? '18px' : '22px', fontWeight: 800, margin: 0 }}>{title}</h1>
                    {subtitle && <p style={{ color: '#6b7280', fontSize: '12px', margin: '4px 0 0' }}>{subtitle}</p>}
                </div>
            )}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginLeft: shouldHideTitle ? '0' : 'auto', 
                width: isMobile ? '100%' : 'auto',
                justifyContent: isMobile ? 'flex-end' : 'flex-start',
                flexWrap: 'wrap'
            }}>
                {children}
            </div>
        </div>
    );
}

export function Card({ children, style, className, onClick }: { 
    children: React.ReactNode; 
    style?: React.CSSProperties; 
    className?: string;
    onClick?: () => void;
}) {
    return (
        <div 
            className={className}
            onClick={onClick}
            style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '12px', overflow: 'hidden', ...style }}
        >
            {children}
        </div>
    );
}

export function Btn({ children, onClick, variant = 'primary', small, disabled, style, title }: {
    children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; variant?: 'primary' | 'secondary' | 'danger';
    small?: boolean; disabled?: boolean; style?: React.CSSProperties; title?: string;
}) {
    const colors = {
        primary: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        secondary: 'transparent',
        danger: 'rgba(239,68,68,0.15)',
    };
    const textColor = { primary: '#fff', secondary: '#9ca3af', danger: '#f87171' };
    return (
        <button
            onClick={onClick} disabled={disabled} title={title}
            style={{
                background: colors[variant], color: textColor[variant],
                border: variant === 'secondary' ? '1px solid #374151' : variant === 'danger' ? '1px solid rgba(239,68,68,0.3)' : 'none',
                borderRadius: '8px', padding: small ? '6px 10px' : '10px 18px',
                fontSize: small ? '11px' : '14px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', 
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                ...style,
            }}
        >{children}</button>
    );
}

export function Input({ label, value, onChange, type = 'text', placeholder, style }: {
    label?: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string; style?: React.CSSProperties;
}) {
    return (
        <div style={style}>
            {label && <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</label>}
            <input
                type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                style={{
                    width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px',
                    padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                }}
            />
        </div>
    );
}

export function Select({ label, value, onChange, options, style, disabled }: {
    label?: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; style?: React.CSSProperties;
    disabled?: boolean;
}) {
    return (
        <div style={style}>
            {label && <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</label>}
            <select
                value={value} onChange={e => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px',
                    padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                    colorScheme: 'dark',
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'default'
                }}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

export function GroupedSelect({ label, value, onChange, groups, style }: {
    label?: string; value: string; onChange: (v: string) => void;
    groups: { groupLabel: string; options: { value: string; label: string }[] }[];
    style?: React.CSSProperties;
}) {
    return (
        <div style={style}>
            {label && <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</label>}
            <select
                value={value} onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px',
                    padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                    colorScheme: 'dark'
                }}
            >
                <option value="">— Sin posición —</option>
                {groups.map(g => (
                    <optgroup key={g.groupLabel} label={`📦 ${g.groupLabel}`}>
                        {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                ))}
            </select>
        </div>
    );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{
                background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '16px',
                width: wide ? 'min(960px, 95vw)' : 'min(520px, 95vw)',
                maxHeight: '90vh', overflow: 'auto', padding: '24px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: '#f3f4f6', fontSize: '17px', fontWeight: 700, margin: 0 }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function Spinner() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div className="spinner" style={{
                width: '24px', height: '24px', border: '3px solid rgba(99, 102, 241, 0.1)',
                borderTop: '3px solid #6366f1', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }}></div>
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export function Table({ cols, rows, loading }: { cols: (string | React.ReactNode)[]; rows: (string | React.ReactNode)[][]; loading?: boolean }) {
    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                        {cols.map((c, i) => (
                            <th key={i} style={{ padding: '12px 16px', color: '#6b7280', fontSize: '11px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && !loading && (
                        <tr><td colSpan={cols.length} style={{ padding: '48px', textAlign: 'center', color: '#4b5563', fontSize: '14px' }}>No hay datos disponibles</td></tr>
                    )}
                    {loading && (
                        <tr><td colSpan={cols.length}><Spinner /></td></tr>
                    )}
                    {rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1e2133', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            {row.map((cell, j) => (
                                <td key={j} style={{ padding: '14px 16px', color: '#d1d5db', fontSize: '13px' }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function ActionMenu({ options }: { options: { label: string; onClick: () => void; icon?: string; color?: string }[] }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={menuRef} style={{ position: 'relative' }}>
            <button 
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2d3e', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', color: '#9ca3af' }}
            >
                •••
            </button>
            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                    background: '#1a1d2e', border: '1px solid #374151', borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)', zIndex: 100, minWidth: '160px',
                    overflow: 'hidden'
                }}>
                    {options.map((opt, i) => (
                        <div 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); opt.onClick(); setOpen(false); }}
                            style={{ 
                                padding: '10px 16px', fontSize: '13px', color: opt.color || '#d1d5db', 
                                cursor: 'pointer', borderBottom: i === options.length - 1 ? 'none' : '1px solid #2a2d3e',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            className="hoverable-option"
                        >
                            {opt.icon && <span>{opt.icon}</span>}
                            {opt.label}
                        </div>
                    ))}
                    <style>{`.hoverable-option:hover { background: rgba(99, 102, 241, 0.1); }`}</style>
                </div>
            )}
        </div>
    );
}

export function ResponsiveTable({ 
    desktopCols, 
    renderDesktopRow, 
    renderMobileCard,
    data,
    loading 
}: { 
    desktopCols: (string | React.ReactNode)[]; 
    renderDesktopRow: (item: any, index: number) => (string | React.ReactNode)[];
    renderMobileCard: (item: any, index: number) => React.ReactNode;
    data: any[];
    loading?: boolean;
}) {
    const isMobile = useIsMobile();
    
    if (loading) return <Spinner />;
    if (data.length === 0) return <div style={{ padding: '60px', textAlign: 'center', color: '#4b5563', border: '2px dashed #1e2133', borderRadius: '16px' }}>No hay registros para mostrar</div>;

    if (isMobile) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.map((item, i) => (
                    <Card key={i} style={{ padding: '16px', position: 'relative' }}>
                        {renderMobileCard(item, i)}
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <Table 
            cols={desktopCols} 
            rows={data.map((item, i) => renderDesktopRow(item, i))} 
        />
    );
}

export function Badge({ children, color = '#a5b4fc' }: { children: React.ReactNode; color?: string }) {
    return (
        <span style={{ background: `${color}20`, color, borderRadius: '99px', padding: '2px 10px', fontSize: '11px', fontWeight: 600 }}>
            {children}
        </span>
    );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>🔍</span>
            <input
                value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? 'Buscar...'}
                style={{
                    background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px',
                    padding: '8px 12px 8px 34px', color: '#f3f4f6', fontSize: '13px', outline: 'none', width: '240px',
                }}
            />
        </div>
    );
}

export function InfoTooltip({ text }: { text: string }) {
    return (
        <span 
            title={text} 
            style={{ 
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '14px', height: '14px', borderRadius: '50%', background: '#374151',
                color: '#9ca3af', fontSize: '10px', cursor: 'help', marginLeft: '6px'
            }}
        >?</span>
    );
}

export function EditableCell({ value, onSave, numeric }: { value: string; onSave: (v: string) => Promise<void>; numeric?: boolean }) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value);
    const [saving, setSaving] = React.useState(false);
    const ref = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

    const commit = async () => {
        if (draft === value) { setEditing(false); return; }
        setSaving(true);
        try {
            await onSave(draft);
            setEditing(false);
        } catch (e) {
            console.error("Error saving cell:", e);
        } finally {
            setSaving(false);
        }
    };

    if (!editing) return (
        <span
            onClick={() => { setDraft(value); setEditing(true); }}
            title="Click para editar"
            style={{
                cursor: 'pointer',
                borderBottom: '1px dashed #4b5563',
                paddingBottom: '1px',
                transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
            onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
        >{value || '—'}</span>
    );

    return (
        <input
            ref={ref}
            type={numeric ? 'number' : 'text'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            disabled={saving}
            style={{
                width: '100%', minWidth: '80px', background: '#0f1117', border: '1px solid #6366f1',
                borderRadius: '6px', padding: '3px 8px', color: '#f3f4f6',
                fontSize: '13px', outline: 'none',
            }}
        />
    );
}
