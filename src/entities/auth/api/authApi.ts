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
    pass: string; // Matching backend expectation (though usually password)
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
    }),
});

export const { useLoginMutation } = authApi;
