import { CmsError, fromAuth, fromPostgrest } from './errors.js';
const STORAGE_KEY = 'portfolio-cms.session';
/** Refresh this many seconds before the access token expires. */
const REFRESH_MARGIN_S = 60;
/** localStorage when available (admin stays signed in), memory otherwise. */
export function defaultSessionStore() {
    let memory = null;
    const ls = () => {
        try {
            return typeof localStorage === 'undefined' ? null : localStorage;
        }
        catch {
            return null;
        }
    };
    return {
        load() {
            try {
                const raw = ls()?.getItem(STORAGE_KEY);
                if (raw)
                    return JSON.parse(raw);
            }
            catch {
                /* storage blocked or corrupt → fall back to memory */
            }
            return memory;
        },
        save(session) {
            memory = session;
            try {
                const s = ls();
                if (!s)
                    return;
                if (session)
                    s.setItem(STORAGE_KEY, JSON.stringify(session));
                else
                    s.removeItem(STORAGE_KEY);
            }
            catch {
                /* ignore */
            }
        },
    };
}
function toSession(t, now) {
    return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        expiresAt: t.expires_at ?? now + t.expires_in,
        user: { id: t.user.id, email: t.user.email ?? null },
    };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export class AuthClient {
    http;
    store;
    now;
    refreshing = null;
    adminCache = null;
    constructor(http, store, now = () => Math.floor(Date.now() / 1000)) {
        this.http = http;
        this.store = store;
        this.now = now;
        http.setTokenProvider(() => this.getAccessToken());
    }
    /** Email + password sign-in (sign-ups are disabled on the project). */
    async signIn(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const issues = [];
        if (!EMAIL_RE.test(cleanEmail))
            issues.push({ field: 'email', message: 'البريد الإلكتروني غير صالح' });
        if (!password)
            issues.push({ field: 'password', message: 'كلمة المرور مطلوبة' });
        if (issues.length)
            throw new CmsError('validation', 'Invalid sign-in input.', { issues });
        const q = new URLSearchParams({ grant_type: 'password' });
        const { data } = await this.http.request({
            method: 'POST',
            path: '/auth/v1/token',
            query: q,
            body: { email: cleanEmail, password },
            auth: false,
            mapError: fromAuth,
        });
        const session = toSession(data, this.now());
        this.store.save(session);
        this.adminCache = null;
        return session;
    }
    async signOut() {
        const session = this.store.load();
        this.store.save(null);
        this.adminCache = null;
        if (!session)
            return;
        try {
            await this.http.request({
                method: 'POST',
                path: '/auth/v1/logout',
                headers: { Authorization: `Bearer ${session.accessToken}` },
                auth: false,
                mapError: fromAuth,
            });
        }
        catch {
            /* local sign-out already done; server token will expire on its own */
        }
    }
    getSession() {
        return this.store.load();
    }
    /** Valid access token (refreshed if needed) or null when signed out. */
    async getAccessToken() {
        const session = this.store.load();
        if (!session)
            return null;
        if (session.expiresAt - REFRESH_MARGIN_S > this.now())
            return session.accessToken;
        const refreshed = await this.refresh(session);
        return refreshed?.accessToken ?? null;
    }
    refresh(session) {
        // Collapse concurrent refreshes into one request.
        this.refreshing ??= (async () => {
            try {
                const q = new URLSearchParams({ grant_type: 'refresh_token' });
                const { data } = await this.http.request({
                    method: 'POST',
                    path: '/auth/v1/token',
                    query: q,
                    body: { refresh_token: session.refreshToken },
                    auth: false,
                    mapError: fromAuth,
                });
                const next = toSession(data, this.now());
                this.store.save(next);
                return next;
            }
            catch (e) {
                if (e instanceof CmsError && (e.code === 'unauthorized' || e.code === 'invalid_credentials' || e.code === 'invalid')) {
                    this.store.save(null);
                    this.adminCache = null;
                    return null;
                }
                throw e;
            }
            finally {
                this.refreshing = null;
            }
        })();
        return this.refreshing;
    }
    /**
     * Asks the database (not the client) whether the current user is the admin:
     * RLS lets a signed-in user see only their own row in admin_users.
     */
    async isAdmin() {
        const session = this.store.load();
        if (!session)
            return false;
        if (this.adminCache?.userId === session.user.id)
            return this.adminCache.value;
        const q = new URLSearchParams({ select: 'user_id', user_id: `eq.${session.user.id}` });
        const { data } = await this.http.request({
            path: '/rest/v1/admin_users',
            query: q,
            mapError: fromPostgrest,
        });
        const value = Array.isArray(data) && data.length === 1;
        this.adminCache = { userId: session.user.id, value };
        return value;
    }
    /** Throws unless a signed-in admin is present. RLS remains the real guard. */
    async requireAdmin() {
        if (!this.store.load())
            throw new CmsError('unauthorized', 'Sign in required.');
        if (!(await this.isAdmin()))
            throw new CmsError('forbidden', 'Admin access required.');
    }
}
//# sourceMappingURL=auth.js.map