import { h } from '../shared/dom.js';
/** Font Awesome glyph exactly like the static markup: <i class="fas fa-x"></i>. */
export function fa(name, fallback) {
    const n = (name && /^[a-z0-9-]+$/.test(name.replace(/^fab-/, '')) ? name : fallback);
    return h('i', { class: n.startsWith('fab-') ? `fab fa-${n.slice(4)}` : `fas fa-${n}` });
}
/** Localised column; English falls back to Arabic when not translated. */
export function tr(row, base, lang) {
    const r = row;
    const v = r[`${base}_${lang}`];
    if (typeof v === 'string' && v.trim())
        return v;
    const ar = r[`${base}_ar`];
    return typeof ar === 'string' ? ar : '';
}
/**
 * Plain text with blank-line paragraphs → text nodes separated by <br><br>,
 * which is exactly how the page renders its multi-paragraph texts today.
 */
export function richText(text) {
    const out = [];
    text.split('\n').forEach((line, i) => {
        if (i > 0)
            out.push(h('br'));
        if (line)
            out.push(line);
    });
    return out;
}
export function formatDate(iso, precision, lang) {
    if (!iso)
        return '';
    if (precision === 'year')
        return iso.slice(0, 4);
    const d = new Date(`${iso}T00:00:00Z`);
    const locale = lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB';
    return precision === 'month'
        ? d.toLocaleDateString(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' })
        : d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
/** Public URL of a media row (uploaded file or external link). */
export function mediaSrc(baseUrl, m) {
    if (!m)
        return null;
    if (m.external_url)
        return m.external_url;
    if (m.bucket_id && m.storage_path) {
        return `${baseUrl}/storage/v1/object/public/${m.bucket_id}/${m.storage_path.split('/').map(encodeURIComponent).join('/')}`;
    }
    return null;
}
/** <div class="zoomable"><img …></div> as used by every gallery on the page. */
export function zoomable(src, alt) {
    return h('div', { class: 'zoomable' }, h('img', { attrs: { src, alt, loading: 'lazy' } }));
}
export const EMPTY_TEXT = {
    ar: 'لا يوجد محتوى منشور حاليًا.',
    en: 'No published content yet.',
};
export function emptyNote(lang) {
    return h('p', { class: 'cms-empty' }, EMPTY_TEXT[lang]);
}
//# sourceMappingURL=render.js.map