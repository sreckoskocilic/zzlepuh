import { check } from '@tauri-apps/plugin-updater';

/**
 * Silent auto-update: checks GitHub Releases, downloads + installs in the
 * background, then reports the new version so the UI can ask for a restart.
 * No buttons, no prompts. Safe no-op outside the Tauri runtime (web/dev).
 *
 * @param onInstalled called with the new version once the update is staged.
 */
export async function runSilentUpdate(onInstalled: (version: string) => void): Promise<void> {
	// Outside Tauri (browser/dev/E2E) the plugin bridge is absent — skip.
	if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;

	try {
		const update = await check();
		if (!update) return;
		await update.downloadAndInstall();
		onInstalled(update.version);
	} catch (err) {
		// Network down, no release yet, signature mismatch — fail quietly.
		console.error('[updater] silent update failed:', err);
	}
}
