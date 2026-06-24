import { expect, test } from '@playwright/test';
import { injectTauriMock } from './fixtures/tauri-mock';
import { KontabPage } from './fixtures/kontab-page';

let kontab: KontabPage;

test.beforeEach(async ({ page }) => {
	await injectTauriMock(page);
	kontab = new KontabPage(page);
	await kontab.goto();
});

test('renders a fresh game against AI opponents', async () => {
	await expect(kontab.root).toBeVisible();
	await expect(kontab.seats).toHaveCount(1);
	await expect(kontab.handCards).toHaveCount(1);
	await expect(kontab.table).toBeVisible();
});

test('lets the player change opponent count', async () => {
	await kontab.opponentCount.selectOption('3');
	await kontab.newGame.click();
	await expect(kontab.seats).toHaveCount(3);
});

test('playing a card drives AI turns to a deal summary, then game over', async () => {
	await kontab.playFirstCard();
	await expect(kontab.dealSummary).toBeVisible();
	await kontab.continueBtn.click();
	await expect(kontab.gameOver).toBeVisible();
	await expect(kontab.result).toContainText('izgubio');
});
