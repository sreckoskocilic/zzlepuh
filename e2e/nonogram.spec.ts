import { test, expect } from '@playwright/test';
import { NonogramPage } from './fixtures/nonogram-page';
import { injectTauriMock } from './fixtures/tauri-mock';

test.describe('Nonogram', () => {
	let nono: NonogramPage;

	test.beforeEach(async ({ page }) => {
		await injectTauriMock(page);
		nono = new NonogramPage(page);
		await nono.goto();
	});

	test('shows empty state before starting game', async () => {
		await expect(nono.emptyState).toBeVisible();
		await expect(nono.emptyState).toContainText('New Game');
	});

	test('new game generates 5x5 board', async () => {
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();
		await expect(nono.allCells).toHaveCount(25);
	});

	test('left-click fills cell, right-click marks cell', async () => {
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();

		const cell = nono.cell(0, 0);

		// Left-click: fill
		await cell.click();
		await expect(cell).toHaveClass(/filled/);

		// Left-click again: back to empty
		await cell.click();
		await expect(cell).not.toHaveClass(/filled/);

		// Right-click: mark
		await cell.click({ button: 'right' });
		await expect(cell).toHaveClass(/marked/);

		// Right-click again: back to empty
		await cell.click({ button: 'right' });
		await expect(cell).not.toHaveClass(/marked/);
	});

	test('hint places a correct cell', async () => {
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();

		const filledBefore = await nono.filledCells.count();
		const markedBefore = await nono.markedCells.count();
		await nono.btnHint.click();

		const filledAfter = await nono.filledCells.count();
		const markedAfter = await nono.markedCells.count();
		expect(filledAfter + markedAfter).toBeGreaterThan(filledBefore + markedBefore);
	});

	test('reset clears all player moves', async () => {
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();

		await nono.cell(0, 0).click();
		await nono.cell(0, 1).click();
		expect(await nono.filledCells.count()).toBe(2);

		await nono.btnReset.click();
		await expect(nono.filledCells).toHaveCount(0);
		await expect(nono.markedCells).toHaveCount(0);
	});

	test('hint and reset disabled before game, enabled after', async () => {
		await expect(nono.btnHint).toBeDisabled();
		await expect(nono.btnReset).toBeDisabled();
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();
		await expect(nono.btnHint).toBeEnabled();
		await expect(nono.btnReset).toBeEnabled();
	});

	test('undo reverts last move', async () => {
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();

		const cell = nono.cell(0, 0);
		await cell.click();
		await expect(cell).toHaveClass(/filled/);

		await nono.page.keyboard.press('Control+z');
		await expect(cell).not.toHaveClass(/filled/);
	});

	test('redo restores undone move', async () => {
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();

		const cell = nono.cell(0, 0);
		await cell.click();
		await expect(cell).toHaveClass(/filled/);

		await nono.page.keyboard.press('Control+z');
		await expect(cell).not.toHaveClass(/filled/);

		await nono.page.keyboard.press('Control+Shift+z');
		await expect(cell).toHaveClass(/filled/);
	});
});

test.describe('Nonogram Win Flow', () => {
	test('solve puzzle and see win overlay', async ({ page }) => {
		await injectTauriMock(page);
		const nono = new NonogramPage(page);
		await nono.goto();
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();

		// Mock solution:
		// row0: [T, T, F, F, F]
		// row1: [F, F, F, T, F]
		// row2: [T, T, T, F, F]
		// row3: [F, T, F, T, F]
		// row4: [T, F, F, F, F]

		const filled = [
			[0, 0], [0, 1],
			[1, 3],
			[2, 0], [2, 1], [2, 2],
			[3, 1], [3, 3],
			[4, 0]
		];
		const marked = [
			[0, 2], [0, 3], [0, 4],
			[1, 0], [1, 1], [1, 2], [1, 4],
			[2, 3], [2, 4],
			[3, 0], [3, 2], [3, 4],
			[4, 1], [4, 2], [4, 3], [4, 4]
		];

		for (const [r, c] of filled) {
			await nono.cell(r, c).click();
		}
		for (const [r, c] of marked) {
			await nono.cell(r, c).click({ button: 'right' });
		}

		await expect(nono.winOverlay).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Nonogram Check', () => {
	test('check highlights wrong cells', async ({ page }) => {
		await injectTauriMock(page);
		const nono = new NonogramPage(page);
		await nono.goto();
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();

		// Cell (0,0) should be filled, mark it instead (wrong)
		await nono.cell(0, 0).click({ button: 'right' });
		await expect(nono.cell(0, 0)).toHaveClass(/marked/);

		await nono.btnCheck.click();
		await expect(nono.cell(0, 0)).toHaveClass(/error/, { timeout: 2000 });

		// Error clears after ~2.5s
		await expect(nono.cell(0, 0)).not.toHaveClass(/error/, { timeout: 4000 });
	});

	test('check button disabled before game', async ({ page }) => {
		await injectTauriMock(page);
		const nono = new NonogramPage(page);
		await nono.goto();
		await expect(nono.btnCheck).toBeDisabled();
	});
});

test.describe('Nonogram Picture Mode', () => {
	const filled = [
		[0, 0], [0, 1],
		[1, 3],
		[2, 0], [2, 1], [2, 2],
		[3, 1], [3, 3],
		[4, 0]
	];
	const marked = [
		[0, 2], [0, 3], [0, 4],
		[1, 0], [1, 1], [1, 2], [1, 4],
		[2, 3], [2, 4],
		[3, 0], [3, 2], [3, 4],
		[4, 1], [4, 2], [4, 3], [4, 4]
	];

	test('solving a picture shows the reveal with title and skips stats', async ({ page }) => {
		await injectTauriMock(page);
		const nono = new NonogramPage(page);
		await nono.goto();

		await nono.pictureSelect.selectOption('pic1');
		await expect(nono.allCells).toHaveCount(25);

		for (const [r, c] of filled) await nono.cell(r, c).click();
		for (const [r, c] of marked) await nono.cell(r, c).click({ button: 'right' });

		await expect(nono.pictureReveal).toBeVisible({ timeout: 5000 });
		await expect(nono.pictureTitle).toHaveText('Kvadrat');
		await expect(nono.winOverlay).toHaveCount(0);
		// Picture games are excluded from stats/leaderboard.
		await expect(nono.statsBar).toContainText('Games: 0');
		await expect(nono.statsBar).toContainText('Won: 0');
	});
});

test.describe('Nonogram Loss Tracking', () => {
	test('abandoning a game in progress books a loss', async ({ page }) => {
		await injectTauriMock(page);
		const nono = new NonogramPage(page);
		await nono.goto();
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();
		await expect(nono.statsBar).toContainText('Games: 0');

		// Move makes the game "in progress"; starting a new one abandons it = loss.
		await nono.cell(0, 0).click();
		await nono.startNewGame();

		await expect(nono.statsBar).toContainText('Games: 1');
		await expect(nono.statsBar).toContainText('Won: 0');
	});
});

test.describe('Nonogram Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await injectTauriMock(page);
	});

	test('navigate home to nonogram', async ({ page }) => {
		await page.goto('/');
		await page.locator('a[href="/nonogram"]').first().click();
		await expect(page).toHaveURL('/nonogram');
	});

	test('sidebar shows nonogram link', async ({ page }) => {
		await page.goto('/');
		const sidebarLink = page.locator('nav.sidebar a[href="/nonogram"]');
		await expect(sidebarLink).toBeVisible();
	});
});

test.describe('Nonogram Header-Click Fill', () => {
	let nono: NonogramPage;

	test.beforeEach(async ({ page }) => {
		await injectTauriMock(page);
		nono = new NonogramPage(page);
		await nono.goto();
		await nono.sizeSelect.selectOption('5');
		await nono.startNewGame();
	});

	test('clicking a row header marks remaining empties without touching filled cells', async () => {
		// Fill one cell in row 0; the rest of the row is empty.
		await nono.cell(0, 0).click();
		await expect(nono.cell(0, 0)).toHaveClass(/filled/);

		await nono.rowClueHeader(0).click();

		// Filled cell preserved; the other four become marked.
		await expect(nono.cell(0, 0)).toHaveClass(/filled/);
		for (let c = 1; c < 5; c++) {
			await expect(nono.cell(0, c)).toHaveClass(/marked/);
		}
	});

	test('clicking a column header marks remaining empties in that column', async () => {
		await nono.cell(0, 2).click();
		await expect(nono.cell(0, 2)).toHaveClass(/filled/);

		await nono.colClueHeader(2).click();

		await expect(nono.cell(0, 2)).toHaveClass(/filled/);
		for (let r = 1; r < 5; r++) {
			await expect(nono.cell(r, 2)).toHaveClass(/marked/);
		}
	});

	test('a single undo reverts the whole bulk row-mark', async () => {
		await nono.cell(0, 0).click();
		await nono.rowClueHeader(0).click();
		for (let c = 1; c < 5; c++) {
			await expect(nono.cell(0, c)).toHaveClass(/marked/);
		}

		// One undo must restore the entire row, not just one cell.
		await nono.page.keyboard.press('Control+z');
		for (let c = 1; c < 5; c++) {
			await expect(nono.cell(0, c)).not.toHaveClass(/marked/);
		}
		// The pre-existing filled cell is untouched by the undo.
		await expect(nono.cell(0, 0)).toHaveClass(/filled/);
	});
});
