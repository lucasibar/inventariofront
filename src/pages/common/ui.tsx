import React from 'react';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
                <h1 style={{ color: '#f3f4f6', fontSize: '22px', fontWeight: 700, margin: 0 }}>{title}</h1>
                {subtitle && <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>{subtitle}</p>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>{children}</div>
        </div>
    );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '12px', overflow: 'hidden', ...style }}>
            {children}
        </div>
    );
}

export function Btn({ children, onClick, variant = 'primary', small, disabled, style }: {
    children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; variant?: 'primary' | 'secondary' | 'danger';
    small?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) {
    const colors = {
        primary: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        secondary: 'transparent',
        danger: 'rgba(239,68,68,0.15)',
    };
    const textColor = { primary: '#fff', secondary: '#9ca3af', danger: '#f87171' };
    return (
        <button
            onClick={onClick} disabled={disabled}
            style={{
                background: colors[variant], color: textColor[variant],
                border: variant === 'secondary' ? '1px solid #374151' : variant === 'danger' ? '1px solid rgba(239,68,68,0.3)' : 'none',
                borderRadius: '8px', padding: small ? '4px 10px' : '8px 16px',
                fontSize: small ? '12px' : '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s', ...style,
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

export function Select({ label, value, onChange, options, style }: {
    label?: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; style?: React.CSSProperties;
}) {
    return (
        <div style={style}>
            {label && <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</label>}
            <select
                value={value} onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px',
                    padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                    {cols.map((c, i) => (
                        <th key={i} style={{ padding: '10px 16px', color: '#6b7280', fontSize: '11px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 && !loading && (
                    <tr><td colSpan={cols.length} style={{ padding: '32px', textAlign: 'center', color: '#4b5563', fontSize: '14px' }}>Todavía no hay datos cargados</td></tr>
                )}
                {loading && (
                    <tr><td colSpan={cols.length}><Spinner /></td></tr>
                )}
                {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e2133' }}>
                        {row.map((cell, j) => (
                            <td key={j} style={{ padding: '12px 16px', color: '#d1d5db', fontSize: '13px' }}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
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
