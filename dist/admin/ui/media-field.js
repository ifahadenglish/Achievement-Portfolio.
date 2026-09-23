/**
 * File field used by every form that holds an image or a PDF: upload with
 * progress, replace, external link, remove. It only changes the form value;
 * the owning form decides what to release after save / cancel, so files
 * are never orphaned and never deleted while still in use.
 */
import { StorageClient, isCmsError } from '../../cms/index.js';
import { button, formatBytes, h, icon, replaceChildren } from '../core/dom.js';
import { errorMessage, openDialog } from './feedback.js';
const ACCEPT = {
    image: 'image/jpeg,image/png,image/webp,image/gif',
    pdf: 'application/pdf',
};
export function mediaThumb(ctx, id, kind) {
    const m = ctx.media.get(id);
    const url = ctx.media.url(id);
    if (!m || !url)
        return h('div', { class: 'thumb thumb-empty' }, icon(kind === 'pdf' ? 'file-pdf' : 'image'));
    if (m.kind === 'image')
        return h('img', { class: 'thumb', attrs: { src: url, alt: m.alt_ar ?? '', loading: 'lazy' } });
    return h('a', { class: 'thumb thumb-pdf', attrs: { href: url, target: '_blank', rel: 'noopener', title: 'فتح الملف' } }, icon('file-pdf'));
}
function describe(m) {
    if (!m)
        return '';
    if (m.external_url) {
        try {
            return new URL(m.external_url).hostname;
        }
        catch {
            return m.external_url;
        }
    }
    return [m.storage_path?.split('/').pop(), formatBytes(m.size_bytes)].filter(Boolean).join(' · ');
}
export function mediaField(ctx, opts) {
    let value = opts.initial;
    const preview = h('div', { class: 'mf-preview' });
    const info = h('div', { class: 'mf-info' });
    const progress = h('progress', { class: 'mf-progress', attrs: { max: 1, value: 0, hidden: true } });
    const error = h('div', { class: 'field-error', attrs: { role: 'alert' } });
    const fileInput = h('input', { attrs: { type: 'file', accept: ACCEPT[opts.kind], hidden: true } });
    const actions = h('div', { class: 'mf-actions' });
    const setError = (msg) => {
        error.textContent = msg ?? '';
    };
    const set = (id) => {
        value = id;
        opts.onChange(id);
        render();
    };
    const render = () => {
        replaceChildren(preview, mediaThumb(ctx, value, opts.kind));
        const m = ctx.media.get(value);
        replaceChildren(info, value ? h('span', { class: 'mf-name' }, describe(m)) : h('span', { class: 'muted' }, opts.kind === 'pdf' ? 'لا يوجد ملف' : 'لا توجد صورة'), m?.external_url ? h('span', { class: 'badge badge-muted' }, 'رابط خارجي') : null);
        replaceChildren(actions, button(value ? 'استبدال' : 'رفع', () => fileInput.click(), { icon: 'upload', small: true }), opts.allowExternal ? button('رابط خارجي', () => void askExternal(), { icon: 'link', small: true }) : null, value ? button('إزالة', () => set(null), { icon: 'trash', small: true, variant: 'plain' }) : null);
    };
    const upload = async (file) => {
        setError(null);
        try {
            StorageClient.checkFile(opts.kind, file); // type + size before any network call
        }
        catch (e) {
            setError(isCmsError(e) && e.issues[0] ? e.issues[0].message : errorMessage(e));
            return;
        }
        progress.hidden = false;
        progress.value = 0;
        actions.querySelectorAll('button').forEach((b) => (b.disabled = true));
        try {
            const row = await ctx.cms.admin[opts.kind === 'pdf' ? 'uploadPdf' : 'uploadImage']({
                file,
                onProgress: (f) => (progress.value = f),
            });
            ctx.media.put(row);
            opts.onCreated(row);
            set(row.id);
        }
        catch (e) {
            setError(errorMessage(e));
            render();
        }
        finally {
            progress.hidden = true;
        }
    };
    const askExternal = async () => {
        const input = h('input', { class: 'input', attrs: { type: 'url', dir: 'ltr', placeholder: 'https://', required: true } });
        const err = h('div', { class: 'field-error' });
        const d = openDialog({
            title: 'إضافة رابط خارجي',
            body: [
                h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'رابط الملف'), input, err),
                h('p', { class: 'hint' }, 'مثل رابط Google Drive أو ملف من أداة أخرى. الرابط سيكون ظاهرًا للزوار عند النشر.'),
            ],
        });
        const save = button('إضافة', async () => {
            try {
                const row = await ctx.cms.admin.addExternalMedia(opts.kind, input.value.trim());
                ctx.media.put(row);
                opts.onCreated(row);
                set(row.id);
                d.close();
            }
            catch (e) {
                err.textContent = errorMessage(e);
            }
        }, { variant: 'primary' });
        d.footer.append(button('إلغاء', () => d.close()), save);
        input.focus();
    };
    fileInput.addEventListener('change', () => {
        const f = fileInput.files?.[0];
        fileInput.value = '';
        if (f)
            void upload(f);
    });
    render();
    const el = h('div', { class: 'media-field' }, preview, h('div', { class: 'mf-side' }, info, progress, actions, error), fileInput);
    return { el, setError };
}
//# sourceMappingURL=media-field.js.map