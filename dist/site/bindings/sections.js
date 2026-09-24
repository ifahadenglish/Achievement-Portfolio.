import { h } from '../../shared/dom.js';
import { bindList, replaceItems } from '../bind-list.js';
import { fa, formatDate, richText, tr, zoomable } from '../render.js';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
/** Keeps track of what a section rendered, so a language switch replaces it cleanly. */
function slot(container, initial) {
    let current = null;
    return (next) => {
        const c = container();
        if (!c)
            return;
        replaceItems(c, current ?? initial(), next);
        current = next;
    };
}
// ---------------------------------------------------------------- 3. experiences
export function bindExperiences(cms, site) {
    const put = slot(() => $('.timeline'), () => $$('.timeline > .t-item'));
    return bindList(site, {
        name: 'experiences',
        load: () => cms.public.listExperiences(),
        isEmpty: (rows) => rows.length === 0,
        pending: () => $$('.timeline > .t-item'),
        renderEmpty: (note) => put([note]),
        render: (rows, lang) => put(rows.map((r) => experienceItem(site, r, lang))),
    });
}
function experienceItem(site, r, lang) {
    const title = [tr(r, 'job_title', lang), tr(r, 'organization', lang)].filter(Boolean).join(' – ');
    const location = tr(r, 'location', lang);
    const start = formatDate(r.start_date, r.date_precision, lang);
    const date = r.is_current
        ? [`${start} - `, h('span', null, site.text('present', lang) ?? (lang === 'ar' ? 'الآن' : 'Present'))]
        : [r.end_date ? `${start} - ${formatDate(r.end_date, r.date_precision, lang)}` : start];
    return h('div', { class: `t-item${r.is_current ? ' current' : ''} reveal in` }, h('span', { class: 't-dot' }, fa(r.icon, 'chalkboard-teacher')), h('div', { class: 'card hoverable' }, h('div', null, h('h3', null, title), location ? h('div', { class: 't-meta' }, fa('location-dot', 'location-dot'), h('span', null, location)) : null), h('span', { class: 't-date' }, date)));
}
// --------------------------------------------------------------- 4. achievements
export function bindAchievements(cms, site) {
    const container = () => $('#achievements .container');
    const put = slot(container, () => $$('#achievements .card.achievement'));
    return bindList(site, {
        name: 'achievements',
        load: () => cms.public.listAchievements(),
        isEmpty: (rows) => rows.length === 0,
        pending: () => $$('#achievements .card.achievement'),
        renderEmpty: (note) => put([note]),
        render: (rows, lang) => put(rows.map((r) => achievementCard(cms, r, lang))),
    });
}
function images(cms, attachments) {
    return attachments.flatMap((a) => {
        const url = a.media ? cms.storage.url(a.media) : null;
        return url ? [zoomable(url, a.media?.alt_ar ?? '')] : [];
    });
}
function achievementCard(cms, r, lang) {
    const when = formatDate(r.achieved_on, r.date_precision, lang);
    const pics = images(cms, r.attachments);
    return h('div', { class: 'card achievement reveal in' }, h('div', null, h('span', { class: 'year-chip' }, fa('medal', 'medal'), when ? ` ${when} · ` : ' ', h('span', null, tr(r, 'title', lang))), h('p', { class: 'achievement-text' }, richText(tr(r, 'description', lang)))), h('div', { class: 'achievement-images' }, pics));
}
// -------------------------------------------------------------------- 5. courses
export function bindCourses(cms, site) {
    return bindList(site, {
        name: 'courses',
        load: () => cms.public.listCourses(),
        isEmpty: (rows) => rows.length === 0,
        pending: () => [$('#certsEdu'), $('#certsOther')].filter((x) => !!x),
        onTakeover: () => site.claim('courses'),
        renderEmpty: (note) => {
            $('#certsEdu')?.replaceChildren(note);
            const other = $('#certsOther');
            other?.replaceChildren();
            for (const el of [other, other?.previousElementSibling])
                if (el)
                    el.style.display = 'none';
            const count = $('#count-edu');
            if (count)
                count.style.display = 'none';
        },
        render: (rows, lang) => {
            for (const [cat, grid, count] of [['educational', '#certsEdu', '#count-edu'], ['other', '#certsOther', '#count-other']]) {
                const list = rows.filter((r) => r.category === cat);
                const gridEl = $(grid);
                if (!gridEl)
                    continue;
                gridEl.replaceChildren(...list.map((r) => courseCard(cms, site, r, lang)));
                const countEl = $(count);
                if (countEl)
                    countEl.textContent = `${list.length} ${site.text('certUnit', lang) ?? ''}`;
                // A group with no published courses is hidden (heading + grid).
                const head = gridEl.previousElementSibling;
                for (const el of [gridEl, head]) {
                    if (el)
                        el.style.display = list.length ? '' : 'none';
                }
            }
        },
    });
}
function courseCard(cms, site, r, lang) {
    const title = tr(r, 'title', lang);
    const img = r.image ? cms.storage.url(r.image) : null;
    const file = r.file ? cms.storage.url(r.file) : null;
    return h('article', { class: 'card hoverable cert' }, img ? zoomable(img, title) : null, h('div', { class: 'cert-body' }, h('h4', null, title), file ? h('a', { class: 'btn btn-primary btn-sm', attrs: { href: file, target: '_blank', rel: 'noopener' } }, fa('download', 'download'), site.text('certDownload', lang) ?? '') : null));
}
function embedUrl(url) {
    const m = /^https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/(?:view|preview)/.exec(url);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}
function openUrl(url) {
    const m = /^https:\/\/drive\.google\.com\/file\/d\/([^/]+)\//.exec(url);
    return m ? `https://drive.google.com/file/d/${m[1]}/view` : url;
}
export function bindEvidence(cms, site) {
    let active = 0;
    let near = false;
    let tabs = [];
    let lang = site.getLang();
    const frame = () => $('#pdfFrame');
    const show = () => {
        const t = tabs[active];
        const f = frame();
        if (!t || !f)
            return;
        $$('#pdfTabs button').forEach((b, i) => b.classList.toggle('active', i === active));
        const title = $('#pdfTitle');
        const desc = $('#pdfDesc');
        const note = $('#pdfNote');
        if (title)
            title.textContent = tr(t.item, 'title', lang);
        if (desc)
            desc.textContent = tr(t.item, 'description', lang);
        if (note) {
            note.textContent = tr(t.item, 'note', lang);
            const pill = note.closest('.pdf-note');
            if (pill)
                pill.style.display = note.textContent ? '' : 'none';
        }
        const url = t.item.document ? cms.storage.url(t.item.document) : null;
        const open = $('#openPdf');
        if (open && url)
            open.href = openUrl(url);
        if (!near || !url)
            return;
        // One iframe per document, created on first view and kept (like the page does today).
        f.querySelectorAll('iframe').forEach((x) => (x.style.display = 'none'));
        const id = `cms-pdf-${t.item.id}`;
        let ifr = f.querySelector(`#${CSS.escape(id)}`);
        if (!ifr) {
            ifr = h('iframe', { attrs: { id, src: embedUrl(url), title: tr(t.item, 'title', lang), allow: 'autoplay' } });
            f.insertBefore(ifr, $('#fsExit'));
        }
        ifr.style.display = 'block';
    };
    const renderTabs = () => {
        const bar = $('#pdfTabs');
        if (!bar)
            return;
        bar.replaceChildren(...tabs.map((t, i) => {
            const b = h('button', { class: i === active ? 'active' : '', attrs: { 'data-tab': String(i + 1), role: 'tab' } }, fa(t.category.icon, 'folder-open'), h('span', null, tr(t.category, 'name', lang)));
            b.addEventListener('click', () => {
                active = i;
                show();
            });
            return b;
        }));
    };
    return bindList(site, {
        name: 'evidence',
        load: async () => {
            const [cats, items] = await Promise.all([cms.public.listEvidenceCategories(), cms.public.listEvidence()]);
            // Today's page shows one document per tab: the first published item of each category.
            return cats.flatMap((category) => {
                const item = items.find((e) => e.category_id === category.id);
                return item ? [{ category, item }] : [];
            });
        },
        isEmpty: (t) => t.length === 0,
        pending: () => [$('#pdfTabs'), $('#pdfTitle'), $('#pdfDesc')].filter((x) => !!x),
        onTakeover: () => {
            site.claim('evidence');
            frame()?.querySelectorAll('iframe').forEach((x) => x.remove()); // drop the static documents
            const section = $('#portfolio');
            if (section) {
                const obs = new IntersectionObserver((entries) => {
                    if (entries.some((e) => e.isIntersecting)) {
                        near = true;
                        show();
                        obs.disconnect();
                    }
                }, { rootMargin: '400px' });
                obs.observe(section);
            }
        },
        renderEmpty: (note) => {
            $('#pdfTabs')?.replaceChildren();
            const panel = $('.pdf-panel');
            if (panel)
                panel.replaceChildren(note);
        },
        render: (t, l) => {
            tabs = t;
            lang = l;
            if (active >= tabs.length)
                active = 0;
            renderTabs();
            show();
        },
    });
}
// ---------------------------------------------- 7–8. projects + participations
const TAG_KEY = {
    interactive: 'filterInteractive', strategies: 'filterStrategies', presentations: 'filterPresentations', participations: 'filterParticipations',
};
export function bindProjectsAndParticipations(cms, site) {
    // Both live in the same grid today (projects first, then participations).
    const put = slot(() => $('.projects-grid'), () => $$('.projects-grid > .project'));
    return bindList(site, {
        name: 'projects',
        load: async () => {
            const [projects, participations] = await Promise.all([cms.public.listProjects(), cms.public.listParticipations()]);
            return { projects, participations };
        },
        isEmpty: (d) => d.projects.length + d.participations.length === 0,
        pending: () => $$('.projects-grid > .project'),
        renderEmpty: (note) => put([note]),
        render: (d, lang) => {
            put([...d.projects.map((p) => projectCard(cms, site, p, lang)), ...d.participations.map((p) => participationCard(cms, site, p, lang))]);
            applyActiveFilter();
        },
    }).then(() => {
        document.documentElement.setAttribute('data-cms-participations', document.documentElement.getAttribute('data-cms-projects') ?? '');
    });
}
/** Keep the filter the visitor selected when cards are re-rendered. */
function applyActiveFilter() {
    const f = $('#filters .filter-btn.active')?.getAttribute('data-filter') ?? 'all';
    $$('.projects-grid > .project').forEach((p) => p.classList.toggle('hidden', !(f === 'all' || p.getAttribute('data-category') === f)));
}
function tag(site, category, lang) {
    return h('span', { class: 'tag' }, site.text(TAG_KEY[category] ?? '', lang) ?? category);
}
function linksRow(links, lang) {
    if (!links.length)
        return null;
    return h('div', { class: 'project-links' }, links.map((l, i) => h('a', { class: `btn ${i === 0 ? 'btn-primary' : 'btn-outline'} btn-sm`, attrs: { href: l.url, target: '_blank', rel: 'noopener' } }, h('span', null, tr(l, 'label', lang)), fa('arrow-up-right-from-square', 'arrow-up-right-from-square'))));
}
function carousel(cms, attachments, lang) {
    const track = h('div', { class: 'carousel' }, attachments.flatMap((a) => {
        const url = a.media ? cms.storage.url(a.media) : null;
        return url ? [h('figure', { class: 'slide' }, zoomable(url, a.media?.alt_ar ?? ''), h('figcaption', null, tr(a, 'caption', lang)))] : [];
    }));
    const step = () => (track.querySelector('.slide')?.offsetWidth ?? 300) + 14;
    const dir = () => (document.documentElement.dir === 'rtl' ? -1 : 1);
    const prev = h('button', { class: 'car-btn', attrs: { 'aria-label': 'السابق' } }, fa('chevron-right', 'chevron-right'));
    const next = h('button', { class: 'car-btn', attrs: { 'aria-label': 'التالي' } }, fa('chevron-left', 'chevron-left'));
    prev.addEventListener('click', () => track.scrollBy({ left: -step() * dir(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step() * dir(), behavior: 'smooth' }));
    return h('div', { class: 'carousel-wrap' }, track, h('div', { class: 'car-controls' }, prev, next));
}
function projectCard(cms, site, p, lang) {
    const cover = p.cover ? cms.storage.url(p.cover) : null;
    const body = [
        cover ? null : tag(site, p.category, lang),
        h('h3', null, tr(p, 'title', lang)),
        h('p', null, richText(tr(p, 'description', lang))),
    ];
    if (p.is_wide) {
        if (p.attachments.length)
            body.push(carousel(cms, p.attachments, lang));
    }
    else if (p.attachments.length) {
        body.push(h('div', { class: 'part-images' }, images(cms, p.attachments)));
    }
    body.push(linksRow(p.links, lang));
    return h('article', { class: p.is_wide ? 'card project wide' : 'card hoverable project', attrs: { 'data-category': p.category } }, cover ? h('div', { class: 'project-media' }, tag(site, p.category, lang), h('img', { attrs: { src: cover, alt: p.cover?.alt_ar ?? '', loading: 'lazy' } })) : null, h('div', { class: 'project-body' }, body));
}
function participationCard(cms, site, p, lang) {
    const pics = images(cms, p.attachments);
    return h('article', { class: 'card hoverable project', attrs: { 'data-category': 'participations' } }, h('div', { class: 'project-body' }, tag(site, 'participations', lang), h('h3', null, tr(p, 'title', lang)), h('p', null, richText(tr(p, 'description', lang))), pics.length ? h('div', { class: 'part-images' }, pics) : null));
}
// ------------------------------------------------------------ 9. recommendations
export function bindRecommendations(cms, site) {
    const put = slot(() => $('.testi-grid'), () => $$('.testi-grid > .testi'));
    return bindList(site, {
        name: 'recommendations',
        load: () => cms.public.listRecommendations(),
        isEmpty: (rows) => rows.length === 0,
        pending: () => $$('.testi-grid > .testi'),
        renderEmpty: (note) => put([note]),
        render: (rows, lang) => put(rows.map((r) => recommendationCard(cms, r, lang))),
    });
}
function recommendationCard(cms, r, lang) {
    const avatar = r.avatar ? cms.storage.url(r.avatar) : null;
    return h('figure', { class: 'card hoverable testi reveal in' }, h('span', { class: 'q' }, fa('quote-right', 'quote-right')), h('blockquote', null, tr(r, 'quote', lang)), h('figcaption', { class: 'testi-author' }, h('span', { class: 'avatar-ph' }, avatar ? h('img', { attrs: { src: avatar, alt: tr(r, 'author_name', lang), loading: 'lazy' } }) : fa(r.icon, 'user')), h('div', null, h('strong', null, tr(r, 'author_name', lang)), h('span', null, tr(r, 'author_role', lang)))));
}
// -------------------------------------------------------------- 10. site metrics
/**
 * The page shows the same three metrics twice (hero + "about") with
 * different label wording in each place. Values come from the database;
 * the labels stay the page's own until that is decided.
 */
export function bindStats(cms, site) {
    const slots = () => [$$('.hero-stats .hero-stat'), $$('.stats-grid .stat-card')];
    return bindList(site, {
        name: 'stats',
        load: () => cms.public.listStats(),
        isEmpty: (rows) => rows.length === 0,
        pending: () => slots().flat(),
        renderEmpty: () => slots().flat().forEach((el) => (el.style.display = 'none')),
        render: (rows) => {
            for (const group of slots()) {
                group.forEach((el, i) => {
                    const stat = rows[i];
                    el.style.display = stat ? '' : 'none';
                    const num = el.querySelector('.num');
                    if (!stat || !num)
                        return;
                    num.dataset['count'] = String(stat.value);
                    // The page's counter defaults to "+"; only a different suffix is stored on the element.
                    if (stat.suffix === '+')
                        delete num.dataset['suffix'];
                    else
                        num.dataset['suffix'] = stat.suffix;
                    num.textContent = `${stat.value}${stat.suffix}`; // the page's counter animation reads these values live
                });
            }
        },
    });
}
//# sourceMappingURL=sections.js.map