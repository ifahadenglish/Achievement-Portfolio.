/**
 * Portfolio CMS data layer — entry point.
 *
 *   import { createCms } from './dist/cms/index.js';
 *   import config from './dist/cms/runtime-config.js';
 *   const cms = createCms(config);
 *   const experiences = await cms.public.listExperiences();
 *
 * Uses only the publishable key; all protection is enforced by RLS.
 */
import { AdminApi } from './admin-api.js';
import { AuthClient, defaultSessionStore } from './auth.js';
import { resolveConfig } from './config.js';
import { HttpClient } from './http.js';
import { PublicApi } from './public-api.js';
import { StorageClient } from './storage.js';
export function createCms(config, options = {}) {
    const cfg = resolveConfig(config);
    const http = new HttpClient(cfg, options.fetch);
    const auth = new AuthClient(http, options.sessionStore ?? defaultSessionStore(), options.now);
    const storage = new StorageClient(http);
    return {
        auth,
        public: new PublicApi(http),
        admin: new AdminApi(http, auth, storage),
        storage,
    };
}
export { CmsError, isCmsError } from './errors.js';
export { mediaUrl, BUCKET_RULES } from './storage.js';
export { validateInsert, validateUpdate, isSafeHttpUrl, DATE_PRECISIONS, PROFILE_ITEM_KINDS, COURSE_CATEGORIES, PROJECT_CATEGORIES, } from './validation.js';
export { StorageClient } from './storage.js';
//# sourceMappingURL=index.js.map