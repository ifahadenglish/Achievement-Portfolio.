/**
 * Public site: connects migrated sections of index.html to Supabase,
 * one binding per migration. If anything fails, the page keeps its
 * built-in static content.
 */
import { createCms } from '../cms/index.js';
import { getBridge } from './bridge.js';
import { bindProfile } from './bindings/profile.js';
import { bindAchievements, bindCourses, bindEvidence, bindExperiences, bindProjectsAndParticipations, bindRecommendations, bindStats, } from './bindings/sections.js';
async function main() {
    const site = getBridge();
    if (!site)
        return; // page without the seam: nothing to bind
    let config;
    try {
        config = (await import('../cms/runtime-config.js')).default;
    }
    catch (e) {
        console.warn('[cms] no runtime config — keeping static content', e);
        return;
    }
    let cms;
    try {
        // Public visitors should not wait long: fall back to static content quickly.
        cms = createCms({ ...config, timeoutMs: 8000 });
    }
    catch (e) {
        console.warn('[cms] invalid config — keeping static content', e);
        return;
    }
    // Every section binds independently: one failing keeps only its own static content.
    await Promise.all([
        bindProfile(cms, site), // 1 profile + 2 photo
        bindExperiences(cms, site),
        bindAchievements(cms, site),
        bindCourses(cms, site),
        bindEvidence(cms, site),
        bindProjectsAndParticipations(cms, site),
        bindRecommendations(cms, site),
        bindStats(cms, site),
    ].map((p) => p.catch((e) => console.error('[cms]', e))));
}
void main();
//# sourceMappingURL=main.js.map