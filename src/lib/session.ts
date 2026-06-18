import type { AuthResponse } from '$lib/api/auth';

const sessionStorageKey = 'foodhelper_session';

export type AuthSession = {
	userId: number;
	username: string;
	accessToken: string;
	tokenType: string;
	expiresAt: string;
};

export type PublicAuthSession = Omit<AuthSession, 'accessToken'>;

export function toAuthSession(auth: AuthResponse): AuthSession {
	return {
		userId: auth.userId,
		username: auth.username,
		accessToken: auth.accessToken,
		tokenType: auth.tokenType || 'Bearer',
		expiresAt: auth.expiresAt
	};
}

export function publicAuthSession(session: AuthSession): PublicAuthSession {
	return {
		userId: session.userId,
		username: session.username,
		tokenType: session.tokenType,
		expiresAt: session.expiresAt
	};
}

export function authorizationHeader(session: AuthSession) {
	return `${session.tokenType || 'Bearer'} ${session.accessToken}`;
}

export function saveAuthSession(session: AuthSession) {
	localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearAuthSession() {
	localStorage.removeItem(sessionStorageKey);
}

export function readAuthSession() {
	const raw = localStorage.getItem(sessionStorageKey);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as Partial<AuthSession>;
		if (
			typeof parsed.userId !== 'number' ||
			typeof parsed.username !== 'string' ||
			typeof parsed.accessToken !== 'string' ||
			typeof parsed.tokenType !== 'string' ||
			typeof parsed.expiresAt !== 'string'
		) {
			clearAuthSession();
			return null;
		}

		if (Number.isNaN(new Date(parsed.expiresAt).getTime()) || new Date(parsed.expiresAt).getTime() <= Date.now()) {
			clearAuthSession();
			return null;
		}

		return parsed as AuthSession;
	} catch {
		clearAuthSession();
		return null;
	}
}
