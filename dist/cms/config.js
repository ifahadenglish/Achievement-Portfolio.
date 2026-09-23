import { CmsError } from './errors.js';
function jwtRole(token) {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[1] === undefined)
        return undefined;
    try {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')));
        return typeof json.role === 'string' ? json.role : undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * Throws if the key could bypass RLS. This is the guard that keeps a
 * service_role / secret key from ever being shipped to the browser.
 */
export function assertPublishableKey(key) {
    if (!key || typeof key !== 'string') {
        throw new CmsError('config', 'Missing Supabase publishable key.');
    }
    if (key.startsWith('sb_secret_')) {
        throw new CmsError('config', 'A Supabase SECRET key was provided. Only the publishable key may be used in the browser.');
    }
    const role = jwtRole(key);
    if (role !== undefined && role !== 'anon') {
        throw new CmsError('config', `A Supabase key with role "${role}" was provided. Only the anon/publishable key may be used in the browser.`);
    }
    if (!key.startsWith('sb_publishable_') && role !== 'anon') {
        throw new CmsError('config', 'Unrecognised Supabase key format. Expected sb_publishable_… or the anon JWT.');
    }
}
export function resolveConfig(input) {
    let url;
    try {
        url = new URL(input.url);
    }
    catch {
        throw new CmsError('config', `Invalid Supabase URL: ${String(input.url)}`);
    }
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        throw new CmsError('config', 'Supabase URL must use https.');
    }
    assertPublishableKey(input.publishableKey);
    return {
        url: url.origin,
        publishableKey: input.publishableKey,
        timeoutMs: input.timeoutMs ?? 15000,
    };
}
//# sourceMappingURL=config.js.map