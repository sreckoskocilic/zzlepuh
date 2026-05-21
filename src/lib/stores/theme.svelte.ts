import { getData, setData } from '$lib/services/persistence';

export type ThemeName = 'emerald' | 'ocean' | 'slate' | 'midnight' | 'ember';

export const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
	{ id: 'emerald', label: 'Emerald', swatch: '#34D399' },
	{ id: 'ocean', label: 'Ocean', swatch: '#38bdf8' },
	{ id: 'slate', label: 'Slate', swatch: '#818cf8' },
	{ id: 'midnight', label: 'Midnight', swatch: '#c084fc' },
	{ id: 'ember', label: 'Ember', swatch: '#fb923c' }
];

class ThemeStore {
	current = $state<ThemeName>('emerald');

	async init() {
		const saved = await getData<ThemeName>('theme');
		if (saved && THEMES.some((t) => t.id === saved)) {
			this.current = saved;
		}
		this.apply();
	}

	async set(theme: ThemeName) {
		this.current = theme;
		this.apply();
		await setData('theme', theme);
	}

	private apply() {
		if (typeof document === 'undefined') return;
		const el = document.documentElement;
		if (this.current === 'emerald') {
			el.removeAttribute('data-theme');
		} else {
			el.setAttribute('data-theme', this.current);
		}
	}
}

export const themeStore = new ThemeStore();
