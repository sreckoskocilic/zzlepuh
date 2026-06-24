const KEY = 'kontab:names';
const DEFAULTS = ['Ti', 'C1', 'C2', 'C3'];

class KontabNames {
	names = $state<string[]>([...DEFAULTS]);

	load(): void {
		try {
			const saved = localStorage.getItem(KEY);
			if (!saved) return;
			const arr = JSON.parse(saved);
			for (let i = 0; i < DEFAULTS.length; i++) {
				if (typeof arr[i] === 'string') this.names[i] = arr[i];
			}
		} catch {
			/* ignore */
		}
	}

	set(i: number, value: string): void {
		this.names[i] = value;
		try {
			localStorage.setItem(KEY, JSON.stringify(this.names));
		} catch {
			/* ignore */
		}
	}

	label(p: number): string {
		const name = this.names[p]?.trim();
		return name || DEFAULTS[p] || `C${p}`;
	}
}

export const kontabNames = new KontabNames();
