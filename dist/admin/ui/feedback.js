/** Toasts, dialogs and confirmations — shared by every page. */
import { isCmsError } from '../../cms/index.js';
import { button, h, icon } from '../core/dom.js';
let toastHost = null;
export function toast(message, kind = 'info') {
    toastHost ??= document.body.appendChild(h('div', { class: 'toasts', attrs: { 'aria-live': 'polite', role: 'status' } }));
    const ico = kind === 'success' ? 'circle-check' : kind === 'error' ? 'circle-exclamation' : 'circle-info';
    const t = h('div', { class: `toast toast-${kind}` }, icon(ico), h('span', null, message));
    toastHost.appendChild(t);
    setTimeout(() => t.classList.add('out'), kind === 'error' ? 6000 : 3000);
    setTimeout(() => t.remove(), kind === 'error' ? 6400 : 3400);
}
/** Arabic, user-safe description of any error. */
export function errorMessage(e) {
    if (isCmsError(e)) {
        const detail = e.code === 'validation' && e.issues.length === 1 && e.issues[0]?.field === 'file' ? e.issues[0].message : '';
        return detail || e.messageAr;
    }
    return 'حدث خطأ غير متوقع.';
}
export function reportError(e) {
    console.error(e);
    toast(errorMessage(e), 'error');
}
/** Modal dialog: full-screen sheet on phones, centred panel on larger screens. */
export function openDialog(opts) {
    const body = h('div', { class: 'dlg-body' });
    const footer = h('div', { class: 'dlg-footer' });
    const closers = [];
    const el = h('dialog', { class: `dlg ${opts.wide ? 'dlg-wide' : ''}`, attrs: { 'aria-label': opts.title } });
    const close = () => {
        if (el.open)
            el.close();
    };
    el.append(h('header', { class: 'dlg-head' }, h('h2', null, opts.title), button('', close, { icon: 'xmark', title: 'إغلاق', variant: 'plain' })), body, footer);
    if (opts.body)
        body.append(...[opts.body].flat());
    if (opts.footer)
        footer.append(...[opts.footer].flat());
    el.addEventListener('close', () => {
        for (const fn of closers)
            fn();
        el.remove();
    });
    document.body.appendChild(el);
    el.showModal();
    return { el, body, footer, close, onClose: (fn) => closers.push(fn) };
}
export function confirmDialog(message, opts = {}) {
    return new Promise((resolve) => {
        let answered = false;
        const d = openDialog({ title: 'تأكيد', body: h('p', { class: 'confirm-text' }, message) });
        const yes = button(opts.confirm ?? 'تأكيد', () => {
            answered = true;
            resolve(true);
            d.close();
        }, { variant: opts.danger ? 'danger' : 'primary' });
        const no = button('إلغاء', () => d.close());
        d.footer.append(no, yes);
        d.onClose(() => {
            if (!answered)
                resolve(false);
        });
        yes.focus();
    });
}
//# sourceMappingURL=feedback.js.map