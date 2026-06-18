import { formatTime } from '$lib/utils/format';

class TimerState {
	elapsedMs = $state(0);
	isRunning = $state(false);
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private startTime = 0;
	private pausedMs = 0;

	start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.startTime = Date.now();
		this.intervalId = setInterval(() => {
			this.elapsedMs = Date.now() - this.startTime + this.pausedMs;
		}, 100);
	}

	pause(): void {
		if (!this.isRunning) return;
		// Read the clock directly; the interval's last sample can be up to 100ms behind.
		this.elapsedMs = Date.now() - this.startTime + this.pausedMs;
		this.pausedMs = this.elapsedMs;
		this.isRunning = false;
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	reset(): void {
		this.pause();
		this.elapsedMs = 0;
		this.pausedMs = 0;
	}

	restart(): void {
		this.reset();
		this.start();
	}

	get formatted(): string {
		return formatTime(this.elapsedMs);
	}
}

export const timer = new TimerState();
