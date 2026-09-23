import { h, nextId } from '../core/dom.js';
import { mediaField } from './media-field.js';
const PRECISION_OPTIONS = [
    { value: 'year', label: 'سنة' },
    { value: 'month', label: 'شهر' },
    { value: 'day', label: 'يوم' },
];
export function createForm(ctx, fields, initial, opts = {}) {
    const readers = [];
    const errorSlots = new Map();
    const mediaColumns = [];
    const created = [];
    const initialMedia = [];
    const precisionSelects = new Map();
    const checkboxes = new Map();
    const errorSlot = (column) => {
        const el = h('div', { class: 'field-error', attrs: { role: 'alert' } });
        errorSlots.set(column, el);
        return el;
    };
    const label = (text, forId, required, lang) => h('label', { class: 'field-label', attrs: { for: forId } }, text, lang ? h('span', { class: 'lang-tag' }, lang) : null, required ? h('span', { class: 'req', attrs: { 'aria-hidden': 'true' } }, '*') : null);
    const textInput = (spec, column, lang, required) => {
        const id = nextId();
        const ltr = lang === 'en' || spec.kind === 'url' || spec.kind === 'email' || spec.kind === 'tel';
        const value = initial[column] ?? '';
        const input = spec.kind === 'textarea'
            ? h('textarea', { class: 'input', attrs: { id, rows: spec.rows ?? 4, dir: ltr ? 'ltr' : 'rtl', required }, props: { value } })
            : h('input', {
                class: 'input',
                attrs: { id, type: spec.kind === 'text' ? 'text' : spec.kind, dir: ltr ? 'ltr' : 'rtl', required, placeholder: spec.placeholder, autocomplete: 'off' },
                props: { value },
            });
        readers.push({ columns: [column], read: (out) => (out[column] = input.value) });
        return h('div', { class: 'field' }, label(spec.label, id, required, lang === null ? undefined : lang === 'ar' ? 'عربي' : 'EN'), input, errorSlot(column));
    };
    const linesInput = (spec, column, lang) => {
        const id = nextId();
        const value = (initial[column] ?? []).join('\n');
        const input = h('textarea', { class: 'input', attrs: { id, rows: 4, dir: lang === 'en' ? 'ltr' : 'rtl' }, props: { value } });
        readers.push({ columns: [column], read: (out) => (out[column] = input.value.split('\n')) });
        return h('div', { class: 'field' }, label(spec.label, id, false, lang === null ? undefined : lang === 'ar' ? 'عربي' : 'EN'), input, h('div', { class: 'hint' }, 'عنصر في كل سطر'), errorSlot(column));
    };
    const dateInput = (spec) => {
        const id = nextId();
        const raw = initial[spec.name] ?? '';
        const precSelect = spec.precisionName
            ? h('select', { class: 'input input-narrow', attrs: { 'aria-label': 'دقة التاريخ' } }, PRECISION_OPTIONS.map((o) => h('option', { attrs: { value: o.value } }, o.label)))
            : null;
        if (precSelect) {
            precSelect.value = initial[spec.precisionName ?? ''] ?? 'day';
            precisionSelects.set(spec.precisionName ?? '', precSelect);
        }
        const shared = spec.followPrecision ? precisionSelects.get(spec.followPrecision) ?? null : null;
        const input = h('input', { class: 'input', attrs: { id, dir: 'ltr', required: spec.required } });
        const toInput = (iso, p) => (!iso ? '' : p === 'year' ? iso.slice(0, 4) : p === 'month' ? iso.slice(0, 7) : iso);
        const apply = (p, keep) => {
            input.type = p === 'year' ? 'number' : p === 'month' ? 'month' : 'date';
            if (p === 'year') {
                input.min = '1950';
                input.max = '2100';
                input.placeholder = '2021';
            }
            else {
                input.removeAttribute('min');
                input.removeAttribute('max');
                input.placeholder = '';
            }
            input.value = toInput(keep, p);
        };
        const current = () => precSelect?.value ?? shared?.value ?? 'day';
        const toIso = () => toIsoFor(current());
        const toIsoFor = (p) => {
            const v = input.value.trim();
            if (!v)
                return null;
            if (p === 'year')
                return /^\d{4}$/.test(v) ? `${v}-01-01` : v;
            if (p === 'month')
                return /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v;
            return v;
        };
        apply(current(), raw);
        const toggle = spec.disabledBy ? checkboxes.get(spec.disabledBy) : undefined;
        if (toggle) {
            const sync = () => {
                input.disabled = toggle.checked;
                if (toggle.checked)
                    input.value = '';
            };
            toggle.addEventListener('change', sync);
            sync();
        }
        let last = current();
        const onPrecision = () => {
            const keep = toIsoFor(last);
            last = current();
            apply(last, keep ?? '');
        };
        precSelect?.addEventListener('change', onPrecision);
        shared?.addEventListener('change', onPrecision);
        readers.push({
            columns: [spec.name, ...(spec.precisionName ? [spec.precisionName] : [])],
            read: (out) => {
                out[spec.name] = toIso();
                if (spec.precisionName)
                    out[spec.precisionName] = current();
            },
        });
        return h('div', { class: 'field' }, label(spec.label, id, spec.required), h('div', { class: 'row-inline' }, input, precSelect), errorSlot(spec.name));
    };
    const render = (spec) => {
        if (spec.kind === 'group') {
            const inner = spec.fields.map(render);
            return spec.collapsed
                ? h('details', { class: 'group' }, h('summary', null, spec.label), h('div', { class: 'group-body' }, inner))
                : h('fieldset', { class: 'group' }, h('legend', null, spec.label), h('div', { class: 'group-body' }, inner));
        }
        const hint = spec.hint ? h('div', { class: 'hint' }, spec.hint) : null;
        switch (spec.kind) {
            case 'text':
            case 'textarea':
            case 'url':
            case 'email':
            case 'tel':
                if (spec.bilingual) {
                    return h('div', { class: 'bilingual' }, textInput(spec, `${spec.name}_ar`, 'ar', !!spec.required), textInput(spec, `${spec.name}_en`, 'en', false), hint);
                }
                return [textInput(spec, spec.name, null, !!spec.required), hint];
            case 'lines':
                if (spec.bilingual)
                    return h('div', { class: 'bilingual' }, linesInput(spec, `${spec.name}_ar`, 'ar'), linesInput(spec, `${spec.name}_en`, 'en'));
                return linesInput(spec, spec.name, null);
            case 'number': {
                const id = nextId();
                const input = h('input', {
                    class: 'input input-narrow',
                    attrs: { id, type: 'number', min: spec.min, step: 1, dir: 'ltr', required: spec.required },
                    props: { value: initial[spec.name] === null || initial[spec.name] === undefined ? '' : String(initial[spec.name]) },
                });
                readers.push({ columns: [spec.name], read: (out) => (out[spec.name] = input.value === '' ? null : Number(input.value)) });
                return h('div', { class: 'field' }, label(spec.label, id, spec.required), input, hint, errorSlot(spec.name));
            }
            case 'checkbox': {
                const id = nextId();
                const input = h('input', { attrs: { id, type: 'checkbox' }, props: { checked: initial[spec.name] === true } });
                checkboxes.set(spec.name, input);
                readers.push({ columns: [spec.name], read: (out) => (out[spec.name] = input.checked) });
                return h('div', { class: 'field field-check' }, h('label', { class: 'check', attrs: { for: id } }, input, h('span', null, spec.label)), hint, errorSlot(spec.name));
            }
            case 'select': {
                const id = nextId();
                const select = h('select', { class: 'input', attrs: { id, required: spec.required } });
                const fill = (options) => {
                    select.replaceChildren(...(spec.empty !== undefined ? [h('option', { attrs: { value: '' } }, spec.empty)] : []), ...options.map((o) => h('option', { attrs: { value: o.value } }, o.label)));
                    select.value = initial[spec.name] ?? (spec.empty !== undefined ? '' : (options[0]?.value ?? ''));
                };
                if (Array.isArray(spec.options))
                    fill(spec.options);
                else {
                    select.append(h('option', { attrs: { value: '' } }, '…'));
                    void spec.options().then(fill);
                }
                readers.push({ columns: [spec.name], read: (out) => (out[spec.name] = select.value === '' ? null : select.value) });
                return h('div', { class: 'field' }, label(spec.label, id, spec.required), select, hint, errorSlot(spec.name));
            }
            case 'date':
                return [dateInput(spec), hint];
            case 'media': {
                let value = initial[spec.name] ?? null;
                if (value)
                    initialMedia.push(value);
                mediaColumns.push(spec.name);
                const slot = errorSlot(spec.name);
                const field = mediaField(ctx, {
                    kind: spec.mediaKind,
                    allowExternal: spec.allowExternal ?? false,
                    initial: value,
                    onChange: (id) => (value = id),
                    onCreated: (row) => created.push(row),
                });
                readers.push({ columns: [spec.name], read: (out) => (out[spec.name] = value) });
                return h('div', { class: 'field' }, h('span', { class: 'field-label' }, spec.label, spec.required ? h('span', { class: 'req' }, '*') : null), field.el, hint, slot);
            }
        }
    };
    const form = h('form', { class: 'form', attrs: { novalidate: true } }, fields.map(render));
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        opts.onSubmit?.();
    });
    const values = () => {
        const out = {};
        for (const r of readers)
            r.read(out);
        return out;
    };
    const mediaIds = () => {
        const v = values();
        return mediaColumns.map((c) => v[c]).filter((x) => typeof x === 'string');
    };
    return {
        el: form,
        values,
        mediaIds,
        showIssues(issues) {
            for (const slot of errorSlots.values())
                slot.textContent = '';
            let first = null;
            for (const issue of issues) {
                const slot = errorSlots.get(issue.field);
                if (slot) {
                    slot.textContent = issue.message;
                    first ??= slot;
                }
            }
            first?.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        },
        clearIssues() {
            for (const slot of errorSlots.values())
                slot.textContent = '';
        },
        async commit() {
            const now = new Set(mediaIds());
            const stale = [...initialMedia, ...created.map((c) => c.id)].filter((id) => !now.has(id));
            if (!stale.length)
                return;
            const { deleted } = await ctx.cms.admin.releaseMedia(stale);
            for (const id of deleted)
                ctx.media.forget(id);
        },
        async rollback() {
            const keep = new Set(initialMedia);
            const fresh = created.map((c) => c.id).filter((id) => !keep.has(id));
            if (fresh.length)
                await ctx.cms.admin.releaseMedia(fresh);
        },
    };
}
//# sourceMappingURL=form.js.map