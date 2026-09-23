/**
 * Tiny DOM helper. All text goes through textContent / DOM nodes — never
 * innerHTML with data — so content typed in the dashboard cannot inject
 * markup into the page.
 */
export function append(parent, ...children) {
    for (const c of children) {
        if (c === null || c === undefined || c === false)
            continue;
        if (Array.isArray(c))
            append(parent, ...c);
        else
            parent.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
}
export function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
        if (props.class)
            el.className = props.class;
        for (const [k, v] of Object.entries(props.attrs ?? {})) {
            if (v === null || v === undefined || v === false)
                continue;
            el.setAttribute(k, v === true ? '' : String(v));
        }
        for (const [k, v] of Object.entries(props.dataset ?? {}))
            el.dataset[k] = v;
        for (const [k, v] of Object.entries(props.props ?? {}))
            el[k] = v;
        for (const [evt, fn] of Object.entries(props.on ?? {}))
            el.addEventListener(evt, fn);
    }
    append(el, ...children);
    return el;
}
export function clear(el) {
    while (el.firstChild)
        el.removeChild(el.firstChild);
}
export function replaceChildren(el, ...children) {
    clear(el);
    append(el, ...children);
}
/**
 * Built-in SVG icons for every control the dashboard cannot work without
 * (move, edit, delete, preview, menu, close, upload…). They ship with the
 * code, so the controls stay visible even if the icon-font CDN is slow or
 * blocked. Other icons are decorative Font Awesome glyphs.
 */
const SVG_ICONS = {
    'arrow-up': 'M12 19V5 M5 12l7-7 7 7',
    'arrow-down': 'M12 5v14 M19 12l-7 7-7-7',
    pen: 'M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    xmark: 'M6 6l12 12 M18 6L6 18',
    bars: 'M4 6h16 M4 12h16 M4 18h16',
    plus: 'M12 5v14 M5 12h14',
    check: 'M5 12l5 5 9-10',
    upload: 'M12 16V4 M7 9l5-5 5 5 M4 20h16',
    link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
    copy: 'M9 9h10v11H9z M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4',
    'arrow-up-right-from-square': 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    'right-from-bracket': 'M15 12H4 M8 8l-4 4 4 4 M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5',
    'right-to-bracket': 'M4 12h11 M11 8l4 4-4 4 M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5',
};
const SVG_NS = 'http://www.w3.org/2000/svg';
export function icon(name, extra = '') {
    const d = SVG_ICONS[name];
    if (d) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('class', `ico ${extra}`.trim());
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
        return svg;
    }
    const style = name.startsWith('fab-') ? 'fab' : 'fas';
    const n = name.replace(/^fab-/, '');
    return h('i', { class: `${style} fa-${n} ${extra}`.trim(), attrs: { 'aria-hidden': 'true' } });
}
export function button(label, onClick, opts = {}) {
    const cls = ['btn', `btn-${opts.variant ?? 'ghost'}`, opts.small ? 'btn-sm' : ''].join(' ').trim();
    return h('button', { class: cls, attrs: { type: opts.type ?? 'button', title: opts.title, 'aria-label': opts.title }, on: { click: onClick } }, opts.icon ? icon(opts.icon) : null, label === '' ? null : h('span', null, label));
}
/** Disable a button while an async action runs; returns the action's result. */
export async function busy(btn, action) {
    btn.disabled = true;
    btn.classList.add('is-busy');
    try {
        return await action();
    }
    finally {
        btn.disabled = false;
        btn.classList.remove('is-busy');
    }
}
export function formatBytes(n) {
    if (!n)
        return '';
    if (n < 1024)
        return `${n} B`;
    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
let uid = 0;
export function nextId(prefix = 'f') {
    uid += 1;
    return `${prefix}-${uid}`;
}
//# sourceMappingURL=dom.js.map