import { MediaCache } from './core/context.js';
import { busy, button, h, icon, replaceChildren } from './core/dom.js';
import { errorMessage, reportError } from './ui/feedback.js';
import { mediaPage } from './pages/media-page.js';
import { profilePage } from './pages/profile-page.js';
import { sectionPage } from './pages/section-page.js';
import { achievementsSection, coursesSection, evidenceCategoriesSection, evidenceSection, experiencesSection, linksSection, participationsSection, profileItemsSection, projectsSection, recommendationsSection, statsSection, } from './sections/sections.js';
const section = (cfg) => ({ path: cfg.route, title: cfg.title, icon: cfg.icon, render: (ctx) => sectionPage(ctx, cfg) });
const NAV = [
    { group: 'الملف', routes: [
            { path: 'profile', title: 'الملف الشخصي', icon: 'user', render: profilePage },
            section(statsSection),
            section(profileItemsSection),
            section(linksSection),
        ] },
    { group: 'المسيرة', routes: [
            section(experiencesSection),
            section(evidenceSection),
            section(evidenceCategoriesSection),
            section(achievementsSection),
            section(coursesSection),
        ] },
    { group: 'الأعمال', routes: [
            section(projectsSection),
            section(participationsSection),
            section(recommendationsSection),
        ] },
    { group: 'الملفات', routes: [{ path: 'media', title: 'مكتبة الوسائط', icon: 'photo-film', render: mediaPage }] },
];
const ROUTES = new Map(NAV.flatMap((g) => g.routes).map((r) => [r.path, r]));
function loginView(cms, onDone, message) {
    const email = h('input', { class: 'input', attrs: { type: 'email', dir: 'ltr', autocomplete: 'username', required: true, id: 'login-email' } });
    const password = h('input', { class: 'input', attrs: { type: 'password', dir: 'ltr', autocomplete: 'current-password', required: true, id: 'login-password' } });
    const err = h('div', { class: 'field-error', attrs: { role: 'alert' } }, message ?? '');
    const submit = button('تسجيل الدخول', () => undefined, { variant: 'primary', type: 'submit', icon: 'right-to-bracket' });
    const form = h('form', { class: 'login-card' }, h('div', { class: 'login-brand' }, h('span', { class: 'brand-mark' }, 'ف'), h('div', null, h('strong', null, 'لوحة التحكم'), h('span', { class: 'muted small' }, 'الملف المهني'))), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'البريد الإلكتروني'), email), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'كلمة المرور'), password), err, submit);
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        err.textContent = '';
        void busy(submit, async () => {
            try {
                await cms.auth.signIn(email.value, password.value);
                if (!(await cms.auth.isAdmin())) {
                    await cms.auth.signOut();
                    err.textContent = 'هذا الحساب ليس لديه صلاحية إدارة الموقع.';
                    return;
                }
                onDone();
            }
            catch (e2) {
                err.textContent = errorMessage(e2);
            }
        });
    });
    setTimeout(() => email.focus(), 0);
    return h('main', { class: 'login' }, form);
}
function homeView(ctx) {
    const cards = h('div', { class: 'home-grid' });
    const counts = [
        [ROUTES.get('experiences'), () => ctx.cms.admin.experiences.list()],
        [ROUTES.get('evidence'), () => ctx.cms.admin.evidence.list()],
        [ROUTES.get('achievements'), () => ctx.cms.admin.achievements.list()],
        [ROUTES.get('courses'), () => ctx.cms.admin.courses.list()],
        [ROUTES.get('projects'), () => ctx.cms.admin.projects.list()],
        [ROUTES.get('participations'), () => ctx.cms.admin.participations.list()],
        [ROUTES.get('recommendations'), () => ctx.cms.admin.recommendations.list()],
        [ROUTES.get('stats'), () => ctx.cms.admin.stats.list()],
    ];
    for (const [route, load] of counts) {
        const num = h('span', { class: 'home-num' }, '…');
        const sub = h('span', { class: 'muted small' }, '');
        cards.appendChild(h('a', { class: 'home-card', attrs: { href: `#/${route.path}` } }, icon(route.icon), h('span', { class: 'home-title' }, route.title), num, sub));
        load().then((rows) => {
            const pub = rows.filter((r) => r.is_published).length;
            num.textContent = String(rows.length);
            sub.textContent = rows.length ? `${pub} منشور · ${rows.length - pub} مسودة` : 'فارغ';
        }).catch((e) => {
            num.textContent = '—';
            reportError(e);
        });
    }
    return h('div', { class: 'page' }, h('header', { class: 'page-head' }, h('div', null, h('h1', null, 'الرئيسية'), h('p', { class: 'muted' }, 'نظرة سريعة على محتوى ملفك المهني. العناصر الجديدة تبدأ كمسودة حتى تنشرها.'))), cards);
}
export function startApp(root, cms) {
    const ctx = { cms, media: new MediaCache(cms) };
    const main = h('main', { class: 'content', attrs: { id: 'content', tabindex: '-1' } });
    const nav = h('nav', { class: 'sidebar', attrs: { 'aria-label': 'أقسام لوحة التحكم' } });
    const menuBtn = button('', () => document.body.classList.toggle('nav-open'), { icon: 'bars', title: 'القائمة', variant: 'plain' });
    menuBtn.classList.add('menu-btn');
    const signOut = button('خروج', () => void cms.auth.signOut().then(() => showLogin()), { icon: 'right-from-bracket', variant: 'plain', small: true });
    const topbar = h('header', { class: 'topbar' }, menuBtn, h('a', { class: 'brand', attrs: { href: '#/' } }, h('span', { class: 'brand-mark' }, 'ف'), h('span', { class: 'brand-text' }, 'لوحة التحكم')), h('div', { class: 'topbar-actions' }, h('a', { class: 'btn btn-ghost btn-sm', attrs: { href: './index.html', target: '_blank', rel: 'noopener' } }, icon('arrow-up-right-from-square'), h('span', { class: 'hide-sm' }, 'الموقع')), signOut));
    const renderNav = (active) => replaceChildren(nav, h('a', { class: `nav-link ${active === '' ? 'active' : ''}`, attrs: { href: '#/' } }, icon('house'), h('span', null, 'الرئيسية')), NAV.map((g) => h('div', { class: 'nav-group' }, h('div', { class: 'nav-group-title' }, g.group), g.routes.map((r) => h('a', { class: `nav-link ${active === r.path ? 'active' : ''}`, attrs: { href: `#/${r.path}`, 'aria-current': active === r.path ? 'page' : null } }, icon(r.icon), h('span', null, r.title))))));
    const route = () => {
        const path = location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
        const r = ROUTES.get(path);
        renderNav(r ? path : '');
        document.body.classList.remove('nav-open');
        replaceChildren(main, r ? r.render(ctx) : homeView(ctx));
        document.title = `${r?.title ?? 'الرئيسية'} · لوحة التحكم`;
        main.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    };
    const shell = h('div', { class: 'shell' }, topbar, h('div', { class: 'scrim', on: { click: () => document.body.classList.remove('nav-open') } }), nav, main);
    const showApp = () => {
        replaceChildren(root, shell);
        route();
    };
    function showLogin(message) {
        replaceChildren(root, loginView(cms, showApp, message));
    }
    window.addEventListener('hashchange', () => {
        if (root.contains(shell))
            route();
    });
    // Gate: a stored session must still belong to an admin.
    void (async () => {
        replaceChildren(root, h('div', { class: 'boot' }, icon('circle-notch', 'fa-spin'), ' جارٍ التحميل…'));
        try {
            if (cms.auth.getSession() && (await cms.auth.isAdmin()))
                showApp();
            else
                showLogin();
        }
        catch (e) {
            showLogin(errorMessage(e));
        }
    })();
}
//# sourceMappingURL=app.js.map