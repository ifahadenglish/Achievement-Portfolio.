/**
 * Client-side validation that mirrors the database constraints, plus a
 * few safety rules the database cannot express (e.g. http(s)-only URLs,
 * so a link can never become `javascript:`). The database stays the
 * final authority; this layer gives early, field-level Arabic messages.
 */
import { CmsError } from './errors.js';
export const DATE_PRECISIONS = ['year', 'month', 'day'];
export const PROFILE_ITEM_KINDS = ['vision', 'teaching_skill', 'technical_skill', 'tech_tag'];
export const COURSE_CATEGORIES = ['educational', 'other'];
export const PROJECT_CATEGORIES = ['interactive', 'strategies', 'presentations'];
export const MEDIA_KINDS = ['image', 'pdf'];
export const LANGUAGES = ['ar', 'en'];
const SHORT = 300;
const LONG = 10000;
const text = (max = SHORT, required = false) => ({ t: 'text', max, required });
const long = () => ({ t: 'text', max: LONG });
const url = (required = false) => ({ t: 'url', required });
const uuid = (required = false) => ({ t: 'uuid', required });
const date = (required = false) => ({ t: 'date', required });
const bool = { t: 'bool' };
const sort = { t: 'int', min: 0 };
const precision = { t: 'enum', values: DATE_PRECISIONS };
const icon = text(80);
/** Writable columns per table (ids and timestamps are never client-writable). */
const SCHEMAS = {
    media: {
        kind: { t: 'enum', values: MEDIA_KINDS, required: true }, bucket_id: { t: 'enum', values: ['media', 'documents'] },
        storage_path: text(500), external_url: url(), mime_type: text(100),
        size_bytes: { t: 'int', min: 0 }, width: { t: 'int', min: 1 }, height: { t: 'int', min: 1 },
        alt_ar: text(), alt_en: text(),
    },
    site_settings: {
        site_title_ar: text(SHORT, true), site_title_en: text(), meta_description_ar: text(500), meta_description_en: text(500),
        footer_text_ar: text(500), footer_text_en: text(500), og_image_id: uuid(),
        default_language: { t: 'enum', values: LANGUAGES },
    },
    profile: {
        full_name_ar: text(SHORT, true), full_name_en: text(), display_name_ar: text(), display_name_en: text(),
        job_title_ar: text(), job_title_en: text(), headline_ar: text(500), headline_en: text(500),
        bio_ar: long(), bio_en: long(), vision_ar: long(), vision_en: long(), mission_ar: long(), mission_en: long(),
        badge_ar: text(), badge_en: text(), tech_summary_ar: long(), tech_summary_en: long(),
        photo_id: uuid(), email: { t: 'email' }, phone: { t: 'phone' }, whatsapp: { t: 'phone' },
    },
    profile_stats: {
        label_ar: text(SHORT, true), label_en: text(), value: { t: 'int', min: 0, required: true }, suffix: text(10),
        sort_order: sort, is_published: bool,
    },
    profile_links: {
        label_ar: text(SHORT, true), label_en: text(), url: url(true), icon, sort_order: sort, is_published: bool,
    },
    profile_items: {
        kind: { t: 'enum', values: PROFILE_ITEM_KINDS, required: true }, title_ar: text(SHORT, true), title_en: text(),
        description_ar: long(), description_en: long(), icon, sort_order: sort, is_published: bool,
    },
    experiences: {
        job_title_ar: text(SHORT, true), job_title_en: text(), organization_ar: text(), organization_en: text(),
        location_ar: text(), location_en: text(), start_date: date(true), end_date: date(), date_precision: precision,
        is_current: bool, description_ar: long(), description_en: long(),
        responsibilities_ar: { t: 'textArray', max: 1000 }, responsibilities_en: { t: 'textArray', max: 1000 },
        achievements_ar: { t: 'textArray', max: 1000 }, achievements_en: { t: 'textArray', max: 1000 },
        icon, sort_order: sort, is_published: bool,
    },
    evidence_categories: {
        name_ar: text(SHORT, true), name_en: text(), icon, sort_order: sort, is_published: bool,
    },
    evidence_items: {
        category_id: uuid(true), title_ar: text(SHORT, true), title_en: text(), description_ar: long(), description_en: long(),
        note_ar: text(500), note_en: text(500), issuer_ar: text(), issuer_en: text(), evidence_date: date(),
        date_precision: precision, document_id: uuid(true), thumbnail_id: uuid(), sort_order: sort, is_published: bool,
    },
    achievements: {
        title_ar: text(SHORT, true), title_en: text(), description_ar: long(), description_en: long(),
        issuer_ar: text(), issuer_en: text(), achieved_on: date(), date_precision: precision, sort_order: sort, is_published: bool,
    },
    courses: {
        category: { t: 'enum', values: COURSE_CATEGORIES, required: true }, title_ar: text(SHORT, true), title_en: text(),
        provider_ar: text(), provider_en: text(), completed_on: date(), date_precision: precision,
        certificate_image_id: uuid(), certificate_file_id: uuid(), sort_order: sort, is_published: bool,
    },
    projects: {
        category: { t: 'enum', values: PROJECT_CATEGORIES, required: true }, title_ar: text(SHORT, true), title_en: text(),
        description_ar: long(), description_en: long(), cover_image_id: uuid(), is_wide: bool, sort_order: sort, is_published: bool,
    },
    project_links: {
        project_id: uuid(true), label_ar: text(SHORT, true), label_en: text(), url: url(true), sort_order: sort,
    },
    participations: {
        title_ar: text(SHORT, true), title_en: text(), description_ar: long(), description_en: long(),
        organization_ar: text(), organization_en: text(), participated_on: date(), date_precision: precision,
        sort_order: sort, is_published: bool,
    },
    recommendations: {
        quote_ar: text(2000, true), quote_en: text(2000), author_name_ar: text(SHORT, true), author_name_en: text(),
        author_role_ar: text(), author_role_en: text(), avatar_id: uuid(), icon, sort_order: sort, is_published: bool,
    },
    media_attachments: {
        media_id: uuid(true), achievement_id: uuid(), project_id: uuid(), participation_id: uuid(),
        caption_ar: text(500), caption_en: text(500), sort_order: sort,
    },
    evidence_links: {
        evidence_id: uuid(true), experience_id: uuid(), achievement_id: uuid(), project_id: uuid(),
    },
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 ()-]{6,20}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function isSafeHttpUrl(value) {
    try {
        const u = new URL(value);
        return u.protocol === 'https:' || u.protocol === 'http:';
    }
    catch {
        return false;
    }
}
function isValidDate(value) {
    const m = DATE_RE.exec(value);
    if (!m)
        return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
const MSG = {
    required: 'هذا الحقل مطلوب',
    tooLong: (n) => `الحد الأقصى ${n} حرفًا`,
    url: 'الرابط يجب أن يبدأ بـ https:// أو http://',
    email: 'البريد الإلكتروني غير صالح',
    phone: 'رقم الجوال غير صالح',
    enum: 'قيمة غير مسموحة',
    date: 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD',
    bool: 'قيمة غير صالحة',
    int: 'يجب أن يكون رقمًا صحيحًا',
    min: (n) => `يجب ألا يقل عن ${n}`,
    uuid: 'معرّف غير صالح',
    array: 'قائمة غير صالحة',
    unknown: 'حقل غير معروف',
};
function checkField(name, f, raw, issues) {
    const add = (message) => issues.push({ field: name, message });
    if (f.t === 'bool') {
        if (typeof raw !== 'boolean')
            add(MSG.bool);
        return raw;
    }
    if (f.t === 'textArray') {
        if (!Array.isArray(raw) || raw.some((x) => typeof x !== 'string')) {
            add(MSG.array);
            return raw;
        }
        const cleaned = raw.map((s) => s.trim()).filter((s) => s.length > 0);
        if (cleaned.some((s) => s.length > f.max))
            add(MSG.tooLong(f.max));
        return cleaned;
    }
    if (f.t === 'int') {
        if (raw === null && !f.required)
            return null;
        if (typeof raw !== 'number' || !Number.isInteger(raw)) {
            add(MSG.int);
            return raw;
        }
        if (f.min !== undefined && raw < f.min)
            add(MSG.min(f.min));
        return raw;
    }
    // String-based fields: trim, and turn '' into null for optional ones.
    if (raw !== null && typeof raw !== 'string') {
        add(MSG.required);
        return raw;
    }
    const value = typeof raw === 'string' ? raw.trim() : null;
    const required = 'required' in f && f.required === true;
    if (value === null || value === '') {
        if (required)
            add(MSG.required);
        return null;
    }
    switch (f.t) {
        case 'text':
            if (value.length > f.max)
                add(MSG.tooLong(f.max));
            break;
        case 'url':
            if (!isSafeHttpUrl(value))
                add(MSG.url);
            break;
        case 'email':
            if (!EMAIL_RE.test(value))
                add(MSG.email);
            break;
        case 'phone':
            if (!PHONE_RE.test(value))
                add(MSG.phone);
            break;
        case 'enum':
            if (!f.values.includes(value))
                add(MSG.enum);
            break;
        case 'date':
            if (!isValidDate(value))
                add(MSG.date);
            break;
        case 'uuid':
            if (!UUID_RE.test(value))
                add(MSG.uuid);
            break;
    }
    return value;
}
/** Rules that span several fields (mirroring table CHECK constraints). */
function crossChecks(table, v, mode, issues) {
    // On insert every rule applies; on update only when the patch touches it.
    const touches = (keys) => mode === 'insert' || keys.some((k) => k in v);
    if (table === 'experiences') {
        if (v['is_current'] === true && v['end_date'] != null) {
            issues.push({ field: 'end_date', message: 'الخبرة الحالية لا تحتاج تاريخ نهاية' });
        }
        const s = v['start_date'];
        const e = v['end_date'];
        if (typeof s === 'string' && typeof e === 'string' && e < s) {
            issues.push({ field: 'end_date', message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
        }
    }
    if (table === 'media') {
        const hasFile = v['storage_path'] != null || v['bucket_id'] != null;
        const hasUrl = v['external_url'] != null;
        if (touches(['storage_path', 'bucket_id', 'external_url'])) {
            if (hasFile === hasUrl) {
                issues.push({ field: 'external_url', message: 'يجب تحديد ملف مرفوع أو رابط خارجي (أحدهما فقط)' });
            }
        }
        if (v['bucket_id'] != null && v['kind'] != null) {
            const ok = (v['kind'] === 'image' && v['bucket_id'] === 'media') || (v['kind'] === 'pdf' && v['bucket_id'] === 'documents');
            if (!ok)
                issues.push({ field: 'bucket_id', message: 'نوع الملف لا يطابق مكان التخزين' });
        }
    }
    if (table === 'media_attachments' || table === 'evidence_links') {
        const keys = table === 'media_attachments'
            ? ['achievement_id', 'project_id', 'participation_id']
            : ['experience_id', 'achievement_id', 'project_id'];
        if (touches(keys)) {
            const n = keys.filter((k) => v[k] != null).length;
            if (n !== 1)
                issues.push({ field: keys[0] ?? 'target', message: 'يجب الربط بعنصر واحد فقط' });
        }
    }
}
function run(table, input, mode) {
    const schema = SCHEMAS[table];
    const issues = [];
    const out = {};
    const src = input;
    for (const key of Object.keys(src)) {
        if (!(key in schema))
            issues.push({ field: key, message: MSG.unknown });
    }
    for (const [name, field] of Object.entries(schema)) {
        if (!(name in src) || src[name] === undefined) {
            if (mode === 'insert' && 'required' in field && field.required)
                issues.push({ field: name, message: MSG.required });
            continue;
        }
        out[name] = checkField(name, field, src[name], issues);
    }
    crossChecks(table, out, mode, issues);
    if (mode === 'update' && Object.keys(src).length === 0) {
        issues.push({ field: '*', message: 'لا توجد تغييرات' });
    }
    if (issues.length) {
        throw new CmsError('validation', `Invalid ${table} ${mode}.`, { issues });
    }
    return out;
}
/** Validate + normalise a new row. Throws CmsError('validation'). */
export function validateInsert(table, input) {
    return run(table, input, 'insert');
}
/** Validate + normalise a partial update. Throws CmsError('validation'). */
export function validateUpdate(table, patch) {
    return run(table, patch, 'update');
}
//# sourceMappingURL=validation.js.map