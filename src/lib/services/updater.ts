import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { info, error } from '@tauri-apps/plugin-log';

/**
 * Silent auto-update: checks GitHub Releases, downloads + installs, then
 * relaunches into the new version. Fully silent in the UI — every stage and
 * any error go to the file log only (Windows: %APPDATA%\com.zzlepuh.desktop\logs\).
 * Safe no-op outside the Tauri runtime (web/dev/E2E).
 */
export async function runSilentUpdate(): Promise<void> {
	if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;

	try {
		await info('[updater] checking…');
		const update = await check();
		if (!update) {
			await info('[updater] no update (already latest)');
			return;
		}
		await info(`[updater] found ${update.currentVersion} → ${update.version}; downloading…`);
		await update.downloadAndInstall();
		await info(`[updater] installed ${update.version}; relaunching…`);
		await relaunch();
	} catch (err) {
		await error(`[updater] FAILED: ${err instanceof Error ? err.message : String(err)}`);
	}
}
