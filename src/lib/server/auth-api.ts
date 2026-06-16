import { request } from '$lib/server/backend-api';

export type LoginValues = {
	username: string;
	password: string;
};

export type RegisterValues = {
	username: string;
	password: string;
	registrationCode: string;
};

export type AuthResponse = {
	userId: number;
	username: string;
	accessToken: string;
	tokenType: string;
	expiresAt: string;
};

export async function login(values: LoginValues) {
	return await request<AuthResponse>('/api/v1/auth/login', {
		method: 'POST',
		body: JSON.stringify({
			username: values.username.trim(),
			password: values.password
		})
	});
}

export async function register(values: RegisterValues) {
	return await request<AuthResponse>('/api/v1/auth/register', {
		method: 'POST',
		body: JSON.stringify({
			username: values.username.trim(),
			password: values.password,
			registrationCode: values.registrationCode.trim()
		})
	});
}
