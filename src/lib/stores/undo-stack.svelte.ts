/**
 * Generic undo/redo history shared by all games. Holds opaque move objects; the
 * caller supplies an `apply` callback that mutates game state for a popped move.
 * Pushing a new move clears the redo branch, matching standard editor semantics.
 */
export class UndoStack<M> {
	private history = $state<M[]>([]);
	private redoStack = $state<M[]>([]);

	get canUndo(): boolean {
		return this.history.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	/** Record a move and drop any redo branch. */
	push(move: M): void {
		this.history.push(move);
		this.redoStack = [];
	}

	/** Pop the last move, apply it, and stage it for redo. Returns false if empty. */
	undo(apply: (move: M) => void): boolean {
		const move = this.history.pop();
		if (move === undefined) return false;
		apply(move);
		this.redoStack.push(move);
		return true;
	}

	/** Re-apply the last undone move. Returns false if there is nothing to redo. */
	redo(apply: (move: M) => void): boolean {
		const move = this.redoStack.pop();
		if (move === undefined) return false;
		apply(move);
		this.history.push(move);
		return true;
	}

	/** Drop all history (e.g. on a new game or reset). */
	clear(): void {
		this.history = [];
		this.redoStack = [];
	}
}
