/**
 * One binding routine for every list section (experiences, projects…):
 *   loading → static content stays, subtle pulse if slow
 *   error   → static content stays (logged)
 *   empty   → nothing published: static items replaced by a short note
 *   live    → static items replaced by rows from the database,
 *             re-rendered on every language switch
 */
import { markPending, setState } from './bridge.js';
import { emptyNote } from './render.js';
export async function bindList(site, b) {
    setState(b.name, 'loading');
    const clear = markPending(b.pending());
    let data;
    try {
        data = await b.load();
    }
    catch (e) {
        clear();
        setState(b.name, 'error');
        console.warn(`[cms] ${b.name}: using the built-in page content`, e);
        return;
    }
    clear();
    // From here the database owns the section (also when nothing is published).
    b.onTakeover?.();
    if (b.isEmpty(data)) {
        setState(b.name, 'empty');
        site.onApply((lang) => b.renderEmpty?.(emptyNote(lang)));
        return;
    }
    try {
        site.onApply((lang) => b.render(data, lang));
        setState(b.name, 'live');
    }
    catch (e) {
        setState(b.name, 'error');
        console.error(`[cms] ${b.name}: render failed`, e);
    }
}
/** Replace a set of sibling elements with new ones, in place. */
export function replaceItems(container, oldItems, next) {
    const anchor = oldItems[0] ?? null;
    for (const el of next)
        container.insertBefore(el, anchor);
    for (const el of oldItems)
        el.remove();
}
//# sourceMappingURL=bind-list.js.map