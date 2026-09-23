import { CmsError, fromStorage } from './errors.js';
import { TableClient } from './rest.js';
import { isSafeHttpUrl, validateInsert, validateUpdate } from './validation.js';
/** Must match the bucket settings in the migration. */
export const BUCKET_RULES = {
    image: {
        bucket: 'media',
        maxBytes: 5 * 1024 * 1024,
        mime: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' },
    },
    pdf: {
        bucket: 'documents',
        maxBytes: 25 * 1024 * 1024,
        mime: { 'application/pdf': 'pdf' },
    },
};
function randomId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        return crypto.randomUUID();
    throw new CmsError('config', 'crypto.randomUUID is not available in this browser.');
}
/** Public URL for a media row (uploaded file or external link). */
export function mediaUrl(baseUrl, media) {
    if (media.external_url)
        return media.external_url;
    if (media.bucket_id && media.storage_path) {
        const path = media.storage_path.split('/').map(encodeURIComponent).join('/');
        return `${baseUrl}/storage/v1/object/public/${media.bucket_id}/${path}`;
    }
    return null;
}
export class StorageClient {
    http;
    media;
    constructor(http) {
        this.http = http;
        this.media = new TableClient(http, 'media');
    }
    url(media) {
        return mediaUrl(this.http.baseUrl, media);
    }
    /** Checks type and size before any network call. */
    static checkFile(kind, file) {
        const rule = BUCKET_RULES[kind];
        const ext = rule.mime[file.type];
        if (!ext) {
            const allowed = Object.keys(rule.mime).join(', ');
            throw new CmsError('validation', `Unsupported file type ${file.type || 'unknown'}.`, {
                issues: [{ field: 'file', message: `نوع الملف غير مسموح. المسموح: ${allowed}` }],
            });
        }
        if (file.size === 0) {
            throw new CmsError('validation', 'Empty file.', { issues: [{ field: 'file', message: 'الملف فارغ' }] });
        }
        if (file.size > rule.maxBytes) {
            throw new CmsError('validation', 'File too large.', {
                issues: [{ field: 'file', message: `حجم الملف أكبر من ${Math.round(rule.maxBytes / 1024 / 1024)} ميجابايت` }],
            });
        }
        return { ext, bucket: rule.bucket };
    }
    /**
     * Uploads a file and registers it in `media`. If registering fails the
     * uploaded object is removed again, so no orphan files are left behind.
     */
    async upload(kind, input) {
        const { ext, bucket } = StorageClient.checkFile(kind, input.file);
        const now = new Date();
        const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomId()}.${ext}`;
        const values = validateInsert('media', {
            kind,
            bucket_id: bucket,
            storage_path: path,
            mime_type: input.file.type,
            size_bytes: input.file.size,
            ...(input.width !== undefined ? { width: input.width } : {}),
            ...(input.height !== undefined ? { height: input.height } : {}),
            ...(input.altAr !== undefined ? { alt_ar: input.altAr } : {}),
            ...(input.altEn !== undefined ? { alt_en: input.altEn } : {}),
        });
        await this.putObject(bucket, path, input.file, input.onProgress);
        try {
            return await this.media.insert(values);
        }
        catch (e) {
            await this.removeObject(bucket, path).catch(() => undefined);
            throw e;
        }
    }
    /** Registers an existing external file (e.g. current ibb / Drive links). */
    async registerExternal(kind, url, alt) {
        if (!isSafeHttpUrl(url)) {
            throw new CmsError('validation', 'Invalid URL.', { issues: [{ field: 'external_url', message: 'الرابط غير صالح' }] });
        }
        const values = validateInsert('media', {
            kind,
            external_url: url,
            ...(alt?.ar !== undefined ? { alt_ar: alt.ar } : {}),
            ...(alt?.en !== undefined ? { alt_en: alt.en } : {}),
        });
        return this.media.insert(values);
    }
    /**
     * Deletes the media row first (the database refuses with `in_use` while
     * any content still points at it), then the stored file.
     */
    async remove(mediaId) {
        const [row] = await this.media.deleteWhere([{ column: 'id', op: 'eq', value: mediaId }]);
        if (row?.bucket_id && row.storage_path) {
            await this.removeObject(row.bucket_id, row.storage_path);
        }
    }
    /** Update the alt text of a media item. */
    async updateAlt(mediaId, alt) {
        const patch = validateUpdate('media', {
            ...(alt.ar !== undefined ? { alt_ar: alt.ar } : {}),
            ...(alt.en !== undefined ? { alt_en: alt.en } : {}),
        });
        const [row] = await this.media.updateWhere([{ column: 'id', op: 'eq', value: mediaId }], patch);
        if (!row)
            throw new CmsError('not_found', 'Media not found.');
        return row;
    }
    /**
     * PUT the object into Storage. fetch() cannot report upload progress, so
     * when a progress handler is given (browser) XMLHttpRequest is used.
     */
    async putObject(bucket, path, file, onProgress) {
        const headers = { 'Content-Type': file.type, 'x-upsert': 'false', 'cache-control': '3600' };
        if (!onProgress || typeof XMLHttpRequest === 'undefined') {
            await this.http.request({ method: 'POST', path: `/storage/v1/object/${bucket}/${path}`, body: file, headers, mapError: fromStorage });
            onProgress?.(1);
            return;
        }
        const auth = await this.http.authHeaders();
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.http.baseUrl}/storage/v1/object/${bucket}/${path}`);
            for (const [k, v] of Object.entries({ ...auth, ...headers }))
                xhr.setRequestHeader(k, v);
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && e.total > 0)
                    onProgress(Math.min(1, e.loaded / e.total));
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    onProgress(1);
                    resolve();
                    return;
                }
                let body = xhr.responseText;
                try {
                    body = JSON.parse(xhr.responseText);
                }
                catch {
                    /* keep text */
                }
                reject(fromStorage(xhr.status, body));
            };
            xhr.onerror = () => reject(new CmsError('network', 'Upload failed (network).'));
            xhr.ontimeout = () => reject(new CmsError('network', 'Upload timed out.'));
            xhr.send(file);
        });
    }
    async removeObject(bucket, path) {
        await this.http.request({
            method: 'DELETE',
            path: `/storage/v1/object/${bucket}`,
            body: { prefixes: [path] },
            mapError: fromStorage,
        });
    }
}
//# sourceMappingURL=storage.js.map