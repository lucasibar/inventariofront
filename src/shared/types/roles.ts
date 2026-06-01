export const UserRole = {
  ADMIN: 'ADMIN',
  COMPRAS: 'COMPRAS',
  OPERATOR: 'OPERATOR',
  SUPERVISOR: 'SUPERVISOR',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
