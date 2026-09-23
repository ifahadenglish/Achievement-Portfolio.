export function getBridge() {
    return window.PortfolioSite ?? null;
}
export function setState(section, state) {
    document.documentElement.setAttribute(`data-cms-${section}`, state);
}
/**
 * Loading indicator: only shown when the request is slow, so a fast load
 * never flickers. Returns a function that clears it.
 */
export function markPending(elements, delayMs = 400) {
    const timer = setTimeout(() => {
        for (const el of elements)
            el.setAttribute('data-cms-pending', '');
    }, delayMs);
    return () => {
        clearTimeout(timer);
        for (const el of elements)
            el.removeAttribute('data-cms-pending');
    };
}
/** Show/hide without touching the element's own display rules. */
export function setShown(el, shown) {
    if (shown)
        el.style.removeProperty('display');
    else
        el.style.setProperty('display', 'none');
}
//# sourceMappingURL=bridge.js.map