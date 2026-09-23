import { button, h, icon, replaceChildren } from '../core/dom.js';
import { openDialog } from './feedback.js';
/** Localised column with Arabic fallback. */
export function tr(row, base, lang) {
    const v = row[`${base}_${lang}`];
    if (typeof v === 'string' && v.trim())
        return v;
    const ar = row[`${base}_ar`];
    return typeof ar === 'string' ? ar : '';
}
export function trList(row, base, lang) {
    const v = row[`${base}_${lang}`];
    if (Array.isArray(v) && v.length)
        return v;
    const ar = row[`${base}_ar`];
    return Array.isArray(ar) ? ar : [];
}
export function formatDate(iso, precision, lang) {
    if (typeof iso !== 'string' || !iso)
        return '';
    if (precision === 'year')
        return iso.slice(0, 4);
    const d = new Date(`${iso}T00:00:00Z`);
    const locale = lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB';
    return precision === 'month'
        ? d.toLocaleDateString(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' })
        : d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
/** Blank-line separated plain text → paragraphs (no HTML). */
export function paragraphs(text) {
    return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => h('p', null, p));
}
export function pvImage(ctx, id, cls = 'pv-img') {
    const url = typeof id === 'string' ? ctx.media.url(id) : null;
    if (!url)
        return null;
    return h('img', { class: cls, attrs: { src: url, alt: ctx.media.get(id)?.alt_ar ?? '', loading: 'lazy' } });
}
export function pvCard(...children) {
    return h('article', { class: 'pv-card' }, children);
}
export function openPreview(title, render, published) {
    let lang = 'ar';
    const stage = h('div', { class: 'pv-stage' });
    const tabs = h('div', { class: 'seg' });
    const draw = async () => {
        replaceChildren(tabs, button('العربية', () => { lang = 'ar'; void draw(); }, { variant: lang === 'ar' ? 'primary' : 'ghost', small: true }), button('English', () => { lang = 'en'; void draw(); }, { variant: lang === 'en' ? 'primary' : 'ghost', small: true }));
        stage.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        stage.setAttribute('lang', lang);
        replaceChildren(stage, h('div', { class: 'olist-empty' }, '…'));
        replaceChildren(stage, await render(lang));
    };
    openDialog({
        title: `معاينة: ${title}`,
        wide: true,
        body: [
            h('div', { class: 'pv-bar' }, tabs, published === false ? h('span', { class: 'badge badge-draft' }, icon('eye-slash'), ' مسودة — غير ظاهر للزوار') : null),
            stage,
            h('p', { class: 'hint' }, 'المعاينة بألوان وتنسيق الملف المهني. ستظهر في الصفحة العامة بعد ربطها بقاعدة البيانات.'),
        ],
    });
    void draw();
}
//# sourceMappingURL=preview.js.map