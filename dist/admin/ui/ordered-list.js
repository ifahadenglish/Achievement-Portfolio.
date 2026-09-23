/**
 * One list component for every ordered collection in the dashboard
 * (sections, project links, galleries, evidence links): search, filter,
 * publish toggle, move up/down, edit, preview, delete. Pages only supply
 * how a row looks and what the actions do.
 */
import { button, h, icon, replaceChildren } from '../core/dom.js';
import { reportError } from './feedback.js';
export function orderedList(opts) {
    let rows = [];
    let query = '';
    let filterValue = '';
    const listEl = h('ul', { class: `olist ${opts.compact ? 'olist-compact' : ''}`, attrs: { 'aria-busy': 'true' } });
    const status = h('div', { class: 'olist-status', attrs: { 'aria-live': 'polite' } });
    const searchInput = opts.search
        ? h('input', { class: 'input search', attrs: { type: 'search', placeholder: 'بحث…', 'aria-label': 'بحث' } })
        : null;
    const filterSelect = opts.filter
        ? h('select', { class: 'input input-narrow', attrs: { 'aria-label': opts.filter.label } }, h('option', { attrs: { value: '' } }, `${opts.filter.label}: الكل`), opts.filter.options.map((o) => h('option', { attrs: { value: o.value } }, o.label)))
        : null;
    const visible = () => rows.filter((r) => {
        if (query && opts.search && !opts.search(r).toLowerCase().includes(query))
            return false;
        if (filterValue && opts.filter && !opts.filter.match(r, filterValue))
            return false;
        return true;
    });
    const canReorder = () => !!opts.onReorder && !query && !filterValue;
    const move = async (index, delta) => {
        const target = index + delta;
        if (!opts.onReorder || target < 0 || target >= rows.length)
            return;
        const next = rows.slice();
        const [item] = next.splice(index, 1);
        if (!item)
            return;
        next.splice(target, 0, item);
        const current = Object.fromEntries(rows.map((r) => [r.id, r.sort_order ?? 0]));
        rows = next; // optimistic
        render();
        try {
            await opts.onReorder(next.map((r) => r.id), current);
            rows = rows.map((r, i) => ({ ...r, sort_order: (i + 1) * 10 }));
        }
        catch (e) {
            reportError(e);
            await reload();
        }
    };
    const render = () => {
        const list = visible();
        const reorder = canReorder();
        status.textContent =
            rows.length === 0 ? '' : list.length === rows.length ? `${rows.length} عنصر` : `${list.length} من ${rows.length}`;
        if (!list.length) {
            replaceChildren(listEl, h('li', { class: 'olist-empty' }, rows.length ? 'لا توجد نتائج مطابقة.' : opts.empty));
            return;
        }
        replaceChildren(listEl, list.map((row) => {
            const index = rows.indexOf(row);
            const published = row.is_published;
            const actions = [];
            if (opts.onPublish && published !== undefined) {
                const sw = h('button', {
                    class: `switch ${published ? 'on' : ''}`,
                    attrs: { type: 'button', role: 'switch', 'aria-checked': published ? 'true' : 'false', title: published ? 'منشور — اضغط للإخفاء' : 'مسودة — اضغط للنشر' },
                }, h('span', { class: 'switch-knob' }));
                sw.addEventListener('click', async () => {
                    sw.disabled = true;
                    try {
                        await opts.onPublish?.(row, !published);
                        row.is_published = !published;
                        render();
                    }
                    catch (e) {
                        reportError(e);
                        sw.disabled = false;
                    }
                });
                actions.push(sw);
            }
            if (reorder) {
                actions.push(button('', () => void move(index, -1), { icon: 'arrow-up', title: 'تحريك لأعلى', variant: 'plain', small: true }), button('', () => void move(index, 1), { icon: 'arrow-down', title: 'تحريك لأسفل', variant: 'plain', small: true }));
            }
            if (opts.onPreview)
                actions.push(button('', () => opts.onPreview?.(row), { icon: 'eye', title: 'معاينة', variant: 'plain', small: true }));
            if (opts.onEdit)
                actions.push(button('', () => opts.onEdit?.(row), { icon: 'pen', title: 'تعديل', variant: 'plain', small: true }));
            if (opts.onDelete) {
                const del = button('', async () => {
                    try {
                        await opts.onDelete?.(row);
                    }
                    catch (e) {
                        reportError(e);
                    }
                }, { icon: 'trash', title: 'حذف', variant: 'plain', small: true });
                del.classList.add('danger-text');
                actions.push(del);
            }
            return h('li', { class: 'olist-item', dataset: { id: row.id } }, opts.thumb ? h('div', { class: 'olist-thumb' }, opts.thumb(row)) : null, h('div', { class: 'olist-main' }, h('div', { class: 'olist-title' }, h('span', null, opts.title(row) || '(بدون عنوان)'), published === false ? h('span', { class: 'badge badge-draft' }, 'مسودة') : null), opts.subtitle ? h('div', { class: 'olist-sub' }, opts.subtitle(row)) : null), h('div', { class: 'olist-actions' }, actions));
        }));
        if (!reorder && opts.onReorder && rows.length > 1) {
            listEl.appendChild(h('li', { class: 'olist-note' }, icon('circle-info'), ' امسح البحث والتصفية لإعادة الترتيب.'));
        }
    };
    const reload = async () => {
        listEl.setAttribute('aria-busy', 'true');
        replaceChildren(listEl, h('li', { class: 'olist-empty' }, 'جارٍ التحميل…'));
        try {
            rows = await opts.load();
            render();
        }
        catch (e) {
            reportError(e);
            replaceChildren(listEl, h('li', { class: 'olist-empty' }, 'تعذّر التحميل. ', button('إعادة المحاولة', () => void reload(), { small: true })));
        }
        finally {
            listEl.setAttribute('aria-busy', 'false');
        }
    };
    searchInput?.addEventListener('input', () => {
        query = searchInput.value.trim().toLowerCase();
        render();
    });
    filterSelect?.addEventListener('change', () => {
        filterValue = filterSelect.value;
        render();
    });
    const tools = searchInput || filterSelect ? h('div', { class: 'olist-tools' }, searchInput, filterSelect, status) : status;
    const el = h('div', { class: 'olist-wrap' }, tools, listEl);
    void reload();
    return { el, reload, rows: () => rows };
}
//# sourceMappingURL=ordered-list.js.map