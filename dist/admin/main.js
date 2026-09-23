/** Admin dashboard entry point (loaded by admin.html). */
import { createCms, isCmsError } from '../cms/index.js';
import { startApp } from './app.js';
async function boot() {
    const root = document.getElementById('app');
    if (!root)
        return;
    try {
        const mod = (await import('../cms/runtime-config.js'));
        startApp(root, createCms(mod.default));
    }
    catch (e) {
        console.error(e);
        root.textContent = isCmsError(e) && e.code === 'config'
            ? 'إعدادات الاتصال غير صحيحة. راجع ملف .env ثم أعد البناء.'
            : 'تعذّر تشغيل لوحة التحكم: ملف الإعدادات runtime-config.js غير موجود. نفّذ npm run build.';
    }
}
void boot();
//# sourceMappingURL=main.js.map