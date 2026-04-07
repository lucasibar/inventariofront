import { api } from '../../../shared/api';

export interface User {
    id: string;
    username: string;
    role: string;
    isActive: boolean;
    allowedDepotIds: string[];
}

export interface LoginResponse {
    access_token: string;
    user: User;
}

export interface LoginRequest {
    username: string;
    pass: string;
}

export const authApi = api.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation<LoginResponse, LoginRequest>({
            query: (credentials) => ({
                url: 'auth/login',
                method: 'POST',
                body: { username: credentials.username, password: credentials.pass },
            }),
        }),
        verifySession: build.query<User, void>({
            query: () => 'auth/me',
        }),
        getUsers: build.query<User[], void>({
            query: () => 'auth/users',
            providesTags: ['User'],
        }),
        createUser: build.mutation<User, Partial<User> & { password?: string }>({
            query: (body) => ({
                url: 'auth/users',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['User'],
        }),
        updateUser: build.mutation<User, { id: string; data: Partial<User> & { password?: string } }>({
            query: ({ id, data }) => ({
                url: `auth/users/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['User'],
        }),
    }),
});

export const { 
    useLoginMutation, 
    useVerifySessionQuery, 
    useGetUsersQuery, 
    useCreateUserMutation, 
    useUpdateUserMutation 
} = authApi;

