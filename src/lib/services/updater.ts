import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { info, error } from '@tauri-apps/plugin-log';

/**
 * Auto-update with VISIBLE status so a stuck/failed update can be diagnosed
 * on a user's machine without opening a log file. Reports each stage (and any
 * error text) via onStatus; restarts the app once the update is installed.
 * Safe no-op outside the Tauri runtime (web/dev/E2E).
 */
export async function runSilentUpdate(onStatus: (msg: string) => void): Promise<void> {
	if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;

	try {
		await info('[updater] checking…');
		const update = await check();
		if (!update) {
			await info('[updater] no update (already latest)');
			return; // up to date — say nothing
		}
		onStatus(`Pronađena v${update.version} — preuzimam…`);
		await info(`[updater] found ${update.currentVersion} → ${update.version}; downloading…`);
		await update.downloadAndInstall();
		await info(`[updater] installed ${update.version}; relaunching…`);
		onStatus(`Ažurirano na v${update.version} — ponovo pokrećem…`);
		await relaunch();
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await error(`[updater] FAILED: ${msg}`);
		onStatus(`Update greška: ${msg}`);
	}
}
