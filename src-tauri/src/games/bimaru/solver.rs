use std::time::{Duration, Instant};

use super::types::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Cell {
    Unknown,
    Water,
    Ship,
}

/// Backtracking stops once this many solutions are found — we only ever need to
/// distinguish "unique" (1) from "ambiguous" (≥2).
pub const UNIQUENESS_LIMIT: usize = 2;

/// The four diagonal neighbours of a cell. Ships may never touch diagonally, so
/// a ship forces water on all four.
const DIAGONALS: [(i32, i32); 4] = [(-1, -1), (-1, 1), (1, -1), (1, 1)];

fn fill_row(grid: &mut [Vec<Cell>], r: usize, cols: usize, val: Cell) -> bool {
    let mut changed = false;
    for c in 0..cols {
        if grid[r][c] == Cell::Unknown {
            grid[r][c] = val;
            changed = true;
        }
    }
    changed
}

fn fill_col(grid: &mut [Vec<Cell>], c: usize, rows: usize, val: Cell) -> bool {
    let mut changed = false;
    for r in 0..rows {
        if grid[r][c] == Cell::Unknown {
            grid[r][c] = val;
            changed = true;
        }
    }
    changed
}

#[allow(dead_code)]
pub fn count_solutions(
    row_clues: &[usize],
    col_clues: &[usize],
    hints: &[Vec<HintCell>],
    fleet: &Fleet,
    rows: usize,
    cols: usize,
    max_count: usize,
) -> usize {
    count_solutions_timed(row_clues, col_clues, hints, fleet, rows, cols, max_count, None)
}

pub fn count_solutions_timed(
    row_clues: &[usize],
    col_clues: &[usize],
    hints: &[Vec<HintCell>],
    fleet: &Fleet,
    rows: usize,
    cols: usize,
    max_count: usize,
    timeout: Option<Duration>,
) -> usize {
    let mut grid = init_grid(hints, rows, cols);
    propagate(&mut grid, row_clues, col_clues, rows, cols);

    let ship_lengths = expand_fleet(fleet);
    let mut count = 0;
    let deadline = timeout.map(|t| Instant::now() + t);
    solve_recursive(
        &mut grid,
        row_clues,
        col_clues,
        &ship_lengths,
        rows,
        cols,
        &mut count,
        max_count,
        deadline,
    );
    count
}

pub fn solve(
    row_clues: &[usize],
    col_clues: &[usize],
    hints: &[Vec<HintCell>],
    fleet: &Fleet,
    rows: usize,
    cols: usize,
) -> Option<Vec<Vec<CellValue>>> {
    let mut grid = init_grid(hints, rows, cols);
    propagate(&mut grid, row_clues, col_clues, rows, cols);

    let ship_lengths = expand_fleet(fleet);
    let mut solutions: Vec<Vec<Vec<Cell>>> = Vec::new();
    let deadline = Some(Instant::now() + Duration::from_secs(5));
    solve_single(
        &mut grid,
        row_clues,
        col_clues,
        &ship_lengths,
        rows,
        cols,
        &mut solutions,
        deadline,
    );

    solutions.into_iter().next().map(|g| {
        g.into_iter()
            .map(|row| {
                row.into_iter()
                    .map(|c| match c {
                        Cell::Ship => CellValue::Ship,
                        _ => CellValue::Water,
                    })
                    .collect()
            })
            .collect()
    })
}

pub fn find_deduction(
    row_clues: &[usize],
    col_clues: &[usize],
    player_grid: &[Vec<CellValue>],
    hints: &[Vec<HintCell>],
    rows: usize,
    cols: usize,
) -> Option<(usize, usize, CellValue, String)> {
    let mut grid = vec![vec![Cell::Unknown; cols]; rows];

    for r in 0..rows {
        for c in 0..cols {
            match player_grid[r][c] {
                CellValue::Water => grid[r][c] = Cell::Water,
                CellValue::Ship => grid[r][c] = Cell::Ship,
                CellValue::Empty => match hints[r][c] {
                    HintCell::Water => grid[r][c] = Cell::Water,
                    HintCell::Ship => grid[r][c] = Cell::Ship,
                    HintCell::Empty => {}
                },
            }
        }
    }

    let before = grid.clone();
    propagate(&mut grid, row_clues, col_clues, rows, cols);

    for r in 0..rows {
        for c in 0..cols {
            if before[r][c] == Cell::Unknown && grid[r][c] != Cell::Unknown {
                let value = match grid[r][c] {
                    Cell::Water => CellValue::Water,
                    Cell::Ship => CellValue::Ship,
                    Cell::Unknown => unreachable!(),
                };
                let reason = deduce_reason(row_clues, col_clues, r, c);
                return Some((r, c, value, reason));
            }
        }
    }

    None
}

fn init_grid(hints: &[Vec<HintCell>], rows: usize, cols: usize) -> Vec<Vec<Cell>> {
    let mut grid = vec![vec![Cell::Unknown; cols]; rows];
    for r in 0..rows {
        for c in 0..cols {
            match hints[r][c] {
                HintCell::Water => grid[r][c] = Cell::Water,
                HintCell::Ship => grid[r][c] = Cell::Ship,
                HintCell::Empty => {}
            }
        }
    }
    grid
}

fn propagate(
    grid: &mut Vec<Vec<Cell>>,
    row_clues: &[usize],
    col_clues: &[usize],
    rows: usize,
    cols: usize,
) {
    loop {
        let mut changed = false;

        // Rule: a fully-watered line (clue 0, or its ship quota already met) forces
        // every remaining Unknown to Water.
        for r in 0..rows {
            let ship_count = (0..cols).filter(|&c| grid[r][c] == Cell::Ship).count();
            if row_clues[r] == 0 || ship_count == row_clues[r] {
                changed |= fill_row(grid, r, cols, Cell::Water);
            }
        }
        for c in 0..cols {
            let ship_count = (0..rows).filter(|&r| grid[r][c] == Cell::Ship).count();
            if col_clues[c] == 0 || ship_count == col_clues[c] {
                changed |= fill_col(grid, c, rows, Cell::Water);
            }
        }

        // Rule: when a line's remaining Unknowns exactly fill its outstanding ship
        // quota, they must all be Ship.
        for r in 0..rows {
            let ship_count = (0..cols).filter(|&c| grid[r][c] == Cell::Ship).count();
            let unknown_count = (0..cols).filter(|&c| grid[r][c] == Cell::Unknown).count();
            let needed = row_clues[r].saturating_sub(ship_count);
            if needed > 0 && unknown_count == needed {
                changed |= fill_row(grid, r, cols, Cell::Ship);
            }
        }
        for c in 0..cols {
            let ship_count = (0..rows).filter(|&r| grid[r][c] == Cell::Ship).count();
            let unknown_count = (0..rows).filter(|&r| grid[r][c] == Cell::Unknown).count();
            let needed = col_clues[c].saturating_sub(ship_count);
            if needed > 0 && unknown_count == needed {
                changed |= fill_col(grid, c, rows, Cell::Ship);
            }
        }

        // Rule: ships never touch diagonally, so each Ship waters its diagonal neighbours.
        for r in 0..rows {
            for c in 0..cols {
                if grid[r][c] == Cell::Ship {
                    for &(dr, dc) in &DIAGONALS {
                        let nr = r as i32 + dr;
                        let nc = c as i32 + dc;
                        if nr >= 0 && nr < rows as i32 && nc >= 0 && nc < cols as i32 {
                            let nr = nr as usize;
                            let nc = nc as usize;
                            if grid[nr][nc] == Cell::Unknown {
                                grid[nr][nc] = Cell::Water;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }

        if !changed {
            break;
        }
    }
}

fn expand_fleet(fleet: &Fleet) -> Vec<usize> {
    let mut lengths = Vec::new();
    for spec in &fleet.ships {
        for _ in 0..spec.count {
            lengths.push(spec.length);
        }
    }
    lengths.sort_unstable_by(|a, b| b.cmp(a));
    lengths
}

fn solve_recursive(
    grid: &mut Vec<Vec<Cell>>,
    row_clues: &[usize],
    col_clues: &[usize],
    ship_lengths: &[usize],
    rows: usize,
    cols: usize,
    count: &mut usize,
    max_count: usize,
    deadline: Option<Instant>,
) {
    if *count >= max_count {
        return;
    }

    if let Some(d) = deadline {
        if Instant::now() > d {
            *count = max_count + 1;
            return;
        }
    }

    if is_invalid(grid, row_clues, col_clues, rows, cols) {
        return;
    }

    let target = find_best_unknown(grid, row_clues, col_clues, rows, cols);

    let Some((r, c)) = target else {
        if is_valid_complete(grid, row_clues, col_clues, ship_lengths, rows, cols) {
            *count += 1;
        }
        return;
    };

    for val in [Cell::Water, Cell::Ship] {
        let mut g = grid.clone();
        g[r][c] = val;
        propagate(&mut g, row_clues, col_clues, rows, cols);
        solve_recursive(
            &mut g,
            row_clues,
            col_clues,
            ship_lengths,
            rows,
            cols,
            count,
            max_count,
            deadline,
        );
        if *count >= max_count {
            return;
        }
    }
}

fn find_best_unknown(
    grid: &[Vec<Cell>],
    row_clues: &[usize],
    col_clues: &[usize],
    rows: usize,
    cols: usize,
) -> Option<(usize, usize)> {
    let mut best: Option<(usize, usize, usize)> = None;

    for r in 0..rows {
        let row_unknown = (0..cols).filter(|&c| grid[r][c] == Cell::Unknown).count();
        if row_unknown == 0 {
            continue;
        }
        for c in 0..cols {
            if grid[r][c] != Cell::Unknown {
                continue;
            }
            let col_unknown = (0..rows).filter(|&r2| grid[r2][c] == Cell::Unknown).count();
            let score = row_unknown + col_unknown;

            let row_ship = (0..cols).filter(|&c2| grid[r][c2] == Cell::Ship).count();
            let col_ship = (0..rows).filter(|&r2| grid[r2][c] == Cell::Ship).count();
            let row_needed = row_clues[r].saturating_sub(row_ship);
            let col_needed = col_clues[c].saturating_sub(col_ship);

            // Lower score is branched first. A cell whose row or column has already
            // met its ship quota is maximally constrained (its value is effectively
            // forced to Water), so score 0 makes the search resolve it first.
            let constraint_score = if row_needed == 0 || col_needed == 0 {
                0
            } else {
                score
            };

            match best {
                None => best = Some((r, c, constraint_score)),
                Some((_, _, bs)) if constraint_score < bs => best = Some((r, c, constraint_score)),
                _ => {}
            }
        }
    }

    best.map(|(r, c, _)| (r, c))
}

fn solve_single(
    grid: &mut Vec<Vec<Cell>>,
    row_clues: &[usize],
    col_clues: &[usize],
    ship_lengths: &[usize],
    rows: usize,
    cols: usize,
    solutions: &mut Vec<Vec<Vec<Cell>>>,
    deadline: Option<Instant>,
) {
    if !solutions.is_empty() {
        return;
    }

    if let Some(d) = deadline {
        if Instant::now() > d {
            return;
        }
    }

    if is_invalid(grid, row_clues, col_clues, rows, cols) {
        return;
    }

    let target = find_best_unknown(grid, row_clues, col_clues, rows, cols);

    let Some((r, c)) = target else {
        if is_valid_complete(grid, row_clues, col_clues, ship_lengths, rows, cols) {
            solutions.push(grid.clone());
        }
        return;
    };

    for val in [Cell::Water, Cell::Ship] {
        let mut g = grid.clone();
        g[r][c] = val;
        propagate(&mut g, row_clues, col_clues, rows, cols);
        solve_single(
            &mut g,
            row_clues,
            col_clues,
            ship_lengths,
            rows,
            cols,
            solutions,
            deadline,
        );
    }
}

fn is_invalid(
    grid: &[Vec<Cell>],
    row_clues: &[usize],
    col_clues: &[usize],
    rows: usize,
    cols: usize,
) -> bool {
    for r in 0..rows {
        let ship_count = (0..cols).filter(|&c| grid[r][c] == Cell::Ship).count();
        if ship_count > row_clues[r] {
            return true;
        }
        let possible = ship_count
            + (0..cols)
                .filter(|&c| grid[r][c] == Cell::Unknown)
                .count();
        if possible < row_clues[r] {
            return true;
        }
    }

    for c in 0..cols {
        let ship_count = (0..rows).filter(|&r| grid[r][c] == Cell::Ship).count();
        if ship_count > col_clues[c] {
            return true;
        }
        let possible = ship_count
            + (0..rows)
                .filter(|&r| grid[r][c] == Cell::Unknown)
                .count();
        if possible < col_clues[c] {
            return true;
        }
    }

    for r in 0..rows {
        for c in 0..cols {
            if grid[r][c] != Cell::Ship {
                continue;
            }
            for &(dr, dc) in &DIAGONALS {
                let nr = r as i32 + dr;
                let nc = c as i32 + dc;
                if nr >= 0 && nr < rows as i32 && nc >= 0 && nc < cols as i32 {
                    if grid[nr as usize][nc as usize] == Cell::Ship {
                        return true;
                    }
                }
            }
        }
    }

    false
}

fn is_valid_complete(
    grid: &[Vec<Cell>],
    row_clues: &[usize],
    col_clues: &[usize],
    ship_lengths: &[usize],
    rows: usize,
    cols: usize,
) -> bool {
    for r in 0..rows {
        let count = (0..cols).filter(|&c| grid[r][c] == Cell::Ship).count();
        if count != row_clues[r] {
            return false;
        }
    }
    for c in 0..cols {
        let count = (0..rows).filter(|&r| grid[r][c] == Cell::Ship).count();
        if count != col_clues[c] {
            return false;
        }
    }

    let found_lengths = extract_ship_lengths(grid, rows, cols);
    let mut expected = ship_lengths.to_vec();
    let mut found = found_lengths;
    expected.sort_unstable();
    found.sort_unstable();
    expected == found
}

/// Validate a fully-decided player grid against clues + fleet: every cell filled,
/// row/col ship counts match, no diagonal adjacency, and the ship segments match
/// the fleet. The IPC layer calls this after its shape/bounds guards.
pub fn is_valid_solution(
    grid: &[Vec<CellValue>],
    row_clues: &[usize],
    col_clues: &[usize],
    fleet: &Fleet,
    rows: usize,
    cols: usize,
) -> bool {
    if grid.iter().any(|row| row.iter().any(|&c| c == CellValue::Empty)) {
        return false;
    }
    let cells: Vec<Vec<Cell>> = grid
        .iter()
        .map(|row| {
            row.iter()
                .map(|&c| if c == CellValue::Ship { Cell::Ship } else { Cell::Water })
                .collect()
        })
        .collect();
    // `is_invalid` enforces clue counts and the no-diagonal-touch rule; `is_valid_complete`
    // enforces exact clue equality plus the fleet's ship-length multiset.
    if is_invalid(&cells, row_clues, col_clues, rows, cols) {
        return false;
    }
    let ship_lengths = expand_fleet(fleet);
    is_valid_complete(&cells, row_clues, col_clues, &ship_lengths, rows, cols)
}

fn extract_ship_lengths(grid: &[Vec<Cell>], rows: usize, cols: usize) -> Vec<usize> {
    let mut visited = vec![vec![false; cols]; rows];
    let mut lengths = Vec::new();

    for r in 0..rows {
        for c in 0..cols {
            if grid[r][c] != Cell::Ship || visited[r][c] {
                continue;
            }

            visited[r][c] = true;
            let mut len = 1;

            let mut nc = c + 1;
            while nc < cols && grid[r][nc] == Cell::Ship && !visited[r][nc] {
                visited[r][nc] = true;
                len += 1;
                nc += 1;
            }

            if len == 1 {
                let mut nr = r + 1;
                while nr < rows && grid[nr][c] == Cell::Ship && !visited[nr][c] {
                    visited[nr][c] = true;
                    len += 1;
                    nr += 1;
                }
            }

            lengths.push(len);
        }
    }

    lengths
}

fn deduce_reason(row_clues: &[usize], col_clues: &[usize], r: usize, c: usize) -> String {
    format!(
        "Row {} needs {} ships, column {} needs {} ships",
        r + 1,
        row_clues[r],
        c + 1,
        col_clues[c]
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games::bimaru::generator;

    #[test]
    fn test_solver_finds_unique_solution() {
        let fleet = Fleet::standard();
        let sol = generator::generate(10, 10, "medium", &fleet).unwrap();
        let count = count_solutions(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            &sol.puzzle.hints,
            &fleet,
            10,
            10,
            2,
        );
        assert_eq!(count, 1, "Generated puzzle should have exactly 1 solution");
    }

    #[test]
    fn test_solver_finds_solution() {
        let fleet = Fleet::standard();
        let sol = generator::generate(10, 10, "easy", &fleet).unwrap();
        let found = solve(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            &sol.puzzle.hints,
            &fleet,
            10,
            10,
        );
        assert!(found.is_some(), "Solver should find a solution");
    }

    #[test]
    fn test_propagation_zero_clue() {
        let mut grid = vec![vec![Cell::Unknown; 3]; 3];
        let row_clues = vec![0, 1, 0];
        let col_clues = vec![0, 1, 0];
        propagate(&mut grid, &row_clues, &col_clues, 3, 3);

        assert_eq!(grid[0][0], Cell::Water);
        assert_eq!(grid[0][1], Cell::Water);
        assert_eq!(grid[2][2], Cell::Water);
        assert_eq!(grid[1][1], Cell::Ship);
    }

    #[test]
    fn test_count_solutions_timed_with_timeout() {
        let fleet = Fleet::standard();
        let sol = generator::generate(10, 10, "medium", &fleet).unwrap();
        let count = count_solutions_timed(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            &sol.puzzle.hints,
            &fleet,
            10, 10, 2,
            Some(std::time::Duration::from_secs(5)),
        );
        assert_eq!(count, 1);
    }

    #[test]
    fn test_find_deduction_zero_clue_row() {
        let rows = 4;
        let cols = 4;
        let hints = vec![vec![HintCell::Empty; cols]; rows];
        let row_clues = vec![0, 2, 1, 1];
        let col_clues = vec![1, 1, 1, 1];
        let player_grid = vec![vec![CellValue::Empty; cols]; rows];

        let result = find_deduction(&row_clues, &col_clues, &player_grid, &hints, rows, cols);
        assert!(result.is_some());
        let (r, _c, value, _reason) = result.unwrap();
        assert_eq!(r, 0, "Should deduce from zero-clue row 0");
        assert_eq!(value, CellValue::Water);
    }

    #[test]
    fn test_find_deduction_on_solved_grid() {
        let fleet = Fleet::standard();
        let sol = generator::generate(10, 10, "easy", &fleet).unwrap();
        let result = find_deduction(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            &sol.solution,
            &sol.puzzle.hints,
            10, 10,
        );
        assert!(result.is_none(), "Fully solved grid should yield no deduction");
    }
}
