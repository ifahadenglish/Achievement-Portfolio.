/**
 * Typed → generic boundary. Values from forms are validated by the CMS
 * layer (validateInsert/validateUpdate) before anything is sent, so this
 * cast does not bypass any check.
 */
export function generic(c) {
    return {
        list: () => c.list(),
        create: (v) => c.create(v),
        update: (id, v) => c.update(id, v),
        remove: (id) => c.remove(id),
        setPublished: (id, p) => c.setPublished(id, p),
        reorder: (ids, current) => c.reorder(ids, current),
    };
}
export const str = (v) => (typeof v === 'string' ? v : '');
//# sourceMappingURL=types.js.map