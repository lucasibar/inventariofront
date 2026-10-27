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
