import type { Page } from '@playwright/test';

interface MockOptions {
	validateReturns?: boolean | ((args: any) => boolean);
}

export function makeMockPuzzle() {
	const size = 10;
	const hints: string[][] = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => 'empty')
	);
	// 4-ship: row 0, cols 0-3
	hints[0][0] = 'ship';
	hints[0][1] = 'ship';
	hints[0][2] = 'ship';
	hints[0][3] = 'ship';
	// 3-ship: row 1, cols 5-7
	hints[1][5] = 'ship';
	hints[1][6] = 'ship';
	hints[1][7] = 'ship';
	// 3-ship: row 2, cols 1-3
	hints[2][1] = 'ship';
	hints[2][2] = 'ship';
	hints[2][3] = 'ship';
	// 2-ship: row 4, cols 0-1
	hints[4][0] = 'ship';
	hints[4][1] = 'ship';
	// 2-ship: row 5, cols 5-6
	hints[5][5] = 'ship';
	hints[5][6] = 'ship';
	// 2-ship: row 7, cols 3-4
	hints[7][3] = 'ship';
	hints[7][4] = 'ship';
	// 1-ships
	hints[9][9] = 'ship';
	hints[6][9] = 'ship';
	hints[8][7] = 'ship';
	hints[3][8] = 'ship';

	return {
		rows: size,
		cols: size,
		row_clues: [4, 3, 3, 1, 2, 2, 1, 2, 1, 1],
		col_clues: [2, 3, 2, 3, 1, 2, 2, 2, 1, 2],
		fleet: {
			ships: [
				{ length: 4, count: 1 },
				{ length: 3, count: 2 },
				{ length: 2, count: 3 },
				{ length: 1, count: 4 }
			]
		},
		hints
	};
}

function makeEasyMockPuzzle() {
	const size = 6;
	const hints: string[][] = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => 'water')
	);
	// Almost solved: only 4 cells need filling
	// 3-ship: row 0, cols 0-2 (all hinted)
	hints[0][0] = 'ship';
	hints[0][1] = 'ship';
	hints[0][2] = 'ship';
	// 2-ship: row 2, cols 4-5 (all hinted)
	hints[2][4] = 'ship';
	hints[2][5] = 'ship';
	// 1-ship: row 4, col 1 (empty — player fills)
	hints[4][1] = 'empty';
	// 1-ship: row 5, col 4 (empty — player fills)
	hints[5][4] = 'empty';

	return {
		rows: size,
		cols: size,
		row_clues: [3, 0, 2, 0, 1, 1],
		col_clues: [1, 1, 1, 0, 2, 2],
		fleet: {
			ships: [
				{ length: 3, count: 1 },
				{ length: 2, count: 1 },
				{ length: 1, count: 2 }
			]
		},
		hints
	};
}

function getEasySolutionGrid(): string[][] {
	const puzzle = makeEasyMockPuzzle();
	return puzzle.hints.map((row) =>
		row.map((cell) => {
			if (cell === 'ship') return 'ship';
			return 'water';
		})
	);
}

function getEasySolutionWithPlayer(): string[][] {
	const grid = getEasySolutionGrid();
	grid[4][1] = 'ship';
	grid[5][4] = 'ship';
	return grid;
}

function getSolutionGrid(): string[][] {
	const puzzle = makeMockPuzzle();
	return puzzle.hints.map((row) =>
		row.map((cell) => (cell === 'ship' ? 'ship' : 'water'))
	);
}

export async function injectTauriMock(page: Page, opts: MockOptions & { easy?: boolean } = {}) {
	const puzzle = opts.easy ? makeEasyMockPuzzle() : makeMockPuzzle();
	const solution = opts.easy ? getEasySolutionWithPlayer() : getSolutionGrid();
	const puzzleJson = JSON.stringify(puzzle);
	const solutionJson = JSON.stringify(solution);
	const validateMode = typeof opts.validateReturns === 'boolean'
		? JSON.stringify(opts.validateReturns)
		: 'null';

	await page.addInitScript(
		({ pJson, solJson, valMode }: { pJson: string; solJson: string; valMode: string }) => {
			const puzzle = JSON.parse(pJson);
			const solution = JSON.parse(solJson);

			(window as any).__TAURI_INTERNALS__ = {
				invoke: async (cmd: string, args?: any) => {
					if (cmd === 'generate_bimaru_puzzle') return puzzle;

					if (cmd === 'validate_bimaru_solution') {
						if (valMode !== 'null') return JSON.parse(valMode);
						const grid = args?.playerGrid;
						if (!grid || !solution) return false;
						for (let r = 0; r < grid.length; r++) {
							for (let c = 0; c < grid[r].length; c++) {
								if (grid[r][c] === 'empty') return false;
							}
						}
						for (let r = 0; r < grid.length; r++) {
							for (let c = 0; c < grid[r].length; c++) {
								if (grid[r][c] !== solution[r][c]) return false;
							}
						}
						return true;
					}

					if (cmd === 'check_bimaru_errors') {
						const grid = args?.playerGrid;
						if (!grid || !solution) return [];
						const errors: [number, number][] = [];
						for (let r = 0; r < grid.length; r++) {
							for (let c = 0; c < grid[r].length; c++) {
								if (grid[r][c] === 'empty') continue;
								if (grid[r][c] !== solution[r][c]) {
									errors.push([r, c]);
								}
							}
						}
						return errors;
					}

					if (cmd === 'get_bimaru_hint') {
						const grid = args?.playerGrid;
						if (!grid) return null;
						for (let r = 0; r < grid.length; r++) {
							for (let c = 0; c < grid[r].length; c++) {
								if (grid[r][c] === 'empty') {
									return {
										row: r,
										col: c,
										value: solution[r][c],
										reason: 'test hint'
									};
								}
							}
						}
						return null;
					}

					if (cmd === 'generate_nonogram_puzzle') {
						const rows = args?.rows ?? 5;
						const cols = args?.cols ?? 5;
						const rowClues = [[2], [1], [3], [1, 1], [1]];
						const colClues = [[2], [1, 1], [1, 1], [2], [1]];
						return {
							rows,
							cols,
							row_clues: rowClues,
							col_clues: colClues,
							difficulty: args?.difficulty ?? 'easy'
						};
					}

					if (cmd === 'validate_nonogram_solution') {
						const grid = args?.playerGrid;
						if (!grid) return false;
						const nSol = [
							[true, true, false, false, false],
							[false, false, false, true, false],
							[true, true, true, false, false],
							[false, true, false, true, false],
							[true, false, false, false, false]
						];
						for (let r = 0; r < grid.length; r++) {
							for (let c = 0; c < grid[r].length; c++) {
								if (grid[r][c] === 'empty') return false;
								const isFilled = grid[r][c] === 'filled';
								if (isFilled !== nSol[r][c]) return false;
							}
						}
						return true;
					}

					if (cmd === 'check_nonogram_errors') {
						const grid = args?.playerGrid;
						if (!grid) return [];
						const nSol = [
							[true, true, false, false, false],
							[false, false, false, true, false],
							[true, true, true, false, false],
							[false, true, false, true, false],
							[true, false, false, false, false]
						];
						const errors: [number, number][] = [];
						for (let r = 0; r < grid.length; r++) {
							for (let c = 0; c < grid[r].length; c++) {
								if (grid[r][c] === 'empty') continue;
								const isFilled = grid[r][c] === 'filled';
								if (isFilled !== nSol[r][c]) errors.push([r, c]);
							}
						}
						return errors;
					}

					if (cmd === 'get_nonogram_hint') {
						const grid = args?.playerGrid;
						if (!grid) return null;
						const nSol = [
							[true, true, false, false, false],
							[false, false, false, true, false],
							[true, true, true, false, false],
							[false, true, false, true, false],
							[true, false, false, false, false]
						];
						for (let r = 0; r < grid.length; r++) {
							for (let c = 0; c < grid[r].length; c++) {
								if (grid[r][c] === 'empty') {
									return {
										row: r,
										col: c,
										filled: nSol[r][c],
										reason: 'test hint'
									};
								}
							}
						}
						return null;
					}

					if (cmd === 'generate_calcudoku_puzzle') {
						const s = args?.size ?? 4;
						return {
							size: s,
							cages: [
								{ cells: [[0,0],[0,1]], operation: 'add', target: 3 },
								{ cells: [[0,2],[0,3]], operation: 'subtract', target: 1 },
								{ cells: [[1,0],[1,1]], operation: 'multiply', target: 12 },
								{ cells: [[1,2],[2,2]], operation: 'add', target: 5 },
								{ cells: [[1,3],[2,3]], operation: 'subtract', target: 1 },
								{ cells: [[2,0],[3,0]], operation: 'divide', target: 2 },
								{ cells: [[2,1],[3,1]], operation: 'subtract', target: 2 },
								{ cells: [[3,2]], operation: 'none', target: 2 },
								{ cells: [[3,3]], operation: 'none', target: 1 }
							],
							difficulty: args?.difficulty ?? 'easy'
						};
					}

					if (cmd === 'validate_calcudoku_solution') {
						const grid = args?.playerGrid;
						if (!grid) return false;
						const cSol = [
							[1,2,3,4],
							[3,4,1,2],
							[2,1,4,3],
							[4,3,2,1]
						];
						for (let r = 0; r < cSol.length; r++) {
							for (let c = 0; c < cSol[r].length; c++) {
								if (grid[r][c] !== cSol[r][c]) return false;
							}
						}
						return true;
					}

					if (cmd === 'check_calcudoku_errors') {
						const grid = args?.playerGrid;
						if (!grid) return [];
						const cSol = [
							[1,2,3,4],
							[3,4,1,2],
							[2,1,4,3],
							[4,3,2,1]
						];
						const errors: [number, number][] = [];
						for (let r = 0; r < cSol.length; r++) {
							for (let c = 0; c < cSol[r].length; c++) {
								if (grid[r][c] === 0) continue;
								if (grid[r][c] !== cSol[r][c]) errors.push([r, c]);
							}
						}
						return errors;
					}

					if (cmd === 'get_calcudoku_hint') {
						const grid = args?.playerGrid;
						if (!grid) return null;
						const cSol = [
							[1,2,3,4],
							[3,4,1,2],
							[2,1,4,3],
							[4,3,2,1]
						];
						for (let r = 0; r < cSol.length; r++) {
							for (let c = 0; c < cSol[r].length; c++) {
								if (grid[r][c] === 0) {
									return { row: r, col: c, value: cSol[r][c], reason: 'test hint' };
								}
							}
						}
						return null;
					}

					if (cmd === 'list_nonogram_pictures') return [{ id: 'pic1', rows: 5, cols: 5 }];

					if (cmd === 'generate_nonogram_picture') {
						// Solution mirrors the standard nonogram nSol so the shared
						// validate handler accepts it; difficulty 'picture' drives reveal.
						return {
							rows: 5,
							cols: 5,
							row_clues: [[2], [1], [3], [1, 1], [1]],
							col_clues: [[2], [1, 1], [1, 1], [2], [1]],
							difficulty: 'picture',
							title: 'Kvadrat'
						};
					}

					if (cmd === 'start_kontab_game') {
						const n = args?.numPlayers ?? 3;
						const hands = [];
						for (let p = 0; p < n; p++) hands.push([{ rank: p + 3, suit: 'spades' }]);
						return {
							num_players: n,
							deck: [],
							table: [
								{ rank: 9, suit: 'hearts' },
								{ rank: 7, suit: 'clubs' }
							],
							hands,
							piles: Array.from({ length: n }, () => []),
							scores: Array.from({ length: n }, () => 0),
							deal_scores: Array.from({ length: n }, () => 0),
							tablas: Array.from({ length: n }, () => 0),
							current: 0,
							dealer: n - 1,
							last_capturer: null,
							deal_number: 1,
							target: args?.target ?? 101,
							phase: { kind: 'playing' }
						};
					}

					if (cmd === 'kontab_legal_moves') {
						const st = args?.state;
						if (!st) return [];
						return st.hands[st.current].map((card: any) => ({
							card,
							captures: [],
							played_value: card.rank,
							is_tabla: false
						}));
					}

					if (cmd === 'kontab_apply_move') {
						const st = JSON.parse(JSON.stringify(args?.state));
						const card = args?.card;
						const p = st.current;
						const idx = st.hands[p].findIndex(
							(c: any) => c.rank === card.rank && c.suit === card.suit
						);
						if (idx >= 0) st.hands[p].splice(idx, 1);
						st.table.push(card);
						st.current = (p + 1) % st.num_players;
						const event: any = {
							player: p,
							card,
							captured: [],
							is_tabla: false,
							deal_complete: false,
							deal_breakdown: null
						};
						const allEmpty = st.hands.every((h: any) => h.length === 0);
						if (allEmpty) {
							const breakdown = st.scores.map((_: number, i: number) => ({
								most_cards: i === 0 ? 3 : 0,
								honors: 0,
								two_of_clubs: 0,
								tablas: 0,
								total: i === 0 ? 3 : 0
							}));
							for (let i = 0; i < st.num_players; i++) {
								st.deal_scores[i] = breakdown[i].total;
								st.scores[i] += breakdown[i].total;
							}
							st.phase = { kind: 'deal_complete' };
							event.deal_complete = true;
							event.deal_breakdown = breakdown;
						}
						return { state: st, events: [event] };
					}

					if (cmd === 'kontab_ai_move') {
						const st = args?.state;
						const card = st.hands[st.current][0];
						return { card, captures: [], played_value: card.rank, is_tabla: false };
					}

					if (cmd === 'kontab_next_deal') {
						const st = JSON.parse(JSON.stringify(args?.state));
						st.deal_number += 1;
						st.scores[st.num_players - 1] = st.target ?? 101;
						st.phase = { kind: 'game_over', loser: st.num_players - 1 };
						return st;
					}

					if (cmd === 'plugin:store|load') return 1;
					if (cmd === 'plugin:store|get') return [null, false];
					if (cmd === 'plugin:store|set') return null;
					if (cmd === 'plugin:store|save') return null;
					if (cmd === 'plugin:resources|close') return null;

					return null;
				}
			};
		},
		{ pJson: puzzleJson, solJson: solutionJson, valMode: validateMode }
	);
}
