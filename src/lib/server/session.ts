import type { Cookies } from '@sveltejs/kit';
import type { AuthResponse } from '$lib/server/auth-api';

const sessionCookie = 'foodhelper_session';

export type AuthSession = {
	userId: number;
	username: string;
	accessToken: string;
	tokenType: string;
	expiresAt: string;
};

export type PublicAuthSession = Omit<AuthSession, 'accessToken'>;

function cookieOptions(secure: boolean) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'strict' as const,
		secure
	};
}

function maxAgeSeconds(expiresAt: string) {
	const expiresAtMs = new Date(expiresAt).getTime();
	if (Number.isNaN(expiresAtMs)) return null;

	return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
}

function validSession(value: unknown): value is AuthSession {
	if (!value || typeof value !== 'object') return false;

	const session = value as Partial<AuthSession>;
	return (
		typeof session.userId === 'number' &&
		typeof session.username === 'string' &&
		typeof session.accessToken === 'string' &&
		typeof session.tokenType === 'string' &&
		typeof session.expiresAt === 'string'
	);
}

export function setAuthSession(cookies: Cookies, auth: AuthResponse, secure: boolean) {
	const maxAge = maxAgeSeconds(auth.expiresAt);
	const session: AuthSession = {
		userId: auth.userId,
		username: auth.username,
		accessToken: auth.accessToken,
		tokenType: auth.tokenType || 'Bearer',
		expiresAt: auth.expiresAt
	};

	cookies.set(sessionCookie, JSON.stringify(session), {
		...cookieOptions(secure),
		maxAge: maxAge ?? 60 * 60
	});
}

export function clearAuthSession(cookies: Cookies, secure: boolean) {
	cookies.delete(sessionCookie, cookieOptions(secure));
}

export function readAuthSession(cookies: Cookies, secure: boolean) {
	const raw = cookies.get(sessionCookie);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!validSession(parsed)) {
			clearAuthSession(cookies, secure);
			return null;
		}

		const maxAge = maxAgeSeconds(parsed.expiresAt);
		if (maxAge === null || maxAge <= 0) {
			clearAuthSession(cookies, secure);
			return null;
		}

		return parsed;
	} catch {
		clearAuthSession(cookies, secure);
		return null;
	}
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
