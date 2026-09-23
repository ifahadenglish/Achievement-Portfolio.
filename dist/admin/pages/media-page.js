/** Media library: every image / PDF (uploaded or external link). */
import { StorageClient, isCmsError } from '../../cms/index.js';
import { busy, button, formatBytes, h, icon, replaceChildren } from '../core/dom.js';
import { confirmDialog, errorMessage, openDialog, reportError, toast } from '../ui/feedback.js';
import { mediaThumb } from '../ui/media-field.js';
import { pageHeader } from './section-page.js';
export function mediaPage(ctx) {
    let rows = [];
    let kind = '';
    let query = '';
    const grid = h('div', { class: 'media-grid', attrs: { 'aria-busy': 'true' } });
    const uploads = h('div', { class: 'uploads' });
    const name = (m) => m.alt_ar || m.storage_path?.split('/').pop() || m.external_url || '';
    const render = () => {
        const list = rows.filter((m) => (!kind || m.kind === kind) && (!query || `${name(m)} ${m.alt_en ?? ''} ${m.external_url ?? ''}`.toLowerCase().includes(query)));
        if (!list.length) {
            replaceChildren(grid, h('p', { class: 'olist-empty' }, rows.length ? 'لا توجد نتائج مطابقة.' : 'لا توجد ملفات بعد.'));
            return;
        }
        replaceChildren(grid, list.map((m) => h('figure', { class: 'media-card' }, mediaThumb(ctx, m.id, m.kind), h('figcaption', null, h('span', { class: 'media-name' }, name(m)), h('span', { class: 'muted small' }, m.external_url ? 'رابط خارجي' : formatBytes(m.size_bytes))), h('div', { class: 'media-actions' }, button('', () => void copy(m), { icon: 'copy', title: 'نسخ الرابط', variant: 'plain', small: true }), button('', () => editAlt(m), { icon: 'pen', title: 'الوصف البديل', variant: 'plain', small: true }), button('', () => void remove(m), { icon: 'trash', title: 'حذف', variant: 'plain', small: true })))));
    };
    const load = async () => {
        grid.setAttribute('aria-busy', 'true');
        try {
            rows = await ctx.cms.admin.listMedia();
            rows.forEach((m) => ctx.media.put(m));
            render();
        }
        catch (e) {
            reportError(e);
            replaceChildren(grid, h('p', { class: 'olist-empty' }, 'تعذّر التحميل. '), button('إعادة المحاولة', () => void load(), { small: true }));
        }
        finally {
            grid.setAttribute('aria-busy', 'false');
        }
    };
    const copy = async (m) => {
        const url = ctx.cms.storage.url(m) ?? '';
        try {
            await navigator.clipboard.writeText(url);
            toast('تم نسخ الرابط', 'success');
        }
        catch {
            toast(url, 'info');
        }
    };
    const editAlt = (m) => {
        const ar = h('input', { class: 'input', props: { value: m.alt_ar ?? '' } });
        const en = h('input', { class: 'input', attrs: { dir: 'ltr' }, props: { value: m.alt_en ?? '' } });
        const d = openDialog({
            title: 'الوصف البديل للصورة',
            body: [
                h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'بالعربية'), ar),
                h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'English'), en),
                h('p', { class: 'hint' }, 'يُقرأ لقارئات الشاشة ويظهر إذا تعذّر تحميل الصورة.'),
            ],
        });
        const save = button('حفظ', () => void busy(save, async () => {
            try {
                const row = await ctx.cms.admin.updateMediaAlt(m.id, { ar: ar.value, en: en.value });
                rows = rows.map((r) => (r.id === row.id ? row : r));
                ctx.media.put(row);
                render();
                d.close();
            }
            catch (e) {
                reportError(e);
            }
        }), { variant: 'primary' });
        d.footer.append(button('إلغاء', () => d.close()), save);
    };
    const remove = async (m) => {
        if (!(await confirmDialog(`حذف "${name(m)}" نهائيًا؟`, { confirm: 'حذف', danger: true })))
            return;
        try {
            await ctx.cms.admin.deleteMedia(m.id);
            rows = rows.filter((r) => r.id !== m.id);
            ctx.media.forget(m.id);
            render();
            toast('تم الحذف', 'success');
        }
        catch (e) {
            if (isCmsError(e) && e.code === 'in_use')
                toast('لا يمكن حذف الملف لأنه مستخدم في محتوى. استبدله أو احذف المحتوى أولًا.', 'error');
            else
                reportError(e);
        }
    };
    const upload = async (file) => {
        const k = file.type === 'application/pdf' ? 'pdf' : 'image';
        const bar = h('progress', { attrs: { max: 1, value: 0 } });
        const line = h('div', { class: 'upload-line' }, icon(k === 'pdf' ? 'file-pdf' : 'image'), h('span', { class: 'media-name' }, file.name), bar);
        uploads.appendChild(line);
        try {
            StorageClient.checkFile(k, file);
            const row = await ctx.cms.admin[k === 'pdf' ? 'uploadPdf' : 'uploadImage']({ file, onProgress: (f) => (bar.value = f) });
            rows = [row, ...rows];
            ctx.media.put(row);
            render();
            line.remove();
            toast(`تم رفع ${file.name}`, 'success');
        }
        catch (e) {
            line.classList.add('upload-failed');
            line.appendChild(h('span', { class: 'field-error' }, isCmsError(e) && e.issues[0] ? e.issues[0].message : errorMessage(e)));
            line.appendChild(button('', () => line.remove(), { icon: 'xmark', title: 'إخفاء', variant: 'plain', small: true }));
        }
    };
    const picker = h('input', { attrs: { type: 'file', multiple: true, hidden: true, accept: 'image/jpeg,image/png,image/webp,image/gif,application/pdf' } });
    picker.addEventListener('change', () => {
        const files = [...(picker.files ?? [])];
        picker.value = '';
        void (async () => {
            for (const f of files)
                await upload(f);
        })();
    });
    const addLink = () => {
        const url = h('input', { class: 'input', attrs: { type: 'url', dir: 'ltr', placeholder: 'https://' } });
        const sel = h('select', { class: 'input input-narrow' }, h('option', { attrs: { value: 'pdf' } }, 'ملف PDF'), h('option', { attrs: { value: 'image' } }, 'صورة'));
        const err = h('div', { class: 'field-error' });
        const d = openDialog({ title: 'إضافة رابط خارجي', body: [h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'النوع'), sel), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'الرابط'), url, err)] });
        const save = button('إضافة', () => void busy(save, async () => {
            try {
                const row = await ctx.cms.admin.addExternalMedia(sel.value, url.value.trim());
                rows = [row, ...rows];
                ctx.media.put(row);
                render();
                d.close();
            }
            catch (e) {
                err.textContent = errorMessage(e);
            }
        }), { variant: 'primary' });
        d.footer.append(button('إلغاء', () => d.close()), save);
    };
    const search = h('input', { class: 'input search', attrs: { type: 'search', placeholder: 'بحث…', 'aria-label': 'بحث' } });
    search.addEventListener('input', () => {
        query = search.value.trim().toLowerCase();
        render();
    });
    const kindSel = h('select', { class: 'input input-narrow', attrs: { 'aria-label': 'النوع' } }, h('option', { attrs: { value: '' } }, 'الكل'), h('option', { attrs: { value: 'image' } }, 'صور'), h('option', { attrs: { value: 'pdf' } }, 'ملفات PDF'));
    kindSel.addEventListener('change', () => {
        kind = kindSel.value;
        render();
    });
    // Drag & drop onto the page (desktop convenience; the button works everywhere).
    const drop = h('div', { class: 'dropzone' }, icon('cloud-arrow-up'), h('span', null, 'اسحب الملفات هنا أو استخدم زر الرفع'), h('span', { class: 'muted small' }, 'صور حتى 5 ميجابايت · PDF حتى 25 ميجابايت'));
    drop.addEventListener('dragover', (e) => {
        e.preventDefault();
        drop.classList.add('over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('over');
        const files = [...(e.dataTransfer?.files ?? [])];
        void (async () => {
            for (const f of files)
                await upload(f);
        })();
    });
    void load();
    return h('div', { class: 'page' }, pageHeader('مكتبة الوسائط', 'كل الصور وملفات PDF. لا يمكن حذف ملف مستخدم في محتوى منشور أو مسودة.', button('رابط خارجي', addLink, { icon: 'link' }), button('رفع ملفات', () => picker.click(), { icon: 'upload', variant: 'primary' })), drop, uploads, h('div', { class: 'olist-tools' }, search, kindSel), grid, picker);
}
//# sourceMappingURL=media-page.js.map