import { CmsError } from './errors.js';
import { TableClient } from './rest.js';
import { validateInsert, validateUpdate } from './validation.js';
const byId = (id) => [{ column: 'id', op: 'eq', value: id }];
/** Sort values are spaced by 10; only rows whose value changes are written. */
async function writeOrder(table, ids, current) {
    for (const [i, id] of ids.entries()) {
        const next = (i + 1) * 10;
        if (current[id] === next)
            continue;
        await table.updateWhere(byId(id), { sort_order: next });
    }
}
class Collection {
    name;
    guard;
    table;
    constructor(http, name, guard) {
        this.name = name;
        this.guard = guard;
        this.table = new TableClient(http, name);
    }
    /** All rows, drafts included, in display order. */
    async list(filters = []) {
        await this.guard();
        return this.table.list({ filters, order: [{ column: 'sort_order' }, { column: 'created_at' }] });
    }
    async get(id) {
        await this.guard();
        const row = await this.table.maybeOne({ filters: byId(id) });
        if (!row)
            throw new CmsError('not_found', `${this.name} ${id} not found.`);
        return row;
    }
    async create(input) {
        await this.guard();
        return this.table.insert(validateInsert(this.name, input));
    }
    async update(id, patch) {
        await this.guard();
        const [row] = await this.table.updateWhere(byId(id), validateUpdate(this.name, patch));
        if (!row)
            throw new CmsError('not_found', `${this.name} ${id} not found.`);
        return row;
    }
    async remove(id) {
        await this.guard();
        await this.table.deleteWhere(byId(id));
    }
    /** Publish (true) or hide (false). */
    async setPublished(id, published) {
        await this.guard();
        const [row] = await this.table.updateWhere(byId(id), { is_published: published });
        if (!row)
            throw new CmsError('not_found', `${this.name} ${id} not found.`);
        return row;
    }
    /**
     * Persist a new order: ids in the order they should appear. Pass the
     * current sort values to skip rows that are already in place.
     */
    async reorder(ids, current = {}) {
        await this.guard();
        await writeOrder(this.table, ids, current);
    }
}
class Children {
    name;
    guard;
    table;
    constructor(http, name, guard) {
        this.name = name;
        this.guard = guard;
        this.table = new TableClient(http, name);
    }
    async listFor(parent) {
        await this.guard();
        return this.table.list({ filters: [parent], order: [{ column: 'sort_order' }] });
    }
    async create(input) {
        await this.guard();
        return this.table.insert(validateInsert(this.name, input));
    }
    async update(id, patch) {
        await this.guard();
        const [row] = await this.table.updateWhere(byId(id), validateUpdate(this.name, patch));
        if (!row)
            throw new CmsError('not_found', `${this.name} ${id} not found.`);
        return row;
    }
    async remove(id) {
        await this.guard();
        await this.table.deleteWhere(byId(id));
    }
    async reorder(ids, current = {}) {
        await this.guard();
        await writeOrder(this.table, ids, current);
    }
}
class Singleton {
    name;
    guard;
    table;
    constructor(http, name, guard) {
        this.name = name;
        this.guard = guard;
        this.table = new TableClient(http, name);
    }
    async get() {
        await this.guard();
        return this.table.maybeOne();
    }
    /** Updates the single row, creating it on first save. */
    async save(values) {
        await this.guard();
        const existing = await this.table.maybeOne();
        if (existing) {
            const [row] = await this.table.updateWhere([{ column: 'id', op: 'eq', value: true }], validateUpdate(this.name, values));
            if (!row)
                throw new CmsError('not_found', `${this.name} not found.`);
            return row;
        }
        return this.table.insert(validateInsert(this.name, values));
    }
}
export class AdminApi {
    storage;
    profile;
    siteSettings;
    stats;
    links;
    profileItems;
    experiences;
    evidenceCategories;
    evidence;
    achievements;
    courses;
    projects;
    projectLinks;
    participations;
    recommendations;
    attachments;
    evidenceLinks;
    mediaTable;
    guard;
    constructor(http, auth, storage) {
        this.storage = storage;
        this.guard = () => auth.requireAdmin();
        const g = this.guard;
        this.profile = new Singleton(http, 'profile', g);
        this.siteSettings = new Singleton(http, 'site_settings', g);
        this.stats = new Collection(http, 'profile_stats', g);
        this.links = new Collection(http, 'profile_links', g);
        this.profileItems = new Collection(http, 'profile_items', g);
        this.experiences = new Collection(http, 'experiences', g);
        this.evidenceCategories = new Collection(http, 'evidence_categories', g);
        this.evidence = new Collection(http, 'evidence_items', g);
        this.achievements = new Collection(http, 'achievements', g);
        this.courses = new Collection(http, 'courses', g);
        this.projects = new Collection(http, 'projects', g);
        this.projectLinks = new Children(http, 'project_links', g);
        this.participations = new Collection(http, 'participations', g);
        this.recommendations = new Collection(http, 'recommendations', g);
        this.attachments = new Children(http, 'media_attachments', g);
        this.evidenceLinks = new TableClient(http, 'evidence_links');
        this.mediaTable = new TableClient(http, 'media');
    }
    // ---- media -------------------------------------------------------
    async listMedia(kind) {
        await this.guard();
        return this.mediaTable.list({
            filters: kind ? [{ column: 'kind', op: 'eq', value: kind }] : [],
            order: [{ column: 'created_at', ascending: false }],
        });
    }
    async uploadImage(input) {
        await this.guard();
        return this.storage.upload('image', input);
    }
    async uploadPdf(input) {
        await this.guard();
        return this.storage.upload('pdf', input);
    }
    async addExternalMedia(kind, url, alt) {
        await this.guard();
        return this.storage.registerExternal(kind, url, alt);
    }
    /** Fails with code `in_use` while any content still uses the file. */
    async deleteMedia(mediaId) {
        await this.guard();
        await this.storage.remove(mediaId);
    }
    async getMedia(ids) {
        await this.guard();
        const unique = [...new Set(ids)];
        if (!unique.length)
            return [];
        return this.mediaTable.list({ filters: [{ column: 'id', op: 'in', value: unique }] });
    }
    async updateMediaAlt(mediaId, alt) {
        await this.guard();
        return this.storage.updateAlt(mediaId, alt);
    }
    /**
     * Deletes media that nothing uses any more. Items still referenced
     * elsewhere are kept (the database answers `in_use`), so this is safe to
     * call after deleting or replacing content.
     */
    async releaseMedia(ids) {
        await this.guard();
        const deleted = [];
        const kept = [];
        for (const id of new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))) {
            try {
                await this.storage.remove(id);
                deleted.push(id);
            }
            catch (e) {
                if (e instanceof CmsError && (e.code === 'in_use' || e.code === 'not_found'))
                    kept.push(id);
                else
                    throw e;
            }
        }
        return { deleted, kept };
    }
    /**
     * Replace a file used by some content:
     *   1. upload + register the new file,
     *   2. `assign(newId)` — point the content at it,
     *   3. release the old file if nothing else uses it.
     * If step 2 fails, the new upload is removed again. No orphans either way.
     */
    async replaceFile(opts) {
        await this.guard();
        const created = await this.storage.upload(opts.kind, {
            file: opts.file,
            ...(opts.onProgress ? { onProgress: opts.onProgress } : {}),
            ...(opts.altAr !== undefined ? { altAr: opts.altAr } : {}),
            ...(opts.altEn !== undefined ? { altEn: opts.altEn } : {}),
        });
        try {
            await opts.assign(created.id);
        }
        catch (e) {
            await this.storage.remove(created.id).catch(() => undefined);
            throw e;
        }
        if (opts.oldId && opts.oldId !== created.id)
            await this.releaseMedia([opts.oldId]);
        return created;
    }
    // ---- galleries ---------------------------------------------------
    async attachMedia(owner, mediaId, caption) {
        const ownerCols = 'achievementId' in owner ? { achievement_id: owner.achievementId }
            : 'projectId' in owner ? { project_id: owner.projectId }
                : { participation_id: owner.participationId };
        return this.attachments.create({
            media_id: mediaId,
            ...ownerCols,
            ...(caption?.ar !== undefined ? { caption_ar: caption.ar } : {}),
            ...(caption?.en !== undefined ? { caption_en: caption.en } : {}),
        });
    }
    // ---- evidence links ----------------------------------------------
    async linkEvidence(evidenceId, target) {
        await this.guard();
        const targetCols = 'experienceId' in target ? { experience_id: target.experienceId }
            : 'achievementId' in target ? { achievement_id: target.achievementId }
                : { project_id: target.projectId };
        return this.evidenceLinks.insert(validateInsert('evidence_links', { evidence_id: evidenceId, ...targetCols }));
    }
    async unlinkEvidence(linkId) {
        await this.guard();
        await this.evidenceLinks.deleteWhere(byId(linkId));
    }
    async listEvidenceLinks(evidenceId) {
        await this.guard();
        return this.evidenceLinks.list({ filters: [{ column: 'evidence_id', op: 'eq', value: evidenceId }] });
    }
    /** Links pointing at one experience / achievement / project. */
    async listEvidenceLinksFor(target) {
        await this.guard();
        const [column, value] = 'experienceId' in target ? ['experience_id', target.experienceId]
            : 'achievementId' in target ? ['achievement_id', target.achievementId]
                : ['project_id', target.projectId];
        return this.evidenceLinks.list({ filters: [{ column, op: 'eq', value }] });
    }
}
//# sourceMappingURL=admin-api.js.map