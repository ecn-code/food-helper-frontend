export type CacheLoadOptions = {
	force?: boolean;
	ttlMs?: number;
};

type CacheEntry<T> = {
	loadedAt: number;
	value: T;
};

/**
 * Small cache for client-side resources. Instances are intentionally scoped to
 * one authenticated session; callers should discard the instance on logout.
 */
export class ResourceCache<T> {
	private readonly entries = new Map<string, CacheEntry<T>>();
	private readonly pending = new Map<string, Promise<T>>();

	get(key: string, ttlMs = 60_000) {
		const entry = this.entries.get(key);
		if (!entry || Date.now() - entry.loadedAt >= ttlMs) return undefined;
		return entry.value;
	}

	async load(key: string, loader: () => Promise<T>, options: CacheLoadOptions = {}) {
		const ttlMs = options.ttlMs ?? 60_000;
		if (!options.force) {
			const cached = this.get(key, ttlMs);
			if (cached !== undefined) return cached;

			const inFlight = this.pending.get(key);
			if (inFlight) return inFlight;
		}

		const request = loader()
			.then((value) => {
				this.entries.set(key, { value, loadedAt: Date.now() });
				return value;
			})
			.finally(() => {
				if (this.pending.get(key) === request) {
					this.pending.delete(key);
				}
			});

		this.pending.set(key, request);
		return request;
	}

	invalidate(key: string) {
		this.entries.delete(key);
	}

	clear() {
		this.entries.clear();
		this.pending.clear();
	}
}
