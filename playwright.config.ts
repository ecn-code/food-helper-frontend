import { defineConfig } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const publicBackendBaseUrl = process.env.PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8080';
const frontendPort = Number(process.env.FRONTEND_PORT || 4173);
const mockBackendPort = Number(process.env.MOCK_BACKEND_PORT || 4010);
const mockBackendUrl = process.env.MOCK_BACKEND_URL || `http://127.0.0.1:${mockBackendPort}`;
const resolvedBackendBaseUrl = useRealBackend ? publicBackendBaseUrl : mockBackendUrl;

export default defineConfig({
	use: {
		baseURL: `http://127.0.0.1:${frontendPort}`
	},
	webServer: useRealBackend
		? {
				command: `PUBLIC_BACKEND_BASE_URL=${resolvedBackendBaseUrl} npm run build && PUBLIC_BACKEND_BASE_URL=${resolvedBackendBaseUrl} npm run preview -- --host 127.0.0.1 --port ${frontendPort}`,
				port: frontendPort,
				reuseExistingServer: !process.env.CI,
				timeout: 120000
			}
		: [
				{
					command: `MOCK_BACKEND_PORT=${mockBackendPort} node tests/mock-backend.mjs`,
					port: mockBackendPort,
					reuseExistingServer: !process.env.CI,
					timeout: 120000
				},
				{
					command:
						`PUBLIC_BACKEND_BASE_URL=${resolvedBackendBaseUrl} npm run build && PUBLIC_BACKEND_BASE_URL=${resolvedBackendBaseUrl} npm run preview -- --host 127.0.0.1 --port ${frontendPort}`,
					port: frontendPort,
					reuseExistingServer: !process.env.CI,
					timeout: 120000
				}
			],
	testMatch: '**/*.e2e.{ts,js}'
});
