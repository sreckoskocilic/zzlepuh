import type { Locator, Page } from '@playwright/test';

export class KontabPage {
	readonly page: Page;
	readonly root: Locator;
	readonly hand: Locator;
	readonly handCards: Locator;
	readonly opponents: Locator;
	readonly seats: Locator;
	readonly table: Locator;
	readonly scoreboard: Locator;
	readonly scoreRows: Locator;
	readonly newGame: Locator;
	readonly opponentCount: Locator;
	readonly dealSummary: Locator;
	readonly continueBtn: Locator;
	readonly gameOver: Locator;
	readonly result: Locator;
	readonly playAgain: Locator;

	constructor(page: Page) {
		this.page = page;
		this.root = page.getByTestId('kontab-page');
		this.hand = page.getByTestId('kontab-hand');
		this.handCards = page.locator('[data-testid="kontab-hand"] [data-testid^="hand-"]');
		this.opponents = page.getByTestId('kontab-opponents');
		this.seats = page.locator('[data-testid="kontab-opponents"] .seat');
		this.table = page.getByTestId('kontab-table');
		this.scoreboard = page.getByTestId('kontab-scoreboard');
		this.scoreRows = page.locator('[data-testid="kontab-scoreboard"] [data-testid^="score-"]');
		this.newGame = page.getByTestId('kontab-new-game');
		this.opponentCount = page.getByTestId('kontab-opponent-count');
		this.dealSummary = page.getByTestId('kontab-deal-summary');
		this.continueBtn = page.getByTestId('kontab-continue');
		this.gameOver = page.getByTestId('kontab-game-over');
		this.result = page.getByTestId('kontab-result');
		this.playAgain = page.getByTestId('kontab-play-again');
	}

	async goto() {
		await this.page.goto('/kontab');
	}

	async playFirstCard() {
		await this.handCards.first().click();
	}
}
