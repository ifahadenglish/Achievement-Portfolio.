import { TableClient } from './rest.js';
const PUBLISHED = { column: 'is_published', op: 'eq', value: true };
const BY_SORT = [{ column: 'sort_order' }, { column: 'created_at' }];
const ATTACHMENTS = 'attachments:media_attachments(*,media:media(*))';
const ATTACHMENT_ORDER = { column: 'sort_order', referencedTable: 'attachments' };
export class PublicApi {
    t;
    constructor(http) {
        const c = (k) => new TableClient(http, k);
        this.t = {
            profile: c('profile'), site_settings: c('site_settings'), profile_stats: c('profile_stats'),
            profile_links: c('profile_links'), profile_items: c('profile_items'), experiences: c('experiences'),
            evidence_categories: c('evidence_categories'), evidence_items: c('evidence_items'),
            evidence_links: c('evidence_links'), achievements: c('achievements'), courses: c('courses'),
            projects: c('projects'), participations: c('participations'), recommendations: c('recommendations'),
        };
    }
    getProfile() {
        return this.t.profile.maybeOne({ select: '*,photo:media!profile_photo_id_fkey(*)' });
    }
    getSiteSettings() {
        return this.t.site_settings.maybeOne({ select: '*,og_image:media!site_settings_og_image_id_fkey(*)' });
    }
    listStats() {
        return this.t.profile_stats.list({ filters: [PUBLISHED], order: BY_SORT });
    }
    listLinks() {
        return this.t.profile_links.list({ filters: [PUBLISHED], order: BY_SORT });
    }
    listProfileItems(kind) {
        const filters = [PUBLISHED];
        if (kind)
            filters.push({ column: 'kind', op: 'eq', value: kind });
        return this.t.profile_items.list({ filters, order: BY_SORT });
    }
    listExperiences() {
        return this.t.experiences.list({ filters: [PUBLISHED], order: BY_SORT });
    }
    listEvidenceCategories() {
        return this.t.evidence_categories.list({ filters: [PUBLISHED], order: BY_SORT });
    }
    listEvidence(categoryId) {
        const filters = [PUBLISHED];
        if (categoryId)
            filters.push({ column: 'category_id', op: 'eq', value: categoryId });
        return this.t.evidence_items.list({
            select: [
                '*',
                'category:evidence_categories!evidence_items_category_id_fkey(*)',
                'document:media!evidence_items_document_id_fkey(*)',
                'thumbnail:media!evidence_items_thumbnail_id_fkey(*)',
            ].join(','),
            filters,
            order: BY_SORT,
        });
    }
    /** Evidence linked to an experience, achievement or project. */
    async listEvidenceFor(target) {
        const column = 'experienceId' in target ? 'experience_id' : 'achievementId' in target ? 'achievement_id' : 'project_id';
        const value = 'experienceId' in target ? target.experienceId : 'achievementId' in target ? target.achievementId : target.projectId;
        const links = await this.t.evidence_links.list({ select: 'evidence_id', filters: [{ column, op: 'eq', value }] });
        if (!links.length)
            return [];
        const ids = links.map((l) => l.evidence_id);
        const items = await this.listEvidence();
        return items.filter((e) => ids.includes(e.id));
    }
    listAchievements() {
        return this.t.achievements.list({
            select: `*,${ATTACHMENTS}`,
            filters: [PUBLISHED],
            order: [...BY_SORT, ATTACHMENT_ORDER],
        });
    }
    listCourses(category) {
        const filters = [PUBLISHED];
        if (category)
            filters.push({ column: 'category', op: 'eq', value: category });
        return this.t.courses.list({
            select: '*,image:media!courses_certificate_image_id_fkey(*),file:media!courses_certificate_file_id_fkey(*)',
            filters,
            order: BY_SORT,
        });
    }
    listProjects() {
        return this.t.projects.list({
            select: `*,cover:media!projects_cover_image_id_fkey(*),links:project_links(*),${ATTACHMENTS}`,
            filters: [PUBLISHED],
            order: [...BY_SORT, ATTACHMENT_ORDER, { column: 'sort_order', referencedTable: 'links' }],
        });
    }
    listParticipations() {
        return this.t.participations.list({
            select: `*,${ATTACHMENTS}`,
            filters: [PUBLISHED],
            order: [...BY_SORT, ATTACHMENT_ORDER],
        });
    }
    listRecommendations() {
        return this.t.recommendations.list({
            select: '*,avatar:media!recommendations_avatar_id_fkey(*)',
            filters: [PUBLISHED],
            order: BY_SORT,
        });
    }
}
//# sourceMappingURL=public-api.js.map