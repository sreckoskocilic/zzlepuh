import { load, Store } from '@tauri-apps/plugin-store';

const PRIMARY = 'zzlepuh-data.json';
const BACKUP = 'zzlepuh-data.bak.json';
const SENTINEL = '__schemaVersion';
const SCHEMA_VERSION = 1;

interface Stores {
	primary: Store;
	backup: Store;
}

let storePromise: Promise<Stores> | null = null;

async function openStores(): Promise<Stores> {
	const primary = await load(PRIMARY, { defaults: {}, autoSave: true });
	const backup = await load(BACKUP, { defaults: {}, autoSave: true });

	const stamped = (await primary.get<number>(SENTINEL)) !== undefined;
	if (!stamped && (await primary.length()) === 0) {
		const saved = await backup.entries<unknown>();
		if (saved.length > 0) {
			for (const [k, v] of saved) await primary.set(k, v);
			await primary.save();
		}
	}
	if (!stamped) {
		await primary.set(SENTINEL, SCHEMA_VERSION);
		await primary.save();
	}

	return { primary, backup };
}

function getStores(): Promise<Stores> {
	if (!storePromise) {
		storePromise = openStores().catch((e) => {
			storePromise = null;
			throw e;
		});
	}
	return storePromise;
}

export async function getData<T>(key: string): Promise<T | null> {
	try {
		const { primary } = await getStores();
		const val = await primary.get<T>(key);
		return val ?? null;
	} catch {
		return null;
	}
}

export async function setData<T>(key: string, value: T): Promise<void> {
	try {
		const { primary, backup } = await getStores();
		await primary.set(key, value);
		await primary.save();
		await backup.set(key, value);
		await backup.save();
	} catch (e) {
		console.error('persistence: failed to save', key, e);
	}
}
