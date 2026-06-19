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

export function useSwipeNavigation(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);

    const minSwipeDistance = 70;

    const onTouchStart = (e: React.TouchEvent | TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = ('touches' in e) ? e.touches[0].clientX : (e as any).clientX;
    };

    const onTouchMove = (e: React.TouchEvent | TouchEvent) => {
        touchEnd.current = ('touches' in e) ? e.touches[0].clientX : (e as any).clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
        if (isRightSwipe && onSwipeRight) onSwipeRight();
    };

    return { onTouchStart, onTouchMove, onTouchEnd };
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
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div style={style}>
            {label && <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</label>}
            <div style={{ position: 'relative' }}>
                <input
                    type={currentType} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    style={{
                        width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px',
                        padding: '8px 10px', paddingRight: isPassword ? '35px' : '10px', color: '#f3f4f6', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                    }}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
                            padding: '4px', display: 'flex', alignItems: 'center', fontSize: '14px'
                        }}
                    >
                        {showPassword ? '👁️' : '🙈'}
                    </button>
                )}
            </div>
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

export function SearchSelect({ label, value, onChange, options, style, disabled, placeholder }: {
    label?: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; style?: React.CSSProperties;
    disabled?: boolean; placeholder?: string;
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selectedLabel = options.find(o => o.value === value)?.label || '';

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = options.filter(o => {
        if (!search) return true;
        return o.label.toLowerCase().includes(search.toLowerCase());
    });

    useEffect(() => {
        setHighlightedIndex(-1);
    }, [search, open]);

    useEffect(() => {
        if (open && highlightedIndex >= 0 && listRef.current) {
            const item = listRef.current.children[highlightedIndex] as HTMLElement;
            if (item) {
                const parent = listRef.current;
                if (item.offsetTop < parent.scrollTop) {
                    parent.scrollTop = item.offsetTop;
                } else if (item.offsetTop + item.offsetHeight > parent.scrollTop + parent.offsetHeight) {
                    parent.scrollTop = item.offsetTop + item.offsetHeight - parent.offsetHeight;
                }
            }
        }
    }, [highlightedIndex, open]);

    const handleSelect = (val: string) => {
        onChange(val);
        setOpen(false);
        setSearch('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setOpen(true);
                e.preventDefault();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
                handleSelect(filtered[highlightedIndex].value);
            } else if (filtered.length > 0) {
                handleSelect(filtered[0].value);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
        }
    };

    return (
        <div style={{ position: 'relative', ...style }} ref={ref}>
            {label && <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</label>}
            <div
                onClick={() => { if (!disabled) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); } }}
                style={{
                    width: '100%', background: '#0f1117', border: `1px solid ${open ? '#6366f1' : '#374151'}`, borderRadius: '8px',
                    padding: '0', color: '#f3f4f6', fontSize: '13px', boxSizing: 'border-box',
                    opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', position: 'relative', transition: 'border-color 0.2s',
                }}
            >
                <input
                    ref={inputRef}
                    value={open ? search : selectedLabel}
                    onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={value ? selectedLabel : (placeholder || 'Buscar...')}
                    disabled={disabled}
                    style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: '#f3f4f6', fontSize: '13px', padding: '8px 10px', boxSizing: 'border-box',
                        cursor: disabled ? 'not-allowed' : 'text',
                    }}
                />
                {value && !open && (
                    <button onClick={handleClear} style={{
                        background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
                        padding: '0 8px', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center'
                    }}>✕</button>
                )}
                <span style={{ padding: '0 8px', color: '#4b5563', fontSize: '10px', pointerEvents: 'none' }}>▼</span>
            </div>
            {open && (
                <div ref={listRef} style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: '#1a1d2e', border: '1px solid #374151', borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', zIndex: 200,
                    maxHeight: '200px', overflowY: 'auto',
                }}>
                    {filtered.length === 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#4b5563', fontSize: '12px' }}>Sin resultados</div>
                    )}
                    {filtered.map((o, i) => {
                        const isHighlighted = i === highlightedIndex;
                        const isSelected = o.value === value;
                        return (
                            <div
                                key={o.value || `empty-${i}`}
                                onClick={() => handleSelect(o.value)}
                                style={{
                                    padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                                    color: isSelected ? '#a5b4fc' : '#d1d5db',
                                    background: isHighlighted ? 'rgba(99, 102, 241, 0.2)' : (isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent'),
                                    borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #1e2133',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={() => setHighlightedIndex(i)}
                            >
                                {o.label}
                            </div>
                        );
                    })}
                </div>
            )}
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

export function PageLoader() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '350px',
            height: '100%',
            width: '100%',
            background: 'transparent',
            color: '#e6e1e5',
            fontFamily: 'Roboto, system-ui, sans-serif'
        }}>
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                width: '60px',
                height: '60px'
            }}>
                <div style={{
                    position: 'absolute',
                    width: '48px',
                    height: '48px',
                    border: '3px solid rgba(208, 188, 255, 0.08)',
                    borderTop: '3px solid #D0BCFF',
                    borderRadius: '50%',
                    animation: 'spin-page-loader 1s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                }}></div>
                <div style={{
                    position: 'absolute',
                    width: '28px',
                    height: '28px',
                    border: '3px solid rgba(204, 194, 220, 0.08)',
                    borderBottom: '3px solid #CCC2DC',
                    borderRadius: '50%',
                    animation: 'spin-page-loader-reverse 1.5s linear infinite'
                }}></div>
            </div>
            <div style={{
                fontSize: '12px',
                color: '#CAC4D0',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontWeight: 700,
                opacity: 0.8,
                animation: 'pulse-page-loader 1.5s ease-in-out infinite'
            }}>
                Cargando...
            </div>
            <style>{`
                @keyframes spin-page-loader { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes spin-page-loader-reverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
                @keyframes pulse-page-loader { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
            `}</style>
        </div>
    );
}

export function Table({ cols, rows, loading, minWidth = '100%', onRowClick }: { 
    cols: (string | React.ReactNode)[]; 
    rows: (string | React.ReactNode)[][]; 
    loading?: boolean; 
    minWidth?: string;
    onRowClick?: (index: number) => void;
}) {
    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                        {cols.map((c, i) => (
                            <th key={i} style={{ padding: '8px 10px', color: '#6b7280', fontSize: '11px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c}</th>
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
                        <tr 
                            key={i} 
                            onClick={() => onRowClick && onRowClick(i)}
                            style={{ 
                                borderBottom: '1px solid #1e2133', 
                                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                cursor: onRowClick ? 'pointer' : 'default',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={e => { if (onRowClick) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}
                        >
                            {row.map((cell, j) => (
                                <td key={j} style={{ padding: '8px 10px', color: '#d1d5db', fontSize: '13px' }}>{cell}</td>
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

export function EditableCell({ value, onSave, numeric, style, inputStyle }: { value: string; onSave: (v: string) => Promise<void>; numeric?: boolean; style?: React.CSSProperties; inputStyle?: React.CSSProperties }) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value);
    const [saving, setSaving] = React.useState(false);
    const [lastSavedValue, setLastSavedValue] = React.useState<string | null>(null);
    const ref = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

    React.useEffect(() => {
        setDraft(value);
    }, [value]);

    React.useEffect(() => {
        if (lastSavedValue === null) return;
        
        let isMatch = false;
        if (numeric) {
            const valNum = Number(value);
            const savedNum = Number(lastSavedValue);
            isMatch = !isNaN(valNum) && !isNaN(savedNum) && valNum === savedNum;
        } else {
            isMatch = value === lastSavedValue;
        }

        if (isMatch) {
            setLastSavedValue(null);
        }
    }, [value, lastSavedValue, numeric]);

    React.useEffect(() => {
        if (lastSavedValue === null) return;

        // Safety fallback: if after 6 seconds the value hasn't synced, clear the spinner
        const timeoutId = setTimeout(() => {
            setLastSavedValue(null);
        }, 6000);

        return () => clearTimeout(timeoutId);
    }, [lastSavedValue]);

    const commit = async () => {
        const isUnchanged = numeric
            ? Number(draft) === Number(value)
            : draft === value;
        if (isUnchanged) { setEditing(false); return; }
        
        setSaving(true);
        try {
            await onSave(draft);
            setLastSavedValue(draft);
            setEditing(false);
        } catch (e) {
            console.error("Error saving cell:", e);
        } finally {
            setSaving(false);
        }
    };

    if (lastSavedValue !== null) {
        return (
            <span
                style={{
                    color: '#9ca3af',
                    fontStyle: 'italic',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'not-allowed',
                    ...style
                }}
            >
                {lastSavedValue}
                <span className="mini-spinner" style={{
                    width: '10px',
                    height: '10px',
                    border: '2px solid rgba(99, 102, 241, 0.1)',
                    borderTop: '2px solid #6366f1',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite'
                }}></span>
            </span>
        );
    }

    if (!editing) return (
        <span
            onClick={() => { setDraft(value); setEditing(true); }}
            title="Click para editar"
            style={{
                cursor: 'pointer',
                borderBottom: '1px dashed #4b5563',
                paddingBottom: '1px',
                transition: 'color 0.2s',
                ...style
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
            onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
        >{value || '—'}</span>
    );

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
            <input
                ref={ref}
                type={numeric ? 'number' : 'text'}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
                disabled={saving}
                style={{
                    width: '100%', minWidth: '60px', background: '#0f1117', border: '1px solid #6366f1',
                    borderRadius: '6px', padding: '3px 8px', color: '#f3f4f6',
                    fontSize: '13px', outline: 'none',
                    paddingRight: saving ? '24px' : '8px',
                    ...inputStyle
                }}
            />
            {saving && (
                <span className="mini-spinner" style={{
                    position: 'absolute',
                    right: '8px',
                    width: '10px',
                    height: '10px',
                    border: '2px solid rgba(99, 102, 241, 0.1)',
                    borderTop: '2px solid #6366f1',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }}></span>
            )}
        </div>
    );
}
