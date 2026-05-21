class TimerState {
	elapsedMs = $state(0);
	isRunning = $state(false);
	private intervalId: ReturnType<typeof setInterval> | null = null;

	start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.intervalId = setInterval(() => {
			this.elapsedMs += 100;
		}, 100);
	}

	pause(): void {
		this.isRunning = false;
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	reset(): void {
		this.pause();
		this.elapsedMs = 0;
	}

	restart(): void {
		this.reset();
		this.start();
	}

	get formatted(): string {
		const secs = Math.floor(this.elapsedMs / 1000);
		const mins = Math.floor(secs / 60);
		return `${String(mins).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
	}
}

export const timer = new TimerState();
