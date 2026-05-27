import { test, expect } from '@playwright/test';
import { CalcudokuPage } from './fixtures/calcudoku-page';
import { injectTauriMock } from './fixtures/tauri-mock';

test.describe('Calcudoku', () => {
	let calc: CalcudokuPage;

	test.beforeEach(async ({ page }) => {
		await injectTauriMock(page);
		calc = new CalcudokuPage(page);
		await calc.goto();
	});

	test('shows empty state before starting game', async () => {
		await expect(calc.emptyState).toBeVisible();
		await expect(calc.emptyState).toContainText('New Game');
	});

	test('new game generates 4x4 board', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();
		await expect(calc.allCells).toHaveCount(16);
	});

	test('timer starts and ticks', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();
		await expect(calc.timer).toHaveText('00:00');
		await expect(calc.timer).not.toHaveText('00:00', { timeout: 3000 });
	});

	test('clicking cell selects it, clicking again deselects', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		const cell = calc.cell(0, 0);
		await cell.click();
		await expect(cell).toHaveClass(/selected/);

		await cell.click();
		await expect(cell).not.toHaveClass(/selected/);
	});

	test('enter number via keyboard', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.page.keyboard.press('1');
		await expect(calc.cell(0, 0)).toContainText('1');
	});

	test('enter number via number pad', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.numBtn(2).click();
		await expect(calc.cell(0, 0)).toContainText('2');
	});

	test('clear cell via pad button', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.page.keyboard.press('1');
		await expect(calc.cell(0, 0)).toContainText('1');

		await calc.clearBtn().click();
		await expect(calc.cell(0, 0)).not.toContainText('1');
	});

	test('clear cell via backspace', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.page.keyboard.press('1');
		await calc.page.keyboard.press('Backspace');
		await expect(calc.cell(0, 0)).not.toContainText('1');
	});

	test('arrow keys move selection', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await expect(calc.cell(0, 0)).toHaveClass(/selected/);

		await calc.page.keyboard.press('ArrowRight');
		await expect(calc.cell(0, 1)).toHaveClass(/selected/);
		await expect(calc.cell(0, 0)).not.toHaveClass(/selected/);

		await calc.page.keyboard.press('ArrowDown');
		await expect(calc.cell(1, 1)).toHaveClass(/selected/);
	});

	test('escape deselects cell', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await expect(calc.cell(0, 0)).toHaveClass(/selected/);

		await calc.page.keyboard.press('Escape');
		await expect(calc.cell(0, 0)).not.toHaveClass(/selected/);
	});

	test('hint places a correct cell', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.btnHint.click();
		await expect(calc.cell(0, 0)).toContainText('1');
	});

	test('reset clears all player input', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.page.keyboard.press('1');
		await calc.cell(0, 1).click();
		await calc.page.keyboard.press('2');

		await calc.btnReset.click();
		await expect(calc.cell(0, 0)).not.toContainText('1');
		await expect(calc.cell(0, 1)).not.toContainText('2');
	});

	test('undo reverts last move', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.page.keyboard.press('1');
		await expect(calc.cell(0, 0)).toContainText('1');

		await calc.page.keyboard.press('Control+z');
		await expect(calc.cell(0, 0)).not.toContainText('1');
	});

	test('redo restores undone move', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.page.keyboard.press('1');
		await calc.page.keyboard.press('Control+z');
		await expect(calc.cell(0, 0)).not.toContainText('1');

		await calc.page.keyboard.press('Control+Shift+z');
		await expect(calc.cell(0, 0)).toContainText('1');
	});

	test('notes mode toggle via button', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await expect(calc.notesToggle).not.toHaveClass(/active/);
		await calc.notesToggle.click();
		await expect(calc.notesToggle).toHaveClass(/active/);
		await calc.notesToggle.click();
		await expect(calc.notesToggle).not.toHaveClass(/active/);
	});

	test('notes mode toggle via N key', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await expect(calc.notesToggle).not.toHaveClass(/active/);
		await calc.page.keyboard.press('n');
		await expect(calc.notesToggle).toHaveClass(/active/);
	});

	test('enter note in notes mode', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.notesToggle.click();
		await calc.page.keyboard.press('1');
		await calc.page.keyboard.press('3');

		const cell = calc.cell(0, 0);
		await expect(cell.locator('.notes-inline')).toHaveText('1 3');
	});

	test('shift+number enters note without notes mode', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await calc.cell(0, 0).click();
		await calc.page.keyboard.press('Shift+2');

		const cell = calc.cell(0, 0);
		await expect(cell.locator('.notes-inline')).toHaveText('2');
	});

	test('number pad buttons disabled when no cell selected', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		await expect(calc.numBtn(1)).toBeDisabled();
		await expect(calc.clearBtn()).toBeDisabled();
	});

	test('difficulty selector works', async () => {
		await expect(calc.difficultySelect).toHaveValue('medium');
		await calc.difficultySelect.selectOption('easy');
		await expect(calc.difficultySelect).toHaveValue('easy');
		await calc.difficultySelect.selectOption('hard');
		await expect(calc.difficultySelect).toHaveValue('hard');
	});

	test('size selector works', async () => {
		await expect(calc.sizeSelect).toHaveValue('6');
		await calc.sizeSelect.selectOption('4');
		await expect(calc.sizeSelect).toHaveValue('4');
		await calc.sizeSelect.selectOption('9');
		await expect(calc.sizeSelect).toHaveValue('9');
	});

	test('stats bar visible during game', async () => {
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();
		await expect(calc.statsBar).toBeVisible();
		await expect(calc.statsBar).toContainText('Games:');
	});

	test('hint and reset disabled before game, enabled after', async () => {
		await expect(calc.btnHint).toBeDisabled();
		await expect(calc.btnReset).toBeDisabled();
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();
		await expect(calc.btnHint).toBeEnabled();
		await expect(calc.btnReset).toBeEnabled();
	});
});

test.describe('Calcudoku Win Flow', () => {
	test('solve puzzle and see win overlay', async ({ page }) => {
		await injectTauriMock(page);
		const calc = new CalcudokuPage(page);
		await calc.goto();
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		// Solution: [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]]
		const solution = [
			[1, 2, 3, 4],
			[3, 4, 1, 2],
			[2, 1, 4, 3],
			[4, 3, 2, 1]
		];

		for (let r = 0; r < 4; r++) {
			for (let c = 0; c < 4; c++) {
				await calc.cell(r, c).click();
				await page.keyboard.press(String(solution[r][c]));
			}
		}

		await expect(calc.winOverlay).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Calcudoku Check', () => {
	test('check highlights wrong cells', async ({ page }) => {
		await injectTauriMock(page);
		const calc = new CalcudokuPage(page);
		await calc.goto();
		await calc.sizeSelect.selectOption('4');
		await calc.startNewGame();

		// Cell (0,0) should be 1, enter 4 instead
		await calc.cell(0, 0).click();
		await page.keyboard.press('4');

		await calc.btnCheck.click();
		await expect(calc.cell(0, 0)).toHaveClass(/error/, { timeout: 2000 });

		// Error clears after ~2.5s
		await expect(calc.cell(0, 0)).not.toHaveClass(/error/, { timeout: 4000 });
	});

	test('check button disabled before game', async ({ page }) => {
		await injectTauriMock(page);
		const calc = new CalcudokuPage(page);
		await calc.goto();
		await expect(calc.btnCheck).toBeDisabled();
	});
});

test.describe('Calcudoku Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await injectTauriMock(page);
	});

	test('navigate home to calcudoku', async ({ page }) => {
		await page.goto('/');
		await page.locator('a[href="/calcudoku"]').first().click();
		await expect(page).toHaveURL('/calcudoku');
	});

	test('sidebar shows calcudoku link', async ({ page }) => {
		await page.goto('/');
		const sidebarLink = page.locator('nav.sidebar a[href="/calcudoku"]');
		await expect(sidebarLink).toBeVisible();
	});
});
