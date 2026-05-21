import { type Page, type Locator, expect } from '@playwright/test';

export class BimaruPage {
	readonly page: Page;
	readonly btnNewGame: Locator;
	readonly btnHint: Locator;
	readonly btnCheck: Locator;
	readonly btnReset: Locator;
	readonly difficultySelect: Locator;
	readonly boardArea: Locator;
	readonly timer: Locator;
	readonly statsBar: Locator;
	readonly emptyState: Locator;
	readonly winOverlay: Locator;
	readonly btnPlayAgain: Locator;
	readonly fleetPanel: Locator;
	readonly sizeSelect: Locator;

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
		this.fleetPanel = page.locator('.fleet-panel');
	}

	async goto() {
		await this.page.goto('/bimaru');
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

	get editableCells(): Locator {
		return this.page.locator('[data-testid^="cell-"]:not(:disabled)');
	}

	get shipCells(): Locator {
		return this.page.locator('[data-testid^="cell-"].ship');
	}

	get playerShipCells(): Locator {
		return this.page.locator('[data-testid^="cell-"].ship:not(.hint)');
	}
}
