/**
 * Panels shown inside an item's editor: project links, image galleries,
 * and evidence links. All are built from one child-list helper.
 */
import { isCmsError } from '../../cms/index.js';
import { busy, button, h } from '../core/dom.js';
import { confirmDialog, openDialog, reportError, toast } from '../ui/feedback.js';
import { createForm } from '../ui/form.js';
import { mediaThumb } from '../ui/media-field.js';
import { orderedList } from '../ui/ordered-list.js';
import { str } from './types.js';
/** Small list + add/edit form, reused by every panel. */
export function childPanel(ctx, o) {
    const edit = (r) => {
        let saved = false;
        const form = createForm(ctx, o.fields(r), r ?? {}, { onSubmit: () => void save() });
        const d = openDialog({ title: r ? 'تعديل' : o.addLabel, body: form.el });
        const saveBtn = button('حفظ', () => void save(), { variant: 'primary', icon: 'check' });
        d.footer.append(button('إلغاء', () => d.close()), saveBtn);
        const save = () => busy(saveBtn, async () => {
            try {
                if (r && o.update)
                    await o.update(r, form.values());
                else
                    await o.create(form.values());
                saved = true;
                await form.commit().catch(reportError);
                d.close();
                await list.reload();
            }
            catch (e) {
                if (isCmsError(e) && e.code === 'validation')
                    form.showIssues(e.issues);
                else
                    reportError(e);
            }
        });
        d.onClose(() => {
            if (!saved)
                void form.rollback().catch(reportError);
        });
    };
    const list = orderedList({
        load: o.load,
        title: o.title,
        ...(o.subtitle ? { subtitle: o.subtitle } : {}),
        ...(o.thumb ? { thumb: o.thumb } : {}),
        empty: o.empty,
        compact: true,
        ...(o.update ? { onEdit: (r) => edit(r) } : {}),
        onDelete: async (r) => {
            if (!(await confirmDialog(`إزالة "${o.title(r)}"؟`, { confirm: 'إزالة', danger: true })))
                return;
            await o.remove(r);
            toast('تمت الإزالة', 'success');
            await list.reload();
        },
        ...(o.reorder ? { onReorder: o.reorder } : {}),
    });
    return h('div', { class: 'child-panel' }, list.el, button(o.addLabel, () => edit(null), { icon: 'plus', small: true }));
}
// ---------------------------------------------------------------- links
export const projectLinksPanel = {
    title: 'روابط المشروع',
    render: (ctx, project) => childPanel(ctx, {
        load: () => ctx.cms.admin.projectLinks.listFor({ column: 'project_id', op: 'eq', value: project.id }),
        title: (r) => r.label_ar,
        subtitle: (r) => h('span', { attrs: { dir: 'ltr' } }, r.url),
        fields: () => [
            { kind: 'text', name: 'label', label: 'نص الزر', bilingual: true, required: true },
            { kind: 'url', name: 'url', label: 'الرابط', required: true, placeholder: 'https://' },
        ],
        addLabel: 'إضافة رابط',
        empty: 'لا توجد روابط.',
        create: (v) => ctx.cms.admin.projectLinks.create({ ...v, project_id: project.id }),
        update: (r, v) => ctx.cms.admin.projectLinks.update(r.id, v),
        remove: (r) => ctx.cms.admin.projectLinks.remove(r.id),
        reorder: (ids, cur) => ctx.cms.admin.projectLinks.reorder(ids, cur),
    }),
};
export function galleryPanel(column) {
    return {
        title: 'معرض الصور',
        render: (ctx, owner) => childPanel(ctx, {
            load: async () => {
                const rows = (await ctx.cms.admin.attachments.listFor({ column, op: 'eq', value: owner.id }));
                await ctx.media.ensure(rows.map((r) => r.media_id));
                return rows;
            },
            title: (r) => r.caption_ar ?? ctx.media.get(r.media_id)?.alt_ar ?? 'صورة',
            thumb: (r) => mediaThumb(ctx, r.media_id, 'image'),
            fields: () => [
                { kind: 'media', name: 'media_id', label: 'الصورة', mediaKind: 'image', required: true },
                { kind: 'text', name: 'caption', label: 'التعليق', bilingual: true },
            ],
            addLabel: 'إضافة صورة',
            empty: 'لا توجد صور.',
            create: (v) => ctx.cms.admin.attachments.create({ ...v, [column]: owner.id }),
            update: (r, v) => ctx.cms.admin.attachments.update(r.id, v),
            remove: async (r) => {
                await ctx.cms.admin.attachments.remove(r.id);
                await ctx.cms.admin.releaseMedia([r.media_id]);
            },
            reorder: (ids, cur) => ctx.cms.admin.attachments.reorder(ids, cur),
        }),
    };
}
/** Media ids used by an item's gallery (released when the item is deleted). */
export async function galleryMedia(ctx, column, id) {
    const rows = await ctx.cms.admin.attachments.listFor({ column, op: 'eq', value: id });
    return rows.map((r) => r.media_id);
}
const TARGET_LABEL = { experience: 'خبرة', achievement: 'إنجاز', project: 'مشروع' };
function targetOf(kind, id) {
    return kind === 'experience' ? { experienceId: id } : kind === 'achievement' ? { achievementId: id } : { projectId: id };
}
async function targetOptions(ctx, kind) {
    const rows = kind === 'experience' ? (await ctx.cms.admin.experiences.list()).map((r) => ({ value: r.id, label: [r.job_title_ar, r.organization_ar].filter(Boolean).join(' — ') }))
        : kind === 'achievement' ? (await ctx.cms.admin.achievements.list()).map((r) => ({ value: r.id, label: r.title_ar }))
            : (await ctx.cms.admin.projects.list()).map((r) => ({ value: r.id, label: r.title_ar }));
    return rows;
}
/** On an experience / achievement / project: which evidence is linked to it. */
export function linkedEvidencePanel(kind) {
    return {
        title: 'الشواهد المرتبطة',
        render: (ctx, target) => {
            let titles = new Map();
            return childPanel(ctx, {
                load: async () => {
                    const [links, evidence] = await Promise.all([ctx.cms.admin.listEvidenceLinksFor(targetOf(kind, target.id)), ctx.cms.admin.evidence.list()]);
                    titles = new Map(evidence.map((e) => [e.id, e.title_ar]));
                    return links;
                },
                title: (r) => titles.get(r.evidence_id) ?? 'شاهد',
                fields: () => [{
                        kind: 'select', name: 'evidence_id', label: 'الشاهد', required: true,
                        options: async () => (await ctx.cms.admin.evidence.list()).map((e) => ({ value: e.id, label: `${e.title_ar}${e.is_published ? '' : ' (مسودة)'}` })),
                    }],
                addLabel: 'ربط شاهد',
                empty: 'لا توجد شواهد مرتبطة.',
                create: (v) => ctx.cms.admin.linkEvidence(str(v['evidence_id']), targetOf(kind, target.id)),
                remove: (r) => ctx.cms.admin.unlinkEvidence(r.id),
            });
        },
    };
}
/** On an evidence item: which experiences / achievements / projects it supports. */
export const evidenceTargetsPanel = {
    title: 'مرتبط بـ',
    render: (ctx, evidence) => {
        let names = new Map();
        const kindOf = (r) => (r.experience_id ? 'experience' : r.achievement_id ? 'achievement' : 'project');
        const idOf = (r) => r.experience_id ?? r.achievement_id ?? r.project_id ?? '';
        return childPanel(ctx, {
            load: async () => {
                const [links, ex, ac, pr] = await Promise.all([
                    ctx.cms.admin.listEvidenceLinks(evidence.id),
                    targetOptions(ctx, 'experience'),
                    targetOptions(ctx, 'achievement'),
                    targetOptions(ctx, 'project'),
                ]);
                names = new Map([...ex, ...ac, ...pr].map((o) => [o.value, o.label]));
                return links;
            },
            title: (r) => names.get(idOf(r)) ?? '—',
            subtitle: (r) => h('span', { class: 'badge badge-muted' }, TARGET_LABEL[kindOf(r)]),
            fields: () => [{
                    kind: 'select', name: 'target', label: 'اختر خبرة أو إنجازًا أو مشروعًا', required: true,
                    options: async () => {
                        const [ex, ac, pr] = await Promise.all([targetOptions(ctx, 'experience'), targetOptions(ctx, 'achievement'), targetOptions(ctx, 'project')]);
                        return [
                            ...ex.map((o) => ({ value: `experience:${o.value}`, label: `خبرة — ${o.label}` })),
                            ...ac.map((o) => ({ value: `achievement:${o.value}`, label: `إنجاز — ${o.label}` })),
                            ...pr.map((o) => ({ value: `project:${o.value}`, label: `مشروع — ${o.label}` })),
                        ];
                    },
                }],
            addLabel: 'إضافة ربط',
            empty: 'غير مرتبط بأي عنصر.',
            create: (v) => {
                const [kind, id] = str(v['target']).split(':');
                return ctx.cms.admin.linkEvidence(evidence.id, targetOf(kind, id));
            },
            remove: (r) => ctx.cms.admin.unlinkEvidence(r.id),
        });
    },
};
//# sourceMappingURL=panels.js.map