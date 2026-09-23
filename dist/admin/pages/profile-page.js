/** Profile (single record, incl. photo) and site settings. */
import { isCmsError } from '../../cms/index.js';
import { busy, button, h, icon, replaceChildren } from '../core/dom.js';
import { reportError, toast } from '../ui/feedback.js';
import { createForm } from '../ui/form.js';
import { openPreview, paragraphs, pvImage, tr } from '../ui/preview.js';
import { pageHeader } from './section-page.js';
const PROFILE_FIELDS = [
    { kind: 'media', name: 'photo_id', label: 'الصورة الشخصية', mediaKind: 'image', allowExternal: true, hint: 'JPG أو PNG أو WebP، حتى 5 ميجابايت.' },
    { kind: 'text', name: 'full_name', label: 'الاسم الكامل', bilingual: true, required: true },
    { kind: 'text', name: 'display_name', label: 'الاسم المختصر', bilingual: true, hint: 'يظهر في الترويسة والواجهة الرئيسية' },
    { kind: 'text', name: 'job_title', label: 'المسمى', bilingual: true },
    { kind: 'text', name: 'headline', label: 'العبارة التعريفية', bilingual: true },
    { kind: 'text', name: 'badge', label: 'الشارة', bilingual: true, hint: 'مثل: حاصل على درجة 95 في التخصص' },
    { kind: 'textarea', name: 'bio', label: 'النبذة', bilingual: true, rows: 6 },
    { kind: 'group', label: 'الرؤية والرسالة', collapsed: true, fields: [
            { kind: 'textarea', name: 'vision', label: 'الرؤية', bilingual: true, rows: 3 },
            { kind: 'textarea', name: 'mission', label: 'الرسالة', bilingual: true, rows: 3 },
        ] },
    { kind: 'textarea', name: 'tech_summary', label: 'نص قسم التقنية', bilingual: true, rows: 5 },
    { kind: 'group', label: 'بيانات التواصل', fields: [
            { kind: 'email', name: 'email', label: 'البريد الإلكتروني' },
            { kind: 'tel', name: 'phone', label: 'الجوال', placeholder: '+966 5x xxx xxxx' },
            { kind: 'tel', name: 'whatsapp', label: 'واتساب', placeholder: '+966 5x xxx xxxx' },
        ] },
];
const SETTINGS_FIELDS = [
    { kind: 'text', name: 'site_title', label: 'عنوان الموقع', bilingual: true, required: true },
    { kind: 'textarea', name: 'meta_description', label: 'وصف محركات البحث', bilingual: true, rows: 2 },
    { kind: 'text', name: 'footer_text', label: 'نص التذييل', bilingual: true },
    { kind: 'select', name: 'default_language', label: 'اللغة الافتراضية', options: [{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }] },
    { kind: 'media', name: 'og_image_id', label: 'صورة المشاركة (واتساب/تويتر)', mediaKind: 'image', allowExternal: true },
];
/** A card holding one singleton form with its own save button. */
function singletonCard(ctx, title, fields, load, save, preview) {
    const body = h('div', { class: 'card-body' }, h('p', { class: 'muted' }, 'جارٍ التحميل…'));
    const actions = h('div', { class: 'card-actions' });
    let form = null;
    const mount = async () => {
        try {
            const row = (await load()) ?? {};
            await ctx.media.ensure(fields.flatMap((f) => (f.kind === 'media' ? [row[f.name]] : [])));
            form = createForm(ctx, fields, row, { onSubmit: () => void submit() });
            replaceChildren(body, form.el);
            const saveBtn = button('حفظ', () => void submit(), { variant: 'primary', icon: 'check' });
            replaceChildren(actions, preview ? button('معاينة', () => preview(form?.values() ?? row), { icon: 'eye' }) : null, saveBtn);
            const submit = () => busy(saveBtn, async () => {
                if (!form)
                    return;
                form.clearIssues();
                try {
                    await save(form.values());
                    await form.commit().catch(reportError);
                    toast('تم الحفظ', 'success');
                    await mount(); // fresh baseline for the next file replacement
                }
                catch (e) {
                    if (isCmsError(e) && e.code === 'validation') {
                        form.showIssues(e.issues);
                        toast('يرجى تصحيح الحقول المشار إليها', 'error');
                    }
                    else
                        reportError(e);
                }
            });
        }
        catch (e) {
            reportError(e);
            replaceChildren(body, h('p', { class: 'muted' }, 'تعذّر التحميل.'), button('إعادة المحاولة', () => void mount(), { small: true }));
        }
    };
    void mount();
    return h('section', { class: 'card' }, h('h2', { class: 'card-title' }, title), body, actions);
}
export function profilePage(ctx) {
    const previewProfile = (row) => openPreview('الملف الشخصي', (lang) => h('div', { class: 'pv-hero' }, pvImage(ctx, row['photo_id'], 'pv-photo') ?? h('div', { class: 'pv-photo pv-photo-empty' }, icon('user')), h('div', null, h('div', { class: 'pv-eyebrow' }, tr(row, 'job_title', lang)), h('h2', { class: 'pv-name' }, tr(row, 'display_name', lang) || tr(row, 'full_name', lang)), h('p', null, tr(row, 'headline', lang)), tr(row, 'badge', lang) ? h('span', { class: 'pv-chip' }, icon('trophy'), ' ', tr(row, 'badge', lang)) : null, paragraphs(tr(row, 'bio', lang)))));
    return h('div', { class: 'page' }, pageHeader('الملف الشخصي', 'بياناتك الأساسية وصورتك وبيانات التواصل.'), singletonCard(ctx, 'البيانات الأساسية', PROFILE_FIELDS, () => ctx.cms.admin.profile.get(), (v) => ctx.cms.admin.profile.save(v), previewProfile), singletonCard(ctx, 'إعدادات الموقع', SETTINGS_FIELDS, () => ctx.cms.admin.siteSettings.get(), (v) => ctx.cms.admin.siteSettings.save(v)));
}
//# sourceMappingURL=profile-page.js.map