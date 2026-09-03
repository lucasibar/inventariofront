import { api } from '../../shared/api';

export interface AuditLog {
    id: string;
    method: string;
    path: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
    resource: string;
    resourceId: string | null;
    actorId: string | null;
    actorUsername: string | null;
    actorRole: string | null;
    actorSector: string | null;
    statusCode: number | null;
    success: boolean;
    durationMs: number;
    errorMessage: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
}

export interface AuditPage {
    data: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const auditApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getAuditLogs: builder.query<AuditPage, { page: number; pageSize: number; actor?: string; resource?: string; action?: string; success?: boolean; from?: string; to?: string }>({
            query: (filters) => {
                const params = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
                if (filters.actor) params.set('actor', filters.actor);
                if (filters.resource) params.set('resource', filters.resource);
                if (filters.action) params.set('action', filters.action);
                if (filters.success !== undefined) params.set('success', String(filters.success));
                if (filters.from) params.set('from', filters.from);
                if (filters.to) params.set('to', filters.to);
                return `audit-logs?${params}`;
            },
            providesTags: ['Audit'],
        }),
    }),
});

export const { useGetAuditLogsQuery } = auditApi;
