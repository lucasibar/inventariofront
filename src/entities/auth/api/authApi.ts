import { api } from '../../../shared/api';

export interface User {
    id: string;
    username: string;
    role: string;
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
    }),
});

export const { useLoginMutation, useVerifySessionQuery } = authApi;

