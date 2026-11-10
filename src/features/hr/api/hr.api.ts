import { api } from '../../../shared/api';

export interface Employee {
    id: string;
    legajo: string;
    fullName: string | null;
    primarySectorCode: string | null;
    subSector?: string | null;
    active: boolean;
    source: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface EmployeeMetrics {
    total: number;
    active: number;
    inactive: number;
    bySector: { sector: string; count: number }[];
}

export interface ProductivitySummary {
    totalOperariosActivos: number;
    totalGood: number;
    totalSecond: number;
    totalMechanical: number;
    totalHours: number;
    overallQualityPct: number;
    overallScrapPct: number;
}

export interface OperatorProductivity {
    employeeId: string | null;
    legajo: string;
    fullName: string;
    primarySectorCode: string | null;
    active: boolean;
    totalJornadas: number;
    totalGood: number;
    totalSecond: number;
    totalMechanical: number;
    totalRunSeconds: number;
    runHours: number;
    scrapPct: number;
    qualityPct: number;
    distinctMachines: number;
}

export interface ProductivityResponse {
    summary: ProductivitySummary;
    ranking: OperatorProductivity[];
}

export const hrApi = api.injectEndpoints({
    endpoints: (build) => ({
        getEmployees: build.query<Employee[], { q?: string; active?: boolean; sector?: string } | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params?.q) searchParams.append('q', params.q);
                if (params?.active !== undefined) searchParams.append('active', String(params.active));
                if (params?.sector) searchParams.append('sector', params.sector);
                const queryStr = searchParams.toString();
                return `hr/employees${queryStr ? `?${queryStr}` : ''}`;
            },
            providesTags: ['Employees'],
        }),
        getEmployeeMetrics: build.query<EmployeeMetrics, void>({
            query: () => 'hr/employees/metrics',
            providesTags: ['Employees'],
        }),
        getEmployeeProductivity: build.query<ProductivityResponse, { from?: string; to?: string; shift?: string; legajo?: string } | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params?.from) searchParams.append('from', params.from);
                if (params?.to) searchParams.append('to', params.to);
                if (params?.shift) searchParams.append('shift', params.shift);
                if (params?.legajo) searchParams.append('legajo', params.legajo);
                const queryStr = searchParams.toString();
                return `hr/employees/productivity${queryStr ? `?${queryStr}` : ''}`;
            },
            providesTags: ['Employees'],
        }),
        createEmployee: build.mutation<Employee, { legajo: string; fullName?: string; primarySectorCode?: string; sector?: string; subSector?: string; active?: boolean }>({
            query: (body) => ({
                url: 'hr/employees',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Employees'],
        }),
        updateEmployee: build.mutation<Employee, { id: string; data: Partial<Employee> & { sector?: string } }>({
            query: ({ id, data }) => ({
                url: `hr/employees/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Employees'],
        }),
        toggleEmployeeActive: build.mutation<Employee, string>({
            query: (id) => ({
                url: `hr/employees/${id}/toggle`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Employees'],
        }),
        deleteEmployee: build.mutation<void, string>({
            query: (id) => ({
                url: `hr/employees/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Employees'],
        }),
    }),
});

export const {
    useGetEmployeesQuery,
    useGetEmployeeMetricsQuery,
    useGetEmployeeProductivityQuery,
    useCreateEmployeeMutation,
    useUpdateEmployeeMutation,
    useToggleEmployeeActiveMutation,
    useDeleteEmployeeMutation,
} = hrApi;
