import { CmsError, fromPostgrest } from './errors.js';
function encodeValue(f) {
    if (f.op === 'in') {
        const list = f.value.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
        return `in.(${list})`;
    }
    if (f.op === 'is')
        return `is.${f.value === null ? 'null' : String(f.value)}`;
    return `${f.op}.${String(f.value)}`;
}
/**
 * Thin, typed wrapper over PostgREST for one table. Results are typed
 * from the generated database types; embedded selects pass their own
 * result type explicitly.
 */
export class TableClient {
    http;
    table;
    constructor(http, table) {
        this.http = http;
        this.table = table;
    }
    path() {
        return `/rest/v1/${this.table}`;
    }
    async list(opts = {}) {
        const q = new URLSearchParams();
        q.set('select', opts.select ?? '*');
        for (const f of opts.filters ?? [])
            q.append(f.column, encodeValue(f));
        const top = (opts.order ?? []).filter((o) => !o.referencedTable);
        if (top.length)
            q.set('order', top.map((o) => `${o.column}.${o.ascending === false ? 'desc' : 'asc'}`).join(','));
        for (const o of (opts.order ?? []).filter((x) => x.referencedTable)) {
            q.append(`${o.referencedTable}.order`, `${o.column}.${o.ascending === false ? 'desc' : 'asc'}`);
        }
        if (opts.limit !== undefined)
            q.set('limit', String(opts.limit));
        const { data } = await this.http.request({ path: this.path(), query: q, mapError: fromPostgrest });
        return Array.isArray(data) ? data : [];
    }
    /** Exactly one row matching the filters, or null. */
    async maybeOne(opts = {}) {
        const rows = await this.list({ ...opts, limit: 2 });
        if (rows.length > 1)
            throw new CmsError('unknown', `Expected at most one ${this.table} row.`);
        return rows[0] ?? null;
    }
    async insert(values) {
        const { data } = await this.http.request({
            method: 'POST',
            path: this.path(),
            body: values,
            headers: { Prefer: 'return=representation' },
            mapError: fromPostgrest,
        });
        const row = data[0];
        if (!row)
            throw new CmsError('forbidden', `Insert into ${this.table} returned no row.`);
        return row;
    }
    /** Update rows matching `filters`; throws not_found when nothing changed. */
    async updateWhere(filters, patch) {
        const q = new URLSearchParams({ select: '*' });
        for (const f of filters)
            q.append(f.column, encodeValue(f));
        const { data } = await this.http.request({
            method: 'PATCH',
            path: this.path(),
            query: q,
            body: patch,
            headers: { Prefer: 'return=representation' },
            mapError: fromPostgrest,
        });
        // RLS hides rows instead of raising; zero rows = missing or not allowed.
        if (!data.length)
            throw new CmsError('not_found', `No ${this.table} row was updated.`);
        return data;
    }
    async deleteWhere(filters) {
        if (!filters.length)
            throw new CmsError('invalid', 'Refusing to delete without a filter.');
        const q = new URLSearchParams({ select: '*' });
        for (const f of filters)
            q.append(f.column, encodeValue(f));
        const { data } = await this.http.request({
            method: 'DELETE',
            path: this.path(),
            query: q,
            headers: { Prefer: 'return=representation' },
            mapError: fromPostgrest,
        });
        if (!data.length)
            throw new CmsError('not_found', `No ${this.table} row was deleted.`);
        return data;
    }
}
//# sourceMappingURL=rest.js.map