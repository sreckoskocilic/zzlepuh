import { test, expect } from '@playwright/test';
import { BimaruPage } from './fixtures/bimaru-page';
import { injectTauriMock, makeMockPuzzle } from './fixtures/tauri-mock';

test.describe('Bimaru', () => {
	let bimaru: BimaruPage;

	test.beforeEach(async ({ page }) => {
		await injectTauriMock(page);
		bimaru = new BimaruPage(page);
		await bimaru.goto();
	});

	test('shows empty state before starting game', async () => {
		await expect(bimaru.emptyState).toBeVisible();
		await expect(bimaru.emptyState).toContainText('New Game');
	});

	test('new game generates 10x10 board', async () => {
		await bimaru.startNewGame();
		await expect(bimaru.allCells).toHaveCount(100);
	});

	test('timer starts and ticks', async () => {
		await bimaru.startNewGame();
		await expect(bimaru.timer).toHaveText('00:00');
		await expect(bimaru.timer).not.toHaveText('00:00', { timeout: 3000 });
	});

	test('left-click places ship, right-click places water', async () => {
		await bimaru.startNewGame();

		const puzzle = makeMockPuzzle();
		let targetRow = -1, targetCol = -1;
		for (let r = 0; r < puzzle.rows && targetRow === -1; r++) {
			for (let c = 0; c < puzzle.cols; c++) {
				if (puzzle.hints[r][c] === 'empty') {
					targetRow = r;
					targetCol = c;
					break;
				}
			}
		}

		const cell = bimaru.cell(targetRow, targetCol);
		await expect(cell).toHaveClass(/empty/);

		// Left-click: ship
		await cell.click();
		await expect(cell).toHaveClass(/ship/);

		// Left-click again: back to empty
		await cell.click();
		await expect(cell).toHaveClass(/empty/);

		// Right-click: water
		await cell.click({ button: 'right' });
		await expect(cell).toHaveClass(/water/);

		// Right-click again: back to empty
		await cell.click({ button: 'right' });
		await expect(cell).toHaveClass(/empty/);
	});

	test('hint places a correct cell', async () => {
		await bimaru.startNewGame();
		const waterBefore = await bimaru.page.locator('[data-testid^="cell-"].water').count();
		const shipsBefore = await bimaru.shipCells.count();
		await bimaru.btnHint.click();

		const waterAfter = await bimaru.page.locator('[data-testid^="cell-"].water').count();
		const shipsAfter = await bimaru.shipCells.count();
		expect(waterAfter + shipsAfter).toBeGreaterThan(waterBefore + shipsBefore);
	});

	test('reset clears player moves', async () => {
		await bimaru.startNewGame();

		const cell = bimaru.editableCells.first();
		await cell.click();
		expect(await bimaru.playerShipCells.count()).toBeGreaterThan(0);

		await bimaru.btnReset.click();
		await expect(bimaru.playerShipCells).toHaveCount(0);
	});

	test('difficulty selector works', async () => {
		await expect(bimaru.difficultySelect).toHaveValue('medium');
		await bimaru.difficultySelect.selectOption('easy');
		await expect(bimaru.difficultySelect).toHaveValue('easy');
		await bimaru.difficultySelect.selectOption('hard');
		await expect(bimaru.difficultySelect).toHaveValue('hard');
	});

	test('size selector works', async () => {
		await expect(bimaru.sizeSelect).toHaveValue('10');
		await bimaru.sizeSelect.selectOption('6');
		await expect(bimaru.sizeSelect).toHaveValue('6');
		await bimaru.sizeSelect.selectOption('12');
		await expect(bimaru.sizeSelect).toHaveValue('12');
	});

	test('fleet panel visible during game', async () => {
		await bimaru.startNewGame();
		await expect(bimaru.fleetPanel).toBeVisible();
	});

	test('row and column clues displayed', async ({ page }) => {
		await bimaru.startNewGame();
		const clueButtons = page.locator('.board-area button[class*="clue"]');
		expect(await clueButtons.count()).toBeGreaterThanOrEqual(20);
	});

	test('stats bar visible during game', async () => {
		await bimaru.startNewGame();
		await expect(bimaru.statsBar).toBeVisible();
		await expect(bimaru.statsBar).toContainText('Games:');
	});

	test('hint and reset disabled before game, enabled after', async () => {
		await expect(bimaru.btnHint).toBeDisabled();
		await expect(bimaru.btnReset).toBeDisabled();
		await bimaru.startNewGame();
		await expect(bimaru.btnHint).toBeEnabled();
		await expect(bimaru.btnReset).toBeEnabled();
	});

	test('row clue click fills row with water', async ({ page }) => {
		await bimaru.startNewGame();
		const puzzle = makeMockPuzzle();

		let zeroRow = -1;
		for (let r = 0; r < puzzle.rows; r++) {
			if (puzzle.row_clues[r] === 0) { zeroRow = r; break; }
		}

		if (zeroRow >= 0) {
			const rowClue = page.locator(`button[class*="row-clue"]`).nth(zeroRow);
			await rowClue.click();

			for (let c = 0; c < puzzle.cols; c++) {
				if (puzzle.hints[zeroRow][c] === 'empty') {
					await expect(bimaru.cell(zeroRow, c)).toHaveClass(/water/);
				}
			}
		}
	});

	test('undo reverts last move', async () => {
		await bimaru.startNewGame();

		const cell = bimaru.editableCells.first();
		await expect(cell).toHaveClass(/empty/);

		await cell.click();
		await expect(cell).toHaveClass(/ship/);

		await bimaru.page.keyboard.press('Control+z');
		await expect(cell).toHaveClass(/empty/);
	});

	test('redo restores undone move', async () => {
		await bimaru.startNewGame();

		const cell = bimaru.editableCells.first();
		await cell.click();
		await expect(cell).toHaveClass(/ship/);

		await bimaru.page.keyboard.press('Control+z');
		await expect(cell).toHaveClass(/empty/);

		await bimaru.page.keyboard.press('Control+Shift+z');
		await expect(cell).toHaveClass(/ship/);
	});
});

test.describe('Bimaru Win Flow', () => {
	test('solve puzzle and see win overlay', async ({ page }) => {
		await injectTauriMock(page, { easy: true });
		const bimaru = new BimaruPage(page);
		await bimaru.goto();
		await bimaru.startNewGame();

		// Easy puzzle: 6x6, cells (4,1) and (5,4) need 'ship' (1 click each)
		await bimaru.cell(4, 1).click();
		await bimaru.cell(5, 4).click();

		await expect(bimaru.winOverlay).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Bimaru Check', () => {
	test('check highlights wrong cells', async ({ page }) => {
		await injectTauriMock(page, { easy: true });
		const bimaru = new BimaruPage(page);
		await bimaru.goto();
		await bimaru.startNewGame();

		// Place wrong value: cell (4,1) should be ship, right-click = water (wrong)
		await bimaru.cell(4, 1).click({ button: 'right' });
		await expect(bimaru.cell(4, 1)).toHaveClass(/water/);

		await bimaru.btnCheck.click();
		await expect(bimaru.cell(4, 1)).toHaveClass(/error/, { timeout: 2000 });

		// Error clears after ~2.5s
		await expect(bimaru.cell(4, 1)).not.toHaveClass(/error/, { timeout: 4000 });
	});

	test('check shows no errors on correct placement', async ({ page }) => {
		await injectTauriMock(page, { easy: true });
		const bimaru = new BimaruPage(page);
		await bimaru.goto();
		await bimaru.startNewGame();

		// Place correct value: cell (4,1) = ship (1 click)
		await bimaru.cell(4, 1).click();
		await expect(bimaru.cell(4, 1)).toHaveClass(/ship/);

		await bimaru.btnCheck.click();
		// Brief wait to ensure check completes
		await page.waitForTimeout(500);
		await expect(bimaru.cell(4, 1)).not.toHaveClass(/error/);
	});

	test('check button disabled before game', async ({ page }) => {
		await injectTauriMock(page);
		const bimaru = new BimaruPage(page);
		await bimaru.goto();
		await expect(bimaru.btnCheck).toBeDisabled();
	});
});

test.describe('Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await injectTauriMock(page);
	});

	test('home page shows game cards', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.game-card')).toHaveCount(3);
	});

	test('navigate home to bimaru', async ({ page }) => {
		await page.goto('/');
		await page.locator('a[href="/bimaru"]').first().click();
		await expect(page).toHaveURL('/bimaru');
	});

	test('home page shows app name', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toContainText('Zzlepuh');
	});
});
