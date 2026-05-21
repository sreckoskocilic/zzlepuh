import type { CellValue, ShipVisual } from '$lib/types/bimaru';

export function inferShipVisual(
	grid: CellValue[][],
	row: number,
	col: number,
	rows: number,
	cols: number
): ShipVisual {
	if (grid[row][col] !== 'ship') {
		return grid[row][col] === 'water' ? 'water' : 'none';
	}

	const up = row > 0 && grid[row - 1][col] === 'ship';
	const down = row < rows - 1 && grid[row + 1][col] === 'ship';
	const left = col > 0 && grid[row][col - 1] === 'ship';
	const right = col < cols - 1 && grid[row][col + 1] === 'ship';

	if (!up && !down && !left && !right) return 'single';
	if (up && down) return 'middle_v';
	if (left && right) return 'middle_h';
	if (!up && down && !left && !right) return 'top';
	if (up && !down && !left && !right) return 'bottom';
	if (!up && !down && !left && right) return 'left';
	if (!up && !down && left && !right) return 'right';

	// Ambiguous — default to middle
	if (up || down) return 'middle_v';
	return 'middle_h';
}

export function nextCellValue(current: CellValue): CellValue {
	switch (current) {
		case 'empty':
			return 'water';
		case 'water':
			return 'ship';
		case 'ship':
			return 'empty';
	}
}

export function countShipsInRow(grid: CellValue[][], row: number, cols: number): number {
	let count = 0;
	for (let c = 0; c < cols; c++) {
		if (grid[row][c] === 'ship') count++;
	}
	return count;
}

export function countShipsInCol(grid: CellValue[][], col: number, rows: number): number {
	let count = 0;
	for (let r = 0; r < rows; r++) {
		if (grid[r][col] === 'ship') count++;
	}
	return count;
}

export function countRemainingShips(
	grid: CellValue[][],
	fleet: { ships: { length: number; count: number }[] },
	rows: number,
	cols: number
): Map<number, number> {
	const placed = extractShipLengths(grid, rows, cols);
	const remaining = new Map<number, number>();

	for (const spec of fleet.ships) {
		remaining.set(spec.length, spec.count);
	}

	for (const len of placed) {
		const cur = remaining.get(len) ?? 0;
		if (cur > 0) remaining.set(len, cur - 1);
	}

	return remaining;
}

function extractShipLengths(grid: CellValue[][], rows: number, cols: number): number[] {
	const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
	const lengths: number[] = [];

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			if (grid[r][c] !== 'ship' || visited[r][c]) continue;
			visited[r][c] = true;
			let len = 1;

			let nc = c + 1;
			while (nc < cols && grid[r][nc] === 'ship' && !visited[r][nc]) {
				visited[r][nc] = true;
				len++;
				nc++;
			}

			if (len === 1) {
				let nr = r + 1;
				while (nr < rows && grid[nr][c] === 'ship' && !visited[nr][c]) {
					visited[nr][c] = true;
					len++;
					nr++;
				}
			}

			lengths.push(len);
		}
	}

	return lengths;
}
