import { PUBLIC_BACKEND_BASE_URL } from '$env/static/public';

const defaultBaseUrl = 'http://127.0.0.1:8080';

export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

const sessionExpiredEventName = 'foodhelper-session-expired';

export function apiBaseUrl() {
	return PUBLIC_BACKEND_BASE_URL || defaultBaseUrl;
}

export function notifySessionExpired(message = 'La sesion ha caducado. Vuelve a iniciar sesion.') {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(sessionExpiredEventName, { detail: { message } }));
}

export function isSessionExpiredError(error: unknown) {
	return error instanceof ApiError && error.status === 401;
}

async function parseError(response: Response) {
	try {
		const payload = (await response.json()) as { message?: string };
		return payload.message || `Backend request failed with status ${response.status}`;
	} catch {
		return `Backend request failed with status ${response.status}`;
	}
}

type BackendRequestInit = RequestInit & {
	suppressSessionExpired?: boolean;
};

export async function request<T>(path: string, init?: BackendRequestInit): Promise<T> {
	const response = await fetch(`${apiBaseUrl()}${path}`, {
		...init,
		headers: {
			accept: 'application/json',
			'content-type': 'application/json',
			...(init?.headers ?? {})
		},
		cache: 'no-store'
	});

	if (!response.ok) {
		const message = await parseError(response);
		if (response.status === 401 && !init?.suppressSessionExpired) {
			notifySessionExpired();
		}
		throw new ApiError(response.status, message);
	}

	if (response.status === 204) return undefined as T;

	return (await response.json()) as T;
}

export async function checkHealth() {
	await request<{ status: string }>('/api/v1/health');
}
