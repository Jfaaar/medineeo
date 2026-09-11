// Global Vitest setup. Loaded before each test file via vitest.config.ts.
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';

// VITE_API_BASE_URL is provided by frontend/.env.test (Vite auto-loads it
// in mode='test'). The MSW handlers wildcard the host, so any value works
// as long as the URL ends in '/api/v1'.

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// @testing-library/react's own auto-cleanup only registers itself when it
// finds `afterEach` on the global object, which requires vitest's `globals:
// true`. This project runs with `globals: false` (see vitest.config.ts), so
// without this, an unmounted component's portaled content (e.g. any <Modal>)
// leaks into the next test's DOM instead of being removed.
afterEach(() => cleanup());
