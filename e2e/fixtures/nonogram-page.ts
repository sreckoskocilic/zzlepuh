import { type Page, type Locator, expect } from '@playwright/test';

export class NonogramPage {
	readonly page: Page;
	readonly btnNewGame: Locator;
	readonly btnHint: Locator;
	readonly btnCheck: Locator;
	readonly btnReset: Locator;
	readonly difficultySelect: Locator;
	readonly sizeSelect: Locator;
	readonly boardArea: Locator;
	readonly timer: Locator;
	readonly statsBar: Locator;
	readonly emptyState: Locator;
	readonly winOverlay: Locator;
	readonly btnPlayAgain: Locator;
	readonly pictureSelect: Locator;
	readonly pictureReveal: Locator;
	readonly pictureTitle: Locator;

	constructor(page: Page) {
		this.page = page;
		this.btnNewGame = page.locator('[data-testid="btn-new-game"]');
		this.btnHint = page.locator('[data-testid="btn-hint"]');
		this.btnCheck = page.locator('[data-testid="btn-check"]');
		this.btnReset = page.locator('[data-testid="btn-reset"]');
		this.difficultySelect = page.locator('[data-testid="difficulty-select"]');
		this.sizeSelect = page.locator('[data-testid="size-select"]');
		this.boardArea = page.locator('.board-area');
		this.timer = page.locator('[data-testid="timer"]');
		this.statsBar = page.locator('[data-testid="stats-bar"]');
		this.emptyState = page.locator('[data-testid="empty-state"]');
		this.winOverlay = page.locator('[data-testid="win-overlay"]');
		this.btnPlayAgain = page.locator('[data-testid="btn-play-again"]');
		this.pictureSelect = page.locator('[data-testid="picture-select"]');
		this.pictureReveal = page.locator('[data-testid="picture-reveal"]');
		this.pictureTitle = page.locator('[data-testid="picture-title"]');
	}

	async goto() {
		await this.page.goto('/nonogram');
	}

	async startNewGame() {
		await this.btnNewGame.click();
		await expect(this.boardArea).toBeVisible({ timeout: 10_000 });
	}

	cell(row: number, col: number): Locator {
		return this.page.locator(`[data-testid="cell-${row}-${col}"]`);
	}

	get allCells(): Locator {
		return this.page.locator('[data-testid^="cell-"]');
	}

	// The clue header spans several cells that all carry the same testid and
	// trigger the same fill handler; any one is a valid click target.
	rowClueHeader(row: number): Locator {
		return this.page.locator(`[data-testid="row-clue-${row}"]`).first();
	}

	colClueHeader(col: number): Locator {
		return this.page.locator(`[data-testid="col-clue-${col}"]`).first();
	}

	get filledCells(): Locator {
		return this.page.locator('[data-testid^="cell-"].filled');
	}

	get markedCells(): Locator {
		return this.page.locator('[data-testid^="cell-"].marked');
	}
}
