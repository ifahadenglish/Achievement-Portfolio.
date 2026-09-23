/**
 * Every managed section, declared once. Fields, list display and preview
 * live here; all behaviour comes from the shared page/list/form modules.
 */
import { h, icon } from '../core/dom.js';
import { paragraphs, pvCard, pvImage, formatDate, tr, trList } from '../ui/preview.js';
import { evidenceTargetsPanel, galleryMedia, galleryPanel, linkedEvidencePanel, projectLinksPanel } from './panels.js';
import { generic, str } from './types.js';
const iconField = { kind: 'text', name: 'icon', label: 'أيقونة Font Awesome', hint: 'مثل: chalkboard-teacher — اتركها فارغة للافتراضي', placeholder: 'chalkboard-teacher' };
const text = (r, ...cols) => cols.map((c) => str(r[c])).join(' ');
// ------------------------------------------------------------ metrics
export const statsSection = {
    route: 'stats',
    title: 'مؤشرات الموقع',
    singular: 'مؤشر',
    icon: 'chart-simple',
    intro: 'الأرقام الظاهرة في أعلى الصفحة ونبذة عني (سنوات الخبرة، الساعات التدريبية…).',
    collection: (c) => generic(c.cms.admin.stats),
    fields: () => [
        { kind: 'text', name: 'label', label: 'الوصف', bilingual: true, required: true },
        { kind: 'number', name: 'value', label: 'الرقم', required: true, min: 0 },
        { kind: 'text', name: 'suffix', label: 'اللاحقة', hint: 'تظهر بعد الرقم، مثل +' },
    ],
    defaults: { suffix: '+' },
    rowTitle: (r) => `${str(r['label_ar'])}`,
    rowSubtitle: (r) => h('strong', { attrs: { dir: 'ltr' } }, `${String(r['value'])}${str(r['suffix'])}`),
    mediaColumns: [],
    preview: (_c, r, lang) => h('div', { class: 'pv-stat' }, h('span', { class: 'pv-num', attrs: { dir: 'ltr' } }, `${String(r['value'])}${str(r['suffix'])}`), h('span', null, tr(r, 'label', lang))),
};
// --------------------------------------------------------- profile bits
export const linksSection = {
    route: 'links',
    title: 'الروابط',
    singular: 'رابط',
    icon: 'link',
    intro: 'روابط حساباتك ومنصاتك.',
    collection: (c) => generic(c.cms.admin.links),
    fields: () => [
        { kind: 'text', name: 'label', label: 'الاسم', bilingual: true, required: true },
        { kind: 'url', name: 'url', label: 'الرابط', required: true, placeholder: 'https://' },
        { ...iconField, hint: 'مثل: fab-linkedin أو globe' },
    ],
    rowTitle: (r) => str(r['label_ar']),
    rowSubtitle: (r) => h('span', { attrs: { dir: 'ltr' } }, str(r['url'])),
    search: (r) => text(r, 'label_ar', 'label_en', 'url'),
    mediaColumns: [],
    preview: (_c, r, lang) => pvCard(h('a', { class: 'pv-btn', attrs: { href: str(r['url']), target: '_blank', rel: 'noopener' } }, tr(r, 'label', lang))),
};
const KIND_LABEL = {
    vision: 'الرؤية التعليمية',
    teaching_skill: 'مهارة تعليمية',
    technical_skill: 'مهارة تقنية',
    tech_tag: 'وسم تقني',
};
export const profileItemsSection = {
    route: 'profile-items',
    title: 'الرؤية والمهارات',
    singular: 'عنصر',
    icon: 'lightbulb',
    intro: 'بطاقات الرؤية التعليمية، والمهارات التعليمية والتقنية، ووسوم قسم التقنية.',
    collection: (c) => generic(c.cms.admin.profileItems),
    fields: () => [
        { kind: 'select', name: 'kind', label: 'النوع', required: true, options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })) },
        { kind: 'text', name: 'title', label: 'العنوان', bilingual: true, required: true },
        { kind: 'textarea', name: 'description', label: 'الوصف', bilingual: true, rows: 3, hint: 'لبطاقات الرؤية فقط' },
        iconField,
    ],
    defaults: { kind: 'vision' },
    rowTitle: (r) => str(r['title_ar']),
    rowSubtitle: (r) => h('span', { class: 'badge badge-muted' }, KIND_LABEL[str(r['kind'])] ?? ''),
    search: (r) => text(r, 'title_ar', 'title_en', 'description_ar'),
    filter: { label: 'النوع', options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })), match: (r, v) => r['kind'] === v },
    mediaColumns: [],
    preview: (_c, r, lang) => pvCard(h('div', { class: 'pv-icon' }, icon(str(r['icon']) || 'lightbulb')), h('h3', null, tr(r, 'title', lang)), tr(r, 'description', lang) ? h('p', null, tr(r, 'description', lang)) : null),
};
// ---------------------------------------------------------- experiences
function period(r, lang, start = 'start_date', end = 'end_date') {
    const s = formatDate(r[start], r['date_precision'], lang);
    const e = r['is_current'] === true ? (lang === 'ar' ? 'الآن' : 'Present') : formatDate(r[end], r['date_precision'], lang);
    return [s, e].filter(Boolean).join(' - ');
}
export const experiencesSection = {
    route: 'experiences',
    title: 'الخبرات المهنية',
    singular: 'خبرة',
    icon: 'briefcase',
    collection: (c) => generic(c.cms.admin.experiences),
    fields: () => [
        { kind: 'text', name: 'job_title', label: 'المسمى الوظيفي', bilingual: true, required: true },
        { kind: 'text', name: 'organization', label: 'الجهة', bilingual: true },
        { kind: 'text', name: 'location', label: 'المدينة', bilingual: true },
        { kind: 'date', name: 'start_date', label: 'تاريخ البداية', precisionName: 'date_precision', required: true },
        { kind: 'checkbox', name: 'is_current', label: 'هذه خبرتي الحالية (بدون تاريخ نهاية)' },
        { kind: 'date', name: 'end_date', label: 'تاريخ النهاية', followPrecision: 'date_precision', disabledBy: 'is_current', hint: 'يستخدم نفس دقة تاريخ البداية.' },
        { kind: 'textarea', name: 'description', label: 'الوصف', bilingual: true, rows: 3 },
        { kind: 'group', label: 'المسؤوليات والإنجازات', collapsed: true, fields: [
                { kind: 'lines', name: 'responsibilities', label: 'المسؤوليات', bilingual: true },
                { kind: 'lines', name: 'achievements', label: 'الإنجازات', bilingual: true },
            ] },
        { kind: 'group', label: 'خيارات إضافية', collapsed: true, fields: [iconField] },
    ],
    defaults: { date_precision: 'year' },
    rowTitle: (r) => str(r['job_title_ar']),
    rowSubtitle: (r) => [str(r['organization_ar']), period(r, 'ar'), r['is_current'] === true ? h('span', { class: 'badge badge-gold' }, 'حالية') : null].filter(Boolean).map((x) => (typeof x === 'string' ? h('span', null, x) : x)),
    search: (r) => text(r, 'job_title_ar', 'job_title_en', 'organization_ar', 'location_ar'),
    mediaColumns: [],
    panels: [linkedEvidencePanel('experience')],
    preview: (_c, r, lang) => pvCard(h('div', { class: 'pv-row' }, h('div', null, h('h3', null, [tr(r, 'job_title', lang), tr(r, 'organization', lang)].filter(Boolean).join(' – ')), tr(r, 'location', lang) ? h('div', { class: 'pv-meta' }, icon('location-dot'), ' ', tr(r, 'location', lang)) : null), h('span', { class: 'pv-date' }, period(r, lang))), tr(r, 'description', lang) ? paragraphs(tr(r, 'description', lang)) : null, trList(r, 'responsibilities', lang).length ? h('ul', { class: 'pv-list' }, trList(r, 'responsibilities', lang).map((x) => h('li', null, x))) : null, trList(r, 'achievements', lang).length ? h('ul', { class: 'pv-list pv-list-gold' }, trList(r, 'achievements', lang).map((x) => h('li', null, x))) : null),
};
// ------------------------------------------------------------- evidence
export const evidenceCategoriesSection = {
    route: 'evidence-categories',
    title: 'تصنيفات الشواهد',
    singular: 'تصنيف',
    icon: 'folder-tree',
    intro: 'التصنيفات تظهر كتبويبات في قسم شواهد الأداء. لا يمكن حذف تصنيف يحتوي شواهد.',
    collection: (c) => generic(c.cms.admin.evidenceCategories),
    fields: () => [
        { kind: 'text', name: 'name', label: 'اسم التصنيف', bilingual: true, required: true },
        { ...iconField, hint: 'مثل: file-lines أو user-graduate' },
    ],
    rowTitle: (r) => str(r['name_ar']),
    mediaColumns: [],
    preview: (_c, r, lang) => h('div', { class: 'pv-tabs' }, h('span', { class: 'pv-tab active' }, icon(str(r['icon']) || 'folder'), ' ', tr(r, 'name', lang))),
};
async function categoryOptions(ctx) {
    return (await ctx.cms.admin.evidenceCategories.list()).map((c) => ({ value: c.id, label: `${c.name_ar}${c.is_published ? '' : ' (مخفي)'}` }));
}
let categoryNames = new Map();
export const evidenceSection = {
    route: 'evidence',
    title: 'شواهد الأداء',
    singular: 'شاهد',
    icon: 'folder-open',
    intro: 'ملف PDF مرفوع أو رابط خارجي (مثل سجل متابعة الطلاب). يظهر للزوار فقط إذا كان الشاهد وتصنيفه منشورين.',
    collection: (c) => {
        const base = generic(c.cms.admin.evidence);
        return {
            ...base,
            list: async () => {
                categoryNames = new Map((await c.cms.admin.evidenceCategories.list()).map((x) => [x.id, x.name_ar]));
                return base.list();
            },
        };
    },
    fields: (ctx) => [
        { kind: 'select', name: 'category_id', label: 'التصنيف', required: true, options: () => categoryOptions(ctx), hint: 'أضف التصنيفات من صفحة "تصنيفات الشواهد".' },
        { kind: 'text', name: 'title', label: 'العنوان', bilingual: true, required: true },
        { kind: 'textarea', name: 'description', label: 'الوصف', bilingual: true, rows: 3 },
        { kind: 'media', name: 'document_id', label: 'ملف الشاهد (PDF)', mediaKind: 'pdf', allowExternal: true, required: true },
        { kind: 'group', label: 'تفاصيل إضافية', collapsed: true, fields: [
                { kind: 'text', name: 'issuer', label: 'الجهة', bilingual: true },
                { kind: 'date', name: 'evidence_date', label: 'التاريخ', precisionName: 'date_precision' },
                { kind: 'text', name: 'note', label: 'ملاحظة أسفل الملف', bilingual: true, hint: 'مثل: يتم تحديث الملف دوريًا' },
                { kind: 'media', name: 'thumbnail_id', label: 'صورة مصغّرة (اختياري)', mediaKind: 'image' },
            ] },
    ],
    defaults: { date_precision: 'day' },
    rowTitle: (r) => str(r['title_ar']),
    rowSubtitle: (r) => [h('span', { class: 'badge badge-muted' }, categoryNames.get(str(r['category_id'])) ?? ''), r['evidence_date'] ? h('span', null, formatDate(r['evidence_date'], r['date_precision'], 'ar')) : null],
    thumb: { column: 'document_id', kind: 'pdf' },
    mediaFor: (r) => [r['thumbnail_id']],
    search: (r) => text(r, 'title_ar', 'title_en', 'description_ar', 'issuer_ar'),
    mediaColumns: ['document_id', 'thumbnail_id'],
    panels: [evidenceTargetsPanel],
    preview: (ctx, r, lang) => {
        const url = ctx.media.url(r['document_id']);
        const note = tr(r, 'note', lang);
        return pvCard(h('h3', null, icon('file-pdf', 'pv-pdf-icon'), ' ', tr(r, 'title', lang)), tr(r, 'description', lang) ? h('p', { class: 'pv-muted' }, tr(r, 'description', lang)) : null, url ? h('a', { class: 'pv-btn', attrs: { href: url, target: '_blank', rel: 'noopener' } }, icon('arrow-up-right-from-square'), lang === 'ar' ? ' فتح الملف' : ' Open file') : h('p', { class: 'pv-muted' }, 'لا يوجد ملف'), note ? h('div', { class: 'pv-note' }, icon('rotate'), ' ', note) : null);
    },
};
// --------------------------------------------------------- achievements
export const achievementsSection = {
    route: 'achievements',
    title: 'الإنجازات',
    singular: 'إنجاز',
    icon: 'trophy',
    collection: (c) => generic(c.cms.admin.achievements),
    fields: () => [
        { kind: 'text', name: 'title', label: 'العنوان', bilingual: true, required: true, hint: 'مثل: معلم متقدم' },
        { kind: 'date', name: 'achieved_on', label: 'التاريخ', precisionName: 'date_precision' },
        { kind: 'text', name: 'issuer', label: 'الجهة', bilingual: true },
        { kind: 'textarea', name: 'description', label: 'النص', bilingual: true, rows: 8, hint: 'افصل بين الفقرات بسطر فارغ.' },
    ],
    defaults: { date_precision: 'year' },
    rowTitle: (r) => str(r['title_ar']),
    rowSubtitle: (r) => formatDate(r['achieved_on'], r['date_precision'], 'ar'),
    search: (r) => text(r, 'title_ar', 'title_en', 'description_ar'),
    mediaColumns: [],
    extraMediaOnDelete: (ctx, r) => galleryMedia(ctx, 'achievement_id', r.id),
    panels: [galleryPanel('achievement_id'), linkedEvidencePanel('achievement')],
    preview: async (ctx, r, lang) => {
        const media = await galleryMedia(ctx, 'achievement_id', r.id);
        await ctx.media.ensure(media);
        return pvCard(h('span', { class: 'pv-chip' }, icon('medal'), ' ', [formatDate(r['achieved_on'], r['date_precision'], lang), tr(r, 'title', lang)].filter(Boolean).join(' · ')), paragraphs(tr(r, 'description', lang)), media.length ? h('div', { class: 'pv-gallery' }, media.map((m) => pvImage(ctx, m))) : null);
    },
};
// -------------------------------------------------------------- courses
const COURSE_CATS = [{ value: 'educational', label: 'تدريب تربوي' }, { value: 'other', label: 'أخرى' }];
export const coursesSection = {
    route: 'courses',
    title: 'الدورات التدريبية',
    singular: 'دورة',
    icon: 'graduation-cap',
    collection: (c) => generic(c.cms.admin.courses),
    fields: () => [
        { kind: 'select', name: 'category', label: 'التصنيف', required: true, options: COURSE_CATS },
        { kind: 'text', name: 'title', label: 'اسم الدورة', bilingual: true, required: true },
        { kind: 'media', name: 'certificate_image_id', label: 'صورة الشهادة', mediaKind: 'image', allowExternal: true },
        { kind: 'media', name: 'certificate_file_id', label: 'ملف الشهادة (PDF أو رابط)', mediaKind: 'pdf', allowExternal: true },
        { kind: 'group', label: 'تفاصيل إضافية', collapsed: true, fields: [
                { kind: 'text', name: 'provider', label: 'الجهة المقدمة', bilingual: true },
                { kind: 'date', name: 'completed_on', label: 'تاريخ الإتمام', precisionName: 'date_precision' },
            ] },
    ],
    defaults: { category: 'educational', date_precision: 'day' },
    rowTitle: (r) => str(r['title_ar']),
    rowSubtitle: (r) => h('span', { class: 'badge badge-muted' }, COURSE_CATS.find((c) => c.value === r['category'])?.label ?? ''),
    thumb: { column: 'certificate_image_id', kind: 'image' },
    mediaFor: (r) => [r['certificate_file_id']],
    search: (r) => text(r, 'title_ar', 'title_en', 'provider_ar'),
    filter: { label: 'التصنيف', options: COURSE_CATS, match: (r, v) => r['category'] === v },
    mediaColumns: ['certificate_image_id', 'certificate_file_id'],
    preview: (ctx, r, lang) => {
        const file = ctx.media.url(r['certificate_file_id']);
        return h('div', { class: 'pv-cert' }, pvImage(ctx, r['certificate_image_id'], 'pv-cert-img'), h('div', { class: 'pv-cert-body' }, h('h4', null, tr(r, 'title', lang)), file ? h('a', { class: 'pv-btn', attrs: { href: file, target: '_blank', rel: 'noopener' } }, icon('download'), lang === 'ar' ? ' تحميل الشهادة' : ' Download Certificate') : null));
    },
};
// ------------------------------------------------------------- projects
const PROJECT_CATS = [
    { value: 'interactive', label: 'تفاعلية' },
    { value: 'strategies', label: 'استراتيجيات' },
    { value: 'presentations', label: 'عروض' },
];
export const projectsSection = {
    route: 'projects',
    title: 'المشاريع',
    singular: 'مشروع',
    icon: 'laptop-code',
    collection: (c) => generic(c.cms.admin.projects),
    fields: () => [
        { kind: 'select', name: 'category', label: 'التصنيف', required: true, options: PROJECT_CATS },
        { kind: 'text', name: 'title', label: 'العنوان', bilingual: true, required: true },
        { kind: 'textarea', name: 'description', label: 'الوصف', bilingual: true, rows: 5, hint: 'افصل بين الفقرات بسطر فارغ.' },
        { kind: 'media', name: 'cover_image_id', label: 'صورة الغلاف', mediaKind: 'image', allowExternal: true },
        { kind: 'checkbox', name: 'is_wide', label: 'بطاقة بعرض كامل (مثل بطاقة الاستراتيجيات)' },
    ],
    defaults: { category: 'interactive' },
    rowTitle: (r) => str(r['title_ar']),
    rowSubtitle: (r) => h('span', { class: 'badge badge-muted' }, PROJECT_CATS.find((c) => c.value === r['category'])?.label ?? ''),
    thumb: { column: 'cover_image_id', kind: 'image' },
    search: (r) => text(r, 'title_ar', 'title_en', 'description_ar'),
    filter: { label: 'التصنيف', options: PROJECT_CATS, match: (r, v) => r['category'] === v },
    mediaColumns: ['cover_image_id'],
    extraMediaOnDelete: (ctx, r) => galleryMedia(ctx, 'project_id', r.id),
    panels: [projectLinksPanel, galleryPanel('project_id'), linkedEvidencePanel('project')],
    preview: async (ctx, r, lang) => {
        const [links, media] = await Promise.all([
            ctx.cms.admin.projectLinks.listFor({ column: 'project_id', op: 'eq', value: r.id }),
            galleryMedia(ctx, 'project_id', r.id),
        ]);
        await ctx.media.ensure(media);
        return pvCard(pvImage(ctx, r['cover_image_id'], 'pv-cover'), h('span', { class: 'pv-tag' }, PROJECT_CATS.find((c) => c.value === r['category'])?.label ?? ''), h('h3', null, tr(r, 'title', lang)), paragraphs(tr(r, 'description', lang)), media.length ? h('div', { class: 'pv-gallery' }, media.map((m) => pvImage(ctx, m))) : null, links.length ? h('div', { class: 'pv-links' }, links.map((l) => h('a', { class: 'pv-btn', attrs: { href: l.url, target: '_blank', rel: 'noopener' } }, lang === 'en' && l.label_en ? l.label_en : l.label_ar))) : null);
    },
};
// ------------------------------------------------------- participations
export const participationsSection = {
    route: 'participations',
    title: 'المشاركات',
    singular: 'مشاركة',
    icon: 'people-group',
    collection: (c) => generic(c.cms.admin.participations),
    fields: () => [
        { kind: 'text', name: 'title', label: 'العنوان', bilingual: true, required: true },
        { kind: 'textarea', name: 'description', label: 'الوصف', bilingual: true, rows: 4 },
        { kind: 'group', label: 'تفاصيل إضافية', collapsed: true, fields: [
                { kind: 'text', name: 'organization', label: 'الجهة', bilingual: true },
                { kind: 'date', name: 'participated_on', label: 'التاريخ', precisionName: 'date_precision' },
            ] },
    ],
    defaults: { date_precision: 'day' },
    rowTitle: (r) => str(r['title_ar']),
    rowSubtitle: (r) => formatDate(r['participated_on'], r['date_precision'], 'ar'),
    search: (r) => text(r, 'title_ar', 'title_en', 'description_ar'),
    mediaColumns: [],
    extraMediaOnDelete: (ctx, r) => galleryMedia(ctx, 'participation_id', r.id),
    panels: [galleryPanel('participation_id')],
    preview: async (ctx, r, lang) => {
        const media = await galleryMedia(ctx, 'participation_id', r.id);
        await ctx.media.ensure(media);
        return pvCard(h('span', { class: 'pv-tag' }, lang === 'ar' ? 'المشاركات' : 'Participations'), h('h3', null, tr(r, 'title', lang)), paragraphs(tr(r, 'description', lang)), media.length ? h('div', { class: 'pv-gallery' }, media.map((m) => pvImage(ctx, m))) : null);
    },
};
// ------------------------------------------------------ recommendations
export const recommendationsSection = {
    route: 'recommendations',
    title: 'التوصيات',
    singular: 'توصية',
    icon: 'comments',
    collection: (c) => generic(c.cms.admin.recommendations),
    fields: () => [
        { kind: 'textarea', name: 'quote', label: 'نص التوصية', bilingual: true, required: true, rows: 3 },
        { kind: 'text', name: 'author_name', label: 'صاحب التوصية', bilingual: true, required: true, hint: 'مثل: مدير المدرسة' },
        { kind: 'text', name: 'author_role', label: 'الجهة / الصفة', bilingual: true },
        { kind: 'group', label: 'خيارات إضافية', collapsed: true, fields: [
                { kind: 'media', name: 'avatar_id', label: 'صورة (اختياري)', mediaKind: 'image' },
                { ...iconField, hint: 'تظهر إذا لم توجد صورة. مثل: school' },
            ] },
    ],
    rowTitle: (r) => str(r['author_name_ar']),
    rowSubtitle: (r) => h('span', { class: 'clamp' }, str(r['quote_ar'])),
    thumb: { column: 'avatar_id', kind: 'image' },
    search: (r) => text(r, 'quote_ar', 'quote_en', 'author_name_ar', 'author_role_ar'),
    mediaColumns: ['avatar_id'],
    preview: (ctx, r, lang) => pvCard(h('span', { class: 'pv-quote' }, icon('quote-right')), h('blockquote', null, tr(r, 'quote', lang)), h('div', { class: 'pv-author' }, pvImage(ctx, r['avatar_id'], 'pv-avatar') ?? h('span', { class: 'pv-avatar pv-avatar-icon' }, icon(str(r['icon']) || 'user')), h('div', null, h('strong', null, tr(r, 'author_name', lang)), h('div', { class: 'pv-muted' }, tr(r, 'author_role', lang))))),
};
export const ALL_SECTIONS = [
    statsSection, linksSection, profileItemsSection, experiencesSection, evidenceSection, evidenceCategoriesSection,
    achievementsSection, coursesSection, projectsSection, participationsSection, recommendationsSection,
];
//# sourceMappingURL=sections.js.map