import { markPending, setShown, setState } from '../bridge.js';
/** Page dictionary key → how to compute it from the profile row. */
const KEYS = {
    name: (p, l) => pick(p, 'full_name', l),
    // Short name is used in header / hero / footer; fall back to the full name rather than hide it.
    footerName: (p, l) => pick(p, 'display_name', l) || pick(p, 'full_name', l),
    jobTitle: (p, l) => pick(p, 'job_title', l),
    heroSubtitle: (p, l) => pick(p, 'headline', l),
    bioText: (p, l) => pick(p, 'bio', l),
    badge: (p, l) => pick(p, 'badge', l),
    techText: (p, l) => pick(p, 'tech_summary', l),
    // "المعلم " + full name — same text as today, composed from one source.
    teacherInfoName: (p, l) => {
        const name = pick(p, 'full_name', l);
        return name ? `${l === 'ar' ? 'المعلم' : 'Teacher'} ${name}` : '';
    },
};
/** Keys whose element may be hidden when the value is empty. */
const HIDEABLE = new Set(['heroSubtitle', 'bioText', 'badge', 'techText', 'jobTitle']);
/** English falls back to Arabic when not translated. */
function pick(p, field, lang) {
    const v = p[`${field}_${lang}`];
    if (typeof v === 'string' && v.trim())
        return v;
    const ar = p[`${field}_ar`];
    return typeof ar === 'string' ? ar : '';
}
function contactHref(kind, value) {
    if (kind === 'email')
        return `mailto:${value}`;
    if (kind === 'phone')
        return `tel:${value.replace(/[^\d+]/g, '')}`;
    return `https://wa.me/${value.replace(/\D/g, '')}`;
}
function applyContacts(p) {
    for (const a of document.querySelectorAll('[data-cms-contact]')) {
        const kind = a.dataset['cmsContact'];
        const value = (p[kind] ?? '').trim();
        setShown(a, value.length > 0);
        if (!value)
            continue;
        a.href = contactHref(kind, value);
        const text = a.querySelector('[data-cms-contact-text]');
        if (text)
            text.textContent = value;
    }
}
/** Migration 2 — Photo: a published photo replaces the built-in one; none keeps it. */
function applyPhoto(cms, p) {
    const src = p.photo ? cms.storage.url(p.photo) : null;
    if (!src)
        return;
    const alt = p.photo?.alt_ar || `صورة ${p.full_name_ar}`;
    for (const img of document.querySelectorAll('.photo-ring img, .profile-avatar img')) {
        if (img.getAttribute('src') !== src)
            img.src = src;
        img.alt = alt;
    }
    document.documentElement.setAttribute('data-cms-photo', 'live');
}
function boundElements() {
    const keys = Object.keys(KEYS).map((k) => `[data-i18n="${k}"]`).join(',');
    return [...document.querySelectorAll(keys), ...document.querySelectorAll('[data-cms-contact]')];
}
export async function bindProfile(cms, site) {
    setState('profile', 'loading');
    const clearPending = markPending(boundElements());
    let profile;
    try {
        profile = await cms.public.getProfile();
    }
    catch (e) {
        clearPending();
        setState('profile', 'error');
        console.warn('[cms] profile: using the built-in page content', e);
        return;
    }
    clearPending();
    if (!profile) {
        setState('profile', 'empty');
        return;
    }
    const p = profile;
    const patch = { ar: {}, en: {} };
    for (const lang of ['ar', 'en']) {
        for (const [key, compute] of Object.entries(KEYS))
            patch[lang][key] = compute(p, lang);
    }
    // Hide elements whose value is empty — after every language switch too.
    site.onApply((lang) => {
        for (const key of HIDEABLE) {
            const value = patch[lang]?.[key] ?? '';
            document.querySelectorAll(`[data-i18n="${key}"]`).forEach((el) => setShown(el, value.length > 0));
        }
    });
    site.override(patch);
    applyContacts(p);
    applyPhoto(cms, p);
    setState('profile', 'live');
}
//# sourceMappingURL=profile.js.map