import { describe, expect, it, vi } from 'vitest';
import { ResourceCache } from './resource-cache';

describe('ResourceCache', () => {
	it('reuses a fresh resource', async () => {
		const cache = new ResourceCache<number>();
		const loader = vi.fn(async () => 42);

		await expect(cache.load('products', loader)).resolves.toBe(42);
		await expect(cache.load('products', loader)).resolves.toBe(42);
		expect(loader).toHaveBeenCalledTimes(1);
	});

	it('deduplicates a request already in flight', async () => {
		const cache = new ResourceCache<number>();
		let resolve!: (value: number) => void;
		const loader = vi.fn(() => new Promise<number>((done) => (resolve = done)));

		const first = cache.load('products', loader);
		const second = cache.load('products', loader);
		resolve(7);

		await expect(Promise.all([first, second])).resolves.toEqual([7, 7]);
		expect(loader).toHaveBeenCalledTimes(1);
	});

	it('reloads after invalidation or a forced request', async () => {
		const cache = new ResourceCache<number>();
		const loader = vi.fn(async () => loader.mock.calls.length);

		await cache.load('stock', loader);
		await cache.load('stock', loader, { force: true });
		cache.invalidate('stock');
		await cache.load('stock', loader);

		expect(loader).toHaveBeenCalledTimes(3);
	});
});
