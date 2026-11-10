export const UserRole = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERARIO: 'OPERARIO',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserSector = {
  PRODUCCION: 'PRODUCCION',
  DESARROLLO: 'DESARROLLO',
  DEPOSITO: 'DEPOSITO',
  COMPRAS: 'COMPRAS',
  MANTENIMIENTO: 'MANTENIMIENTO',
  CALIDAD: 'CALIDAD',
  VENTAS: 'VENTAS',
  FINANZAS: 'FINANZAS',
  RRHH: 'RRHH',
} as const;
export type UserSector = typeof UserSector[keyof typeof UserSector];

export const ALL_SECTORS: { key: UserSector; label: string; icon: string }[] = [
  { key: 'PRODUCCION', label: 'Producción', icon: '⚙️' },
  { key: 'DESARROLLO', label: 'Desarrollo', icon: '🧪' },
  { key: 'DEPOSITO', label: 'Depósito', icon: '🏭' },
  { key: 'COMPRAS', label: 'Compras', icon: '🛒' },
  { key: 'MANTENIMIENTO', label: 'Mantenimiento', icon: '🛠️' },
  { key: 'CALIDAD', label: 'Calidad', icon: '🎯' },
  { key: 'VENTAS', label: 'Ventas', icon: '📈' },
  { key: 'FINANZAS', label: 'Finanzas', icon: '💰' },
  { key: 'RRHH', label: 'Recursos Humanos', icon: '👥' },
];

export interface HRSectorOption {
  key: string;
  label: string;
  icon: string;
  category: string;
  subSector?: string;
}

export const HR_SECTORS_LIST: HRSectorOption[] = [
  { key: 'DEPOSITO_HILADO', label: 'Depósito - Hilado', icon: '🧵', category: 'DEPOSITO', subSector: 'HILADO' },
  { key: 'DEPOSITO_PACKAGING', label: 'Depósito - Packaging e Insumos', icon: '📦', category: 'DEPOSITO', subSector: 'PACKAGING' },
  { key: 'TEJEDURIA', label: 'Tejeduría', icon: '⚙️', category: 'TEJEDURIA' },
  { key: 'DESARROLLO', label: 'Desarrollo', icon: '🧪', category: 'DESARROLLO' },
  { key: 'COMPRAS', label: 'Compras', icon: '🛒', category: 'COMPRAS' },
  { key: 'MANTENIMIENTO', label: 'Mantenimiento', icon: '🛠️', category: 'MANTENIMIENTO' },
  { key: 'CALIDAD', label: 'Calidad', icon: '🎯', category: 'CALIDAD' },
  { key: 'VENTAS', label: 'Ventas', icon: '📈', category: 'VENTAS' },
  { key: 'FINANZAS', label: 'Finanzas', icon: '💰', category: 'FINANZAS' },
  { key: 'RRHH', label: 'Recursos Humanos', icon: '👥', category: 'RRHH' },
];
