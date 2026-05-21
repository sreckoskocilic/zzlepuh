import { load, Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;

async function getStore(): Promise<Store> {
	if (!store) {
		store = await load('zzlepuh-data.json', { defaults: {}, autoSave: true });
	}
	return store;
}

export async function getData<T>(key: string): Promise<T | null> {
	try {
		const s = await getStore();
		const val = await s.get<T>(key);
		return val ?? null;
	} catch {
		return null;
	}
}

export async function setData<T>(key: string, value: T): Promise<void> {
	try {
		const s = await getStore();
		await s.set(key, value);
		await s.save();
	} catch {
		// silently fail
	}
}
