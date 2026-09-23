/**
 * Generic page for any SectionConfig: list + search/filter + add/edit
 * dialog + publish + reorder + preview + delete (with file cleanup).
 */
import { isCmsError } from '../../cms/index.js';
import { busy, button, h } from '../core/dom.js';
import { confirmDialog, openDialog, reportError, toast } from '../ui/feedback.js';
import { createForm } from '../ui/form.js';
import { mediaThumb } from '../ui/media-field.js';
import { orderedList } from '../ui/ordered-list.js';
import { openPreview } from '../ui/preview.js';
const PUBLISH_FIELD = { kind: 'checkbox', name: 'is_published', label: 'منشور (ظاهر للزوار)' };
export function pageHeader(title, intro, ...actions) {
    return h('header', { class: 'page-head' }, h('div', null, h('h1', null, title), intro ? h('p', { class: 'muted' }, intro) : null), h('div', { class: 'page-actions' }, actions));
}
/** Open the add/edit dialog for a section. Resolves with the saved row (or null if cancelled). */
export function openEditor(ctx, cfg, row) {
    return new Promise((resolve) => {
        const collection = cfg.collection(ctx);
        const initial = row ?? { ...(cfg.defaults ?? {}), is_published: false };
        let saved = null;
        const form = createForm(ctx, [...cfg.fields(ctx), PUBLISH_FIELD], initial, { onSubmit: () => void save() });
        const d = openDialog({ title: row ? `تعديل ${cfg.singular}` : `إضافة ${cfg.singular}`, wide: true, body: form.el });
        if (row && cfg.panels?.length) {
            d.body.append(...cfg.panels.map((p) => h('section', { class: 'panel' }, h('h3', null, p.title), p.render(ctx, row))));
        }
        else if (!row && cfg.panels?.length) {
            d.body.append(h('p', { class: 'hint' }, `بعد الحفظ يمكنك إضافة: ${cfg.panels.map((p) => p.title).join('، ')}.`));
        }
        const saveBtn = button('حفظ', () => void save(), { variant: 'primary', icon: 'check' });
        d.footer.append(button('إلغاء', () => d.close()), saveBtn);
        const save = () => busy(saveBtn, async () => {
            form.clearIssues();
            try {
                const values = form.values();
                saved = row ? await collection.update(row.id, values) : await collection.create(values);
                await form.commit().catch(reportError);
                toast(row ? 'تم حفظ التعديلات' : `تمت إضافة ${cfg.singular}`, 'success');
                d.close();
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
        d.onClose(() => {
            if (!saved)
                void form.rollback().catch(reportError);
            resolve(saved);
        });
    });
}
export async function deleteItem(ctx, cfg, row) {
    const ok = await confirmDialog(`حذف "${cfg.rowTitle(row) || cfg.singular}"؟ ${cfg.deleteWarning ?? ''}`.trim(), { confirm: 'حذف', danger: true });
    if (!ok)
        return false;
    const extra = cfg.extraMediaOnDelete ? await cfg.extraMediaOnDelete(ctx, row) : [];
    const media = [...cfg.mediaColumns.map((c) => row[c]), ...extra].filter((x) => typeof x === 'string');
    await cfg.collection(ctx).remove(row.id);
    // Files only this item used are removed; shared ones are kept by the database.
    if (media.length)
        await ctx.cms.admin.releaseMedia(media).catch(reportError);
    toast('تم الحذف', 'success');
    return true;
}
export function sectionPage(ctx, cfg) {
    const collection = cfg.collection(ctx);
    const list = orderedList({
        load: async () => {
            const rows = await collection.list();
            await ctx.media.ensure(rows.flatMap((r) => [...(cfg.thumb ? [r[cfg.thumb.column]] : []), ...(cfg.mediaFor?.(r) ?? [])]));
            return rows;
        },
        title: (r) => cfg.rowTitle(r),
        ...(cfg.rowSubtitle ? { subtitle: (r) => cfg.rowSubtitle?.(r, ctx) } : {}),
        ...(cfg.thumb ? { thumb: (r) => mediaThumb(ctx, r[cfg.thumb?.column ?? ''], cfg.thumb?.kind ?? 'image') } : {}),
        ...(cfg.search ? { search: cfg.search } : {}),
        ...(cfg.filter ? { filter: cfg.filter } : {}),
        empty: `لا توجد عناصر بعد. اضغط "إضافة ${cfg.singular}".`,
        onEdit: (r) => void openEditor(ctx, cfg, r).then((s) => s && list.reload()),
        onPreview: (r) => openPreview(cfg.rowTitle(r), (lang) => cfg.preview(ctx, r, lang), r.is_published),
        onDelete: async (r) => {
            if (await deleteItem(ctx, cfg, r))
                await list.reload();
        },
        onPublish: async (r, p) => {
            await collection.setPublished(r.id, p);
            toast(p ? 'تم النشر' : 'تم الإخفاء (مسودة)', 'success');
        },
        onReorder: (ids, current) => collection.reorder(ids, current),
    });
    const add = button(`إضافة ${cfg.singular}`, () => void openEditor(ctx, cfg, null).then(async (s) => {
        if (!s)
            return;
        await list.reload();
        if (cfg.panels?.length) {
            const again = await openEditor(ctx, cfg, s);
            if (again)
                await list.reload();
        }
    }), { variant: 'primary', icon: 'plus' });
    return h('div', { class: 'page' }, pageHeader(cfg.title, cfg.intro, add), list.el);
}
export function withErrors(p) {
    return p.catch((e) => {
        reportError(e);
        return undefined;
    });
}
//# sourceMappingURL=section-page.js.map