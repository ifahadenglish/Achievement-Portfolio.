/**
 * Tiny DOM builder shared by the dashboard and the public site. All text
 * goes through textContent / DOM nodes — never innerHTML with data — so
 * content from the database cannot inject markup into the page.
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
//# sourceMappingURL=dom.js.map