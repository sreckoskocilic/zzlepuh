use std::time::Duration;

use rand::seq::SliceRandom;
use rand::Rng;

use super::solver;
use super::solver::UNIQUENESS_LIMIT;
use super::types::*;

/// How many random ship layouts to try before giving up on a puzzle.
const MAX_GENERATION_ATTEMPTS: usize = 500;
/// Per-uniqueness-check solver budget; keeps generation responsive.
const SOLVE_TIMEOUT: Duration = Duration::from_millis(200);

pub fn generate(
    rows: usize,
    cols: usize,
    difficulty: &str,
    fleet: &Fleet,
) -> Option<BimaruSolution> {
    let mut rng = rand::rng();
    let timeout = SOLVE_TIMEOUT;

    for _ in 0..MAX_GENERATION_ATTEMPTS {
        let Some(solution_grid) = place_all_ships(rows, cols, fleet, &mut rng) else {
            continue;
        };

        let row_clues = compute_row_clues(&solution_grid, rows, cols);
        let col_clues = compute_col_clues(&solution_grid, rows, cols);

        let initial_hints = select_hints(&solution_grid, rows, cols, &mut rng);

        let count = solver::count_solutions_timed(
            &row_clues,
            &col_clues,
            &initial_hints,
            fleet,
            rows,
            cols,
            UNIQUENESS_LIMIT,
            Some(timeout),
        );

        if count != 1 {
            continue;
        }

        let target_hint_count = hint_count_for(difficulty, rows, cols, &mut rng);

        let hints =
            strip_hints(&initial_hints, &row_clues, &col_clues, fleet, rows, cols, target_hint_count, &mut rng, timeout);

        let puzzle = BimaruPuzzle {
            rows,
            cols,
            row_clues,
            col_clues,
            hints,
            fleet: fleet.clone(),
            difficulty: difficulty.to_string(),
        };

        return Some(BimaruSolution {
            puzzle,
            solution: solution_grid,
        });
    }
    None
}

fn hint_count_for(difficulty: &str, rows: usize, cols: usize, rng: &mut impl Rng) -> usize {
    let size = rows.min(cols);
    match difficulty {
        "easy" => match size {
            0..=6 => rng.random_range(5..=7),
            7..=8 => rng.random_range(6..=9),
            9..=10 => rng.random_range(8..=12),
            _ => rng.random_range(10..=15),
        },
        "hard" => match size {
            0..=6 => rng.random_range(1..=2),
            7..=8 => rng.random_range(1..=3),
            9..=10 => rng.random_range(2..=4),
            _ => rng.random_range(2..=5),
        },
        _ => match size {
            0..=6 => rng.random_range(3..=4),
            7..=8 => rng.random_range(3..=5),
            9..=10 => rng.random_range(4..=6),
            _ => rng.random_range(5..=8),
        },
    }
}

fn strip_hints(
    hints: &[Vec<HintCell>],
    row_clues: &[usize],
    col_clues: &[usize],
    fleet: &Fleet,
    rows: usize,
    cols: usize,
    target: usize,
    rng: &mut impl Rng,
    timeout: Duration,
) -> Vec<Vec<HintCell>> {
    let mut current = hints.to_vec();

    let mut hint_cells: Vec<(usize, usize)> = Vec::new();
    for r in 0..rows {
        for c in 0..cols {
            if current[r][c] != HintCell::Empty {
                hint_cells.push((r, c));
            }
        }
    }
    hint_cells.shuffle(rng);

    let mut current_count = hint_cells.len();

    for &(r, c) in &hint_cells {
        if current_count <= target {
            break;
        }

        let saved = current[r][c];
        current[r][c] = HintCell::Empty;

        let count = solver::count_solutions_timed(
            row_clues, col_clues, &current, fleet, rows, cols, UNIQUENESS_LIMIT, Some(timeout),
        );

        if count == 1 {
            current_count -= 1;
        } else {
            current[r][c] = saved;
        }
    }

    current
}

fn place_all_ships(
    rows: usize,
    cols: usize,
    fleet: &Fleet,
    rng: &mut impl Rng,
) -> Option<Vec<Vec<CellValue>>> {
    let mut grid = vec![vec![CellValue::Empty; cols]; rows];
    let mut ships_to_place: Vec<usize> = Vec::new();

    for spec in &fleet.ships {
        for _ in 0..spec.count {
            ships_to_place.push(spec.length);
        }
    }
    ships_to_place.sort_unstable_by(|a, b| b.cmp(a));

    if place_ships_recursive(&mut grid, &ships_to_place, 0, rows, cols, rng) {
        for r in 0..rows {
            for c in 0..cols {
                if grid[r][c] == CellValue::Empty {
                    grid[r][c] = CellValue::Water;
                }
            }
        }
        Some(grid)
    } else {
        None
    }
}

fn place_ships_recursive(
    grid: &mut Vec<Vec<CellValue>>,
    ships: &[usize],
    idx: usize,
    rows: usize,
    cols: usize,
    rng: &mut impl Rng,
) -> bool {
    if idx >= ships.len() {
        return true;
    }

    let length = ships[idx];
    let mut positions = valid_positions(grid, length, rows, cols);
    positions.shuffle(rng);

    for pos in positions {
        place_ship(grid, &pos);
        if place_ships_recursive(grid, ships, idx + 1, rows, cols, rng) {
            return true;
        }
        remove_ship(grid, &pos);
    }

    false
}

fn valid_positions(
    grid: &[Vec<CellValue>],
    length: usize,
    rows: usize,
    cols: usize,
) -> Vec<PlacedShip> {
    let mut positions = Vec::new();

    for r in 0..rows {
        for c in 0..cols {
            if c + length <= cols {
                let ship = PlacedShip {
                    row: r,
                    col: c,
                    length,
                    horizontal: true,
                };
                if can_place(grid, &ship, rows, cols) {
                    positions.push(ship);
                }
            }
            if length > 1 && r + length <= rows {
                let ship = PlacedShip {
                    row: r,
                    col: c,
                    length,
                    horizontal: false,
                };
                if can_place(grid, &ship, rows, cols) {
                    positions.push(ship);
                }
            }
        }
    }
    positions
}

fn can_place(grid: &[Vec<CellValue>], ship: &PlacedShip, rows: usize, cols: usize) -> bool {
    for (r, c) in ship.cells() {
        if grid[r][c] != CellValue::Empty {
            return false;
        }
        for dr in -1i32..=1 {
            for dc in -1i32..=1 {
                if dr == 0 && dc == 0 {
                    continue;
                }
                let nr = r as i32 + dr;
                let nc = c as i32 + dc;
                if nr >= 0 && nr < rows as i32 && nc >= 0 && nc < cols as i32 {
                    if grid[nr as usize][nc as usize] == CellValue::Ship {
                        return false;
                    }
                }
            }
        }
    }
    true
}

fn place_ship(grid: &mut [Vec<CellValue>], ship: &PlacedShip) {
    for (r, c) in ship.cells() {
        grid[r][c] = CellValue::Ship;
    }
}

fn remove_ship(grid: &mut [Vec<CellValue>], ship: &PlacedShip) {
    for (r, c) in ship.cells() {
        grid[r][c] = CellValue::Empty;
    }
}

fn compute_row_clues(grid: &[Vec<CellValue>], rows: usize, cols: usize) -> Vec<usize> {
    (0..rows)
        .map(|r| (0..cols).filter(|&c| grid[r][c] == CellValue::Ship).count())
        .collect()
}

fn compute_col_clues(grid: &[Vec<CellValue>], rows: usize, cols: usize) -> Vec<usize> {
    (0..cols)
        .map(|c| (0..rows).filter(|&r| grid[r][c] == CellValue::Ship).count())
        .collect()
}

fn select_hints(
    grid: &[Vec<CellValue>],
    rows: usize,
    cols: usize,
    rng: &mut impl Rng,
) -> Vec<Vec<HintCell>> {
    let size = rows.min(cols);
    let hint_count = match size {
        0..=6 => rng.random_range(6..=8),
        7..=8 => rng.random_range(8..=11),
        9..=10 => rng.random_range(10..=14),
        _ => rng.random_range(14..=20),
    };

    let mut hints = vec![vec![HintCell::Empty; cols]; rows];
    let mut candidates: Vec<(usize, usize)> = Vec::new();

    for r in 0..rows {
        for c in 0..cols {
            candidates.push((r, c));
        }
    }
    candidates.shuffle(rng);

    // First pass: place a balanced mix, capping ship hints at ~half so the puzzle
    // isn't dominated by either kind. `water_target` is the matching water budget.
    let mut placed = 0;
    let mut ship_hints = 0;
    let target_ship = (hint_count + 1) / 2;
    let water_target = hint_count - target_ship;

    for &(r, c) in &candidates {
        if placed >= hint_count {
            break;
        }
        let water_hints = placed - ship_hints;
        match grid[r][c] {
            CellValue::Ship if ship_hints < target_ship => {
                hints[r][c] = HintCell::Ship;
                ship_hints += 1;
                placed += 1;
            }
            CellValue::Water if water_hints < water_target => {
                hints[r][c] = HintCell::Water;
                placed += 1;
            }
            _ => {}
        }
    }

    for &(r, c) in &candidates {
        if placed >= hint_count {
            break;
        }
        if hints[r][c] != HintCell::Empty {
            continue;
        }
        match grid[r][c] {
            CellValue::Ship => {
                hints[r][c] = HintCell::Ship;
                placed += 1;
            }
            CellValue::Water => {
                hints[r][c] = HintCell::Water;
                placed += 1;
            }
            _ => {}
        }
    }

    hints
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Full structural validity of a generated puzzle: clues match the solution,
    /// no diagonal ship adjacency, fleet total is correct, and the published
    /// clues + hints admit exactly one solution.
    fn assert_valid_bimaru(sol: &BimaruSolution, fleet: &Fleet) {
        let p = &sol.puzzle;
        let grid = &sol.solution;
        let (rows, cols) = (p.rows, p.cols);
        for r in 0..rows {
            let cnt = (0..cols).filter(|&c| grid[r][c] == CellValue::Ship).count();
            assert_eq!(cnt, p.row_clues[r], "row clue {} on {}x{}", r, rows, cols);
        }
        for c in 0..cols {
            let cnt = (0..rows).filter(|&r| grid[r][c] == CellValue::Ship).count();
            assert_eq!(cnt, p.col_clues[c], "col clue {} on {}x{}", c, rows, cols);
        }
        for r in 0..rows {
            for c in 0..cols {
                if grid[r][c] != CellValue::Ship {
                    continue;
                }
                for (dr, dc) in [(-1i32, -1i32), (-1, 1), (1, -1), (1, 1)] {
                    let (nr, nc) = (r as i32 + dr, c as i32 + dc);
                    if nr >= 0 && nr < rows as i32 && nc >= 0 && nc < cols as i32 {
                        assert_ne!(
                            grid[nr as usize][nc as usize],
                            CellValue::Ship,
                            "diagonal adjacency at ({},{}) on {}x{}",
                            r, c, rows, cols
                        );
                    }
                }
            }
        }
        let total = grid.iter().flatten().filter(|&&v| v == CellValue::Ship).count();
        assert_eq!(total, fleet.total_cells(), "ship total on {}x{}", rows, cols);
        let count = solver::count_solutions(
            &p.row_clues, &p.col_clues, &p.hints, fleet, rows, cols, 2,
        );
        assert_eq!(count, 1, "puzzle not unique on {}x{}", rows, cols);
    }

    #[test]
    fn test_generate_valid_across_sizes() {
        for (rows, cols, diff) in [
            (6, 6, "easy"),
            (8, 8, "medium"),
            (10, 10, "medium"),
            (10, 10, "hard"),
            (12, 12, "medium"),
        ] {
            let fleet = Fleet::for_size(rows, cols);
            let sol = generate(rows, cols, diff, &fleet)
                .unwrap_or_else(|| panic!("generate {}x{} {}", rows, cols, diff));
            assert_valid_bimaru(&sol, &fleet);
        }
    }

    #[test]
    fn test_generate_10x10_standard() {
        let fleet = Fleet::standard();
        let result = generate(10, 10, "medium", &fleet);
        assert!(result.is_some(), "Should generate a valid 10x10 puzzle");

        let sol = result.unwrap();
        assert_eq!(sol.puzzle.rows, 10);
        assert_eq!(sol.puzzle.cols, 10);
        assert_eq!(sol.puzzle.row_clues.len(), 10);
        assert_eq!(sol.puzzle.col_clues.len(), 10);

        let total_ships: usize = sol
            .solution
            .iter()
            .flat_map(|row| row.iter())
            .filter(|&&c| c == CellValue::Ship)
            .count();
        assert_eq!(total_ships, fleet.total_cells());
    }

    #[test]
    fn test_generate_6x6_small() {
        let fleet = Fleet::for_size(6, 6);
        let result = generate(6, 6, "easy", &fleet);
        assert!(result.is_some(), "Should generate a valid 6x6 puzzle");
    }

    #[test]
    fn test_generate_hard() {
        let fleet = Fleet::standard();
        let result = generate(10, 10, "hard", &fleet);
        assert!(result.is_some(), "Should generate a valid hard puzzle");

        let sol = result.unwrap();
        let hint_count: usize = sol
            .puzzle
            .hints
            .iter()
            .flat_map(|row| row.iter())
            .filter(|&&h| h != HintCell::Empty)
            .count();
        assert!(hint_count <= 8, "Hard puzzle should have few hints, got {}", hint_count);
    }

    #[test]
    fn test_no_adjacent_ships() {
        let fleet = Fleet::standard();
        let result = generate(10, 10, "medium", &fleet).unwrap();
        let grid = &result.solution;

        for r in 0..10usize {
            for c in 0..10usize {
                if grid[r][c] != CellValue::Ship {
                    continue;
                }
                for dr in [-1i32, 0, 1] {
                    for dc in [-1i32, 0, 1] {
                        if dr == 0 && dc == 0 {
                            continue;
                        }
                        if dr != 0 && dc != 0 {
                            let nr = r as i32 + dr;
                            let nc = c as i32 + dc;
                            if nr >= 0 && nr < 10 && nc >= 0 && nc < 10 {
                                assert_ne!(
                                    grid[nr as usize][nc as usize],
                                    CellValue::Ship,
                                    "Diagonal adjacency violation at ({}, {}) -> ({}, {})",
                                    r, c, nr, nc
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn test_generate_8x8() {
        let fleet = Fleet::for_size(8, 8);
        let result = generate(8, 8, "medium", &fleet);
        assert!(result.is_some(), "Should generate a valid 8x8 puzzle");

        let sol = result.unwrap();
        assert_eq!(sol.puzzle.rows, 8);
        assert_eq!(sol.puzzle.cols, 8);
        let total_ships: usize = sol.solution.iter().flat_map(|r| r.iter()).filter(|&&c| c == CellValue::Ship).count();
        assert_eq!(total_ships, fleet.total_cells());
    }

    #[test]
    fn test_generate_12x12() {
        let fleet = Fleet::for_size(12, 12);
        let result = generate(12, 12, "medium", &fleet);
        assert!(result.is_some(), "Should generate a valid 12x12 puzzle");

        let sol = result.unwrap();
        assert_eq!(sol.puzzle.rows, 12);
        assert_eq!(sol.puzzle.cols, 12);
        let total_ships: usize = sol.solution.iter().flat_map(|r| r.iter()).filter(|&&c| c == CellValue::Ship).count();
        assert_eq!(total_ships, fleet.total_cells());
    }

    #[test]
    fn test_clues_match_solution() {
        let fleet = Fleet::standard();
        let result = generate(10, 10, "medium", &fleet).unwrap();
        let grid = &result.solution;
        let puzzle = &result.puzzle;

        for r in 0..10 {
            let count = (0..10).filter(|&c| grid[r][c] == CellValue::Ship).count();
            assert_eq!(count, puzzle.row_clues[r], "Row clue mismatch at row {}", r);
        }
        for c in 0..10 {
            let count = (0..10).filter(|&r| grid[r][c] == CellValue::Ship).count();
            assert_eq!(count, puzzle.col_clues[c], "Col clue mismatch at col {}", c);
        }
    }
}
