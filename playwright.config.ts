import { defineConfig } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:8080';
const frontendPort = Number(process.env.FRONTEND_PORT || 4173);
const mockBackendPort = Number(process.env.MOCK_BACKEND_PORT || 4010);
const mockBackendUrl = process.env.MOCK_BACKEND_URL || `http://127.0.0.1:${mockBackendPort}`;

export default defineConfig({
	use: {
		baseURL: `http://127.0.0.1:${frontendPort}`
	},
	webServer: useRealBackend
		? {
				command: `BACKEND_BASE_URL=${backendBaseUrl} npm run build && BACKEND_BASE_URL=${backendBaseUrl} npm run preview -- --host 127.0.0.1 --port ${frontendPort}`,
				port: frontendPort,
				reuseExistingServer: !process.env.CI
			}
		: [
				{
					command: `MOCK_BACKEND_PORT=${mockBackendPort} node tests/mock-backend.mjs`,
					port: mockBackendPort,
					reuseExistingServer: !process.env.CI
				},
				{
					command:
						`BACKEND_BASE_URL=${mockBackendUrl} npm run build && BACKEND_BASE_URL=${mockBackendUrl} npm run preview -- --host 127.0.0.1 --port ${frontendPort}`,
					port: frontendPort,
					reuseExistingServer: !process.env.CI
				}
			],
	testMatch: '**/*.e2e.{ts,js}'
});
