export class MediaCache {
    cms;
    map = new Map();
    constructor(cms) {
        this.cms = cms;
    }
    get(id) {
        return id ? this.map.get(id) : undefined;
    }
    put(row) {
        this.map.set(row.id, row);
    }
    forget(id) {
        this.map.delete(id);
    }
    /** Make sure these ids are loaded (one request for all missing ones). */
    async ensure(ids) {
        const missing = [...new Set(ids.filter((x) => !!x && !this.map.has(x)))];
        if (!missing.length)
            return;
        for (const row of await this.cms.admin.getMedia(missing))
            this.put(row);
    }
    url(id) {
        const m = this.get(id);
        return m ? this.cms.storage.url(m) : null;
    }
}
//# sourceMappingURL=context.js.map