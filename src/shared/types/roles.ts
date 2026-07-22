export const UserRole = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERARIO: 'OPERARIO',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserSector = {
  DEPOSITO: 'DEPOSITO',
  COMPRAS: 'COMPRAS',
  MANTENIMIENTO: 'MANTENIMIENTO',
  PRODUCCION: 'PRODUCCION',
  VENTAS: 'VENTAS',
  FINANZAS: 'FINANZAS',
  RRHH: 'RRHH',
} as const;
export type UserSector = typeof UserSector[keyof typeof UserSector];
