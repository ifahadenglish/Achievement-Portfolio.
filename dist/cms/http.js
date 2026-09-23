import { CmsError } from './errors.js';
export class HttpClient {
    cfg;
    fetchImpl;
    tokenProvider = () => Promise.resolve(null);
    constructor(cfg, fetchImpl) {
        this.cfg = cfg;
        this.fetchImpl = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
    }
    setTokenProvider(provider) {
        this.tokenProvider = provider;
    }
    get baseUrl() {
        return this.cfg.url;
    }
    /** apikey + the user's bearer token (if signed in), for transports other than fetch. */
    async authHeaders() {
        const headers = { apikey: this.cfg.publishableKey };
        const token = await this.tokenProvider();
        if (token)
            headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }
    async request(req) {
        const method = req.method ?? 'GET';
        const headers = { apikey: this.cfg.publishableKey, ...req.headers };
        // Only a real user JWT goes in Authorization. Anonymous calls rely on
        // the apikey header alone (works for publishable and legacy anon keys).
        if (req.auth !== false) {
            const token = await this.tokenProvider();
            if (token)
                headers['Authorization'] = `Bearer ${token}`;
        }
        let body;
        if (req.body !== undefined && req.body !== null) {
            const isRaw = typeof req.body === 'string' ||
                (typeof Blob !== 'undefined' && req.body instanceof Blob) ||
                (typeof FormData !== 'undefined' && req.body instanceof FormData) ||
                req.body instanceof ArrayBuffer ||
                ArrayBuffer.isView(req.body);
            if (isRaw) {
                body = req.body;
            }
            else {
                body = JSON.stringify(req.body);
                headers['Content-Type'] ??= 'application/json';
            }
        }
        const qs = req.query && [...req.query.keys()].length > 0 ? `?${req.query.toString()}` : '';
        const url = `${this.cfg.url}${req.path}${qs}`;
        const attempt = async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
            try {
                const init = { method, headers, signal: controller.signal };
                if (body !== undefined)
                    init.body = body;
                return await this.fetchImpl(url, init);
            }
            finally {
                clearTimeout(timer);
            }
        };
        let res;
        try {
            res = await attempt();
        }
        catch (first) {
            // Retry idempotent reads once on network failure.
            if (method !== 'GET')
                throw new CmsError('network', 'Network request failed.', { cause: first });
            try {
                res = await attempt();
            }
            catch (second) {
                throw new CmsError('network', 'Network request failed.', { cause: second });
            }
        }
        const text = await res.text();
        let parsed = null;
        if (text) {
            try {
                parsed = JSON.parse(text);
            }
            catch {
                parsed = text;
            }
        }
        if (!res.ok)
            throw req.mapError(res.status, parsed);
        return { data: parsed, status: res.status, headers: res.headers };
    }
}
//# sourceMappingURL=http.js.map