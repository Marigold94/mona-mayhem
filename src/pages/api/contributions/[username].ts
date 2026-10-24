import type { APIRoute } from 'astro';

export const prerender = false;

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const UPSTREAM_TIMEOUT_MS = 8_000;
const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

type CacheEntry = {
	data: unknown;
	expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}

function getCached(username: string): { hit: boolean; data?: unknown } {
	const entry = cache.get(username);
	if (!entry) return { hit: false };
	if (entry.expiresAt <= Date.now()) {
		cache.delete(username);
		return { hit: false };
	}

	cache.delete(username);
	cache.set(username, entry);
	return { hit: true, data: entry.data };
}

function cacheResponse(username: string, data: unknown): void {
	if (cache.size >= MAX_CACHE_ENTRIES) {
		const oldestUsername = cache.keys().next().value;
		if (oldestUsername !== undefined) cache.delete(oldestUsername);
	}
	cache.set(username, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export const GET: APIRoute = async ({ params }) => {
	const requestedUsername = params.username;
	if (!requestedUsername || !USERNAME_PATTERN.test(requestedUsername)) {
		return jsonResponse({ error: 'Invalid GitHub username' }, 400);
	}
	const username = requestedUsername.toLowerCase();

	const cached = getCached(username);
	if (cached.hit) return jsonResponse(cached.data);

	const timeoutSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
	let upstream: Response;
	try {
		upstream = await fetch(`https://github.com/${encodeURIComponent(username)}.contribs`, {
			headers: { Accept: 'application/json' },
			signal: timeoutSignal,
		});
	} catch {
		return timeoutSignal.aborted
			? jsonResponse({ error: 'GitHub contribution request timed out' }, 504)
			: jsonResponse({ error: 'Unable to reach GitHub contribution service' }, 502);
	}

	if (upstream.status === 404) {
		return jsonResponse({ error: 'GitHub user not found' }, 404);
	}
	if (!upstream.ok) {
		return jsonResponse({ error: 'GitHub contribution service returned an error' }, 502);
	}

	let data: unknown;
	try {
		data = await upstream.json();
	} catch {
		if (timeoutSignal.aborted) {
			return jsonResponse({ error: 'GitHub contribution request timed out' }, 504);
		}
		return jsonResponse({ error: 'GitHub contribution service returned invalid JSON' }, 502);
	}

	cacheResponse(username, data);
	return jsonResponse(data);
};
