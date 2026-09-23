/**
 * One error type for everything the CMS layer can fail with, so the UI
 * only ever has to handle `CmsError` and switch on `code`.
 */
const AR_MESSAGES = {
    config: 'إعدادات الاتصال بقاعدة البيانات غير صحيحة.',
    network: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
    invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    unauthorized: 'انتهت الجلسة. سجّل الدخول مرة أخرى.',
    forbidden: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
    not_found: 'العنصر غير موجود أو تم حذفه.',
    conflict: 'هذا العنصر موجود مسبقًا.',
    in_use: 'لا يمكن الحذف لأن العنصر مستخدم في محتوى آخر.',
    invalid: 'البيانات المدخلة غير مقبولة.',
    validation: 'يرجى تصحيح الحقول المشار إليها.',
    storage: 'تعذّر رفع الملف أو حذفه.',
    unknown: 'حدث خطأ غير متوقع.',
};
export class CmsError extends Error {
    code;
    status;
    issues;
    /** Raw details from Supabase, for logs only — never shown to visitors. */
    details;
    constructor(code, message, options = {}) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = 'CmsError';
        this.code = code;
        this.status = options.status;
        this.issues = options.issues ?? [];
        this.details = options.details;
    }
    /** Arabic, user-facing message (safe to display). */
    get messageAr() {
        return AR_MESSAGES[this.code];
    }
}
export function isCmsError(e) {
    return e instanceof CmsError;
}
function asRecord(body) {
    return body !== null && typeof body === 'object' ? body : {};
}
/** Map a PostgREST (/rest/v1) error response to a CmsError. */
export function fromPostgrest(status, body) {
    const b = asRecord(body);
    const pgCode = b.code ?? '';
    const message = b.message ?? `Request failed with status ${status}`;
    const opts = { status, details: body };
    switch (pgCode) {
        case '42501':
            return new CmsError('forbidden', message, opts);
        case '23505':
            return new CmsError('conflict', message, opts);
        case '23503':
            // Delete blocked by a reference vs. insert/update pointing at a missing row.
            return /still referenced/i.test(`${message} ${b.details ?? ''}`)
                ? new CmsError('in_use', message, opts)
                : new CmsError('invalid', message, opts);
        case '23514':
        case '23502':
        case '22P02':
        case '22007':
        case '22008':
        case '22001':
            return new CmsError('invalid', message, opts);
        case 'PGRST116':
            return new CmsError('not_found', message, opts);
        case 'PGRST301':
        case 'PGRST302':
        case 'PGRST303':
            return new CmsError('unauthorized', message, opts);
        default:
            break;
    }
    if (status === 401)
        return new CmsError('unauthorized', message, opts);
    if (status === 403)
        return new CmsError('forbidden', message, opts);
    if (status === 404)
        return new CmsError('not_found', message, opts);
    if (status === 409)
        return new CmsError('conflict', message, opts);
    return new CmsError('unknown', message, opts);
}
/** Map a Supabase Auth (/auth/v1) error response to a CmsError. */
export function fromAuth(status, body) {
    const b = asRecord(body);
    const code = b.error_code ?? b.error ?? '';
    const message = b.error_description ?? b.msg ?? b.message ?? `Auth failed with status ${status}`;
    const opts = { status, details: body };
    if (code === 'invalid_credentials' || code === 'invalid_grant') {
        return new CmsError('invalid_credentials', message, opts);
    }
    if (code === 'refresh_token_not_found' || code === 'session_not_found' || status === 401) {
        return new CmsError('unauthorized', message, opts);
    }
    if (status === 403)
        return new CmsError('forbidden', message, opts);
    if (status === 422 || status === 400)
        return new CmsError('invalid', message, opts);
    return new CmsError('unknown', message, opts);
}
/** Map a Supabase Storage (/storage/v1) error response to a CmsError. */
export function fromStorage(status, body) {
    const b = asRecord(body);
    const message = b.message ?? b.error ?? `Storage failed with status ${status}`;
    const opts = { status, details: body };
    const inner = String(b.statusCode ?? '');
    if (status === 401 || inner === '401')
        return new CmsError('unauthorized', message, opts);
    if (status === 403 || inner === '403' || /row-level security/i.test(message)) {
        return new CmsError('forbidden', message, opts);
    }
    if (status === 409 || inner === '409')
        return new CmsError('conflict', message, opts);
    if (status === 404 || inner === '404')
        return new CmsError('not_found', message, opts);
    if (status === 413 || inner === '413')
        return new CmsError('validation', message, opts);
    return new CmsError('storage', message, opts);
}
//# sourceMappingURL=errors.js.map