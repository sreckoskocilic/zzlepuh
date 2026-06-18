/** Format a millisecond duration as mm:ss (zero-padded). */
export function formatTime(ms: number): string {
	const secs = Math.floor(ms / 1000);
	const mins = Math.floor(secs / 60);
	return `${String(mins).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}
