use std::time::{Duration, Instant};

use super::types::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Cell {
    Unknown,
    Filled,
    Empty,
}

#[cfg(test)]
pub fn solve(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
) -> Option<Vec<Vec<bool>>> {
    solve_internal(row_clues, col_clues, rows, cols, None, None)
}

pub fn solve_timed(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    timeout: Duration,
) -> Option<Vec<Vec<bool>>> {
    solve_internal(row_clues, col_clues, rows, cols, None, Some(Instant::now() + timeout))
}

#[cfg(test)]
pub fn solve_with_partial(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    partial: Option<&Vec<Vec<CellState>>>,
) -> Option<Vec<Vec<bool>>> {
    solve_internal(row_clues, col_clues, rows, cols, partial, None)
}

pub fn solve_with_partial_timed(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    partial: Option<&Vec<Vec<CellState>>>,
    timeout: Duration,
) -> Option<Vec<Vec<bool>>> {
    solve_internal(row_clues, col_clues, rows, cols, partial, Some(Instant::now() + timeout))
}

fn solve_internal(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    partial: Option<&Vec<Vec<CellState>>>,
    deadline: Option<Instant>,
) -> Option<Vec<Vec<bool>>> {
    let mut grid = vec![vec![Cell::Unknown; cols]; rows];

    if let Some(p) = partial {
        for r in 0..rows {
            for c in 0..cols {
                match p[r][c] {
                    CellState::Filled => grid[r][c] = Cell::Filled,
                    CellState::Marked => grid[r][c] = Cell::Empty,
                    CellState::Empty => {}
                }
            }
        }
    }

    if !propagate(&mut grid, row_clues, col_clues, rows, cols) {
        return None;
    }

    if is_complete(&grid) {
        return Some(to_bool_grid(&grid));
    }

    backtrack(grid, row_clues, col_clues, rows, cols, deadline)
}

#[allow(dead_code)]
pub fn is_line_solvable(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
) -> bool {
    let mut grid = vec![vec![Cell::Unknown; cols]; rows];
    propagate(&mut grid, row_clues, col_clues, rows, cols) && is_complete(&grid)
}

/// Runs propagation and returns (no_contradiction, cells_determined).
pub fn propagation_progress(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
) -> (bool, usize) {
    let mut grid = vec![vec![Cell::Unknown; cols]; rows];
    let ok = propagate(&mut grid, row_clues, col_clues, rows, cols);
    let determined = grid
        .iter()
        .flat_map(|r| r.iter())
        .filter(|&&c| c != Cell::Unknown)
        .count();
    (ok, determined)
}

pub fn has_unique_solution(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
) -> bool {
    let deadline = Instant::now() + Duration::from_secs(5);
    count_solutions_up_to(row_clues, col_clues, rows, cols, 2, deadline) == 1
}

fn count_solutions_up_to(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    limit: usize,
    deadline: Instant,
) -> usize {
    let mut grid = vec![vec![Cell::Unknown; cols]; rows];
    if !propagate(&mut grid, row_clues, col_clues, rows, cols) {
        return 0;
    }
    if is_complete(&grid) {
        return 1;
    }
    let mut count = 0;
    count_backtrack(&grid, row_clues, col_clues, rows, cols, &mut count, limit, deadline);
    count
}

fn count_backtrack(
    grid: &[Vec<Cell>],
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    count: &mut usize,
    limit: usize,
    deadline: Instant,
) {
    if *count >= limit || Instant::now() >= deadline {
        return;
    }

    let Some((r, c)) = find_unknown(grid) else {
        *count += 1;
        return;
    };

    for val in [Cell::Filled, Cell::Empty] {
        let mut g = grid.to_vec();
        g[r][c] = val;
        if propagate(&mut g, row_clues, col_clues, rows, cols) {
            if is_complete(&g) {
                *count += 1;
                if *count >= limit {
                    return;
                }
            } else {
                count_backtrack(&g, row_clues, col_clues, rows, cols, count, limit, deadline);
            }
        }
    }
}

fn propagate(
    grid: &mut Vec<Vec<Cell>>,
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
) -> bool {
    let mut changed = true;
    while changed {
        changed = false;

        for r in 0..rows {
            let line: Vec<Cell> = grid[r].clone();
            match solve_line(&line, &row_clues[r]) {
                None => return false,
                Some(new_line) => {
                    for c in 0..cols {
                        if line[c] == Cell::Unknown && new_line[c] != Cell::Unknown {
                            grid[r][c] = new_line[c];
                            changed = true;
                        }
                    }
                }
            }
        }

        for c in 0..cols {
            let line: Vec<Cell> = (0..rows).map(|r| grid[r][c]).collect();
            match solve_line(&line, &col_clues[c]) {
                None => return false,
                Some(new_line) => {
                    for r in 0..rows {
                        if line[r] == Cell::Unknown && new_line[r] != Cell::Unknown {
                            grid[r][c] = new_line[r];
                            changed = true;
                        }
                    }
                }
            }
        }
    }
    true
}

fn solve_line(line: &[Cell], clues: &[usize]) -> Option<Vec<Cell>> {
    let len = line.len();
    if clues == [0] {
        let mut result = vec![Cell::Empty; len];
        for (i, &c) in line.iter().enumerate() {
            match c {
                Cell::Filled => return None,
                Cell::Empty => result[i] = Cell::Empty,
                Cell::Unknown => result[i] = Cell::Empty,
            }
        }
        return Some(result);
    }

    let placements = generate_placements(line, clues, len);
    if placements.is_empty() {
        return None;
    }

    let mut result = line.to_vec();
    for i in 0..len {
        if result[i] != Cell::Unknown {
            continue;
        }
        let all_filled = placements.iter().all(|p| p[i]);
        let all_empty = placements.iter().all(|p| !p[i]);
        if all_filled {
            result[i] = Cell::Filled;
        } else if all_empty {
            result[i] = Cell::Empty;
        }
    }
    Some(result)
}

fn generate_placements(line: &[Cell], clues: &[usize], len: usize) -> Vec<Vec<bool>> {
    let mut results = Vec::new();
    let mut placement = vec![false; len];
    generate_placements_rec(line, clues, len, 0, 0, &mut placement, &mut results);
    results
}

fn generate_placements_rec(
    line: &[Cell],
    clues: &[usize],
    len: usize,
    clue_idx: usize,
    pos: usize,
    placement: &mut Vec<bool>,
    results: &mut Vec<Vec<bool>>,
) {
    if clue_idx == clues.len() {
        for i in pos..len {
            if line[i] == Cell::Filled {
                return;
            }
        }
        let mut p = placement.clone();
        for i in pos..len {
            p[i] = false;
        }
        results.push(p);
        return;
    }

    let remaining_clues: usize = clues[clue_idx..].iter().sum::<usize>()
        + clues.len() - clue_idx - 1;

    let max_start = if len >= remaining_clues {
        len - remaining_clues
    } else {
        return;
    };

    for start in pos..=max_start {
        if line[start] == Cell::Empty && start < pos + 1 && clue_idx > 0 {
            continue;
        }

        for i in pos..start {
            if line[i] == Cell::Filled {
                return;
            }
            placement[i] = false;
        }

        let block_end = start + clues[clue_idx];
        if block_end > len {
            break;
        }

        let mut valid = true;
        for i in start..block_end {
            if line[i] == Cell::Empty {
                valid = false;
                break;
            }
        }
        if !valid {
            continue;
        }

        for i in start..block_end {
            placement[i] = true;
        }

        if clue_idx + 1 < clues.len() {
            if block_end < len && line[block_end] != Cell::Filled {
                placement[block_end] = false;
                generate_placements_rec(
                    line, clues, len, clue_idx + 1, block_end + 1, placement, results,
                );
            }
        } else {
            generate_placements_rec(line, clues, len, clue_idx + 1, block_end, placement, results);
        }

        for i in start..block_end {
            placement[i] = false;
        }
    }
}

fn backtrack(
    grid: Vec<Vec<Cell>>,
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    deadline: Option<Instant>,
) -> Option<Vec<Vec<bool>>> {
    if deadline.is_some_and(|d| Instant::now() >= d) {
        return None;
    }

    let Some((r, c)) = find_unknown(&grid) else {
        return Some(to_bool_grid(&grid));
    };

    for val in [Cell::Filled, Cell::Empty] {
        let mut g = grid.clone();
        g[r][c] = val;
        if propagate(&mut g, row_clues, col_clues, rows, cols) {
            if let Some(solution) = backtrack(g, row_clues, col_clues, rows, cols, deadline) {
                return Some(solution);
            }
        }
    }
    None
}

fn find_unknown(grid: &[Vec<Cell>]) -> Option<(usize, usize)> {
    for (r, row) in grid.iter().enumerate() {
        for (c, &cell) in row.iter().enumerate() {
            if cell == Cell::Unknown {
                return Some((r, c));
            }
        }
    }
    None
}

fn is_complete(grid: &[Vec<Cell>]) -> bool {
    grid.iter().all(|row| row.iter().all(|c| *c != Cell::Unknown))
}

fn to_bool_grid(grid: &[Vec<Cell>]) -> Vec<Vec<bool>> {
    grid.iter()
        .map(|row| row.iter().map(|c| *c == Cell::Filled).collect())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solve_trivial() {
        let row_clues = vec![vec![1]];
        let col_clues = vec![vec![1]];
        let sol = solve(&row_clues, &col_clues, 1, 1).unwrap();
        assert_eq!(sol, vec![vec![true]]);
    }

    #[test]
    fn test_solve_empty() {
        let row_clues = vec![vec![0]; 3];
        let col_clues = vec![vec![0]; 3];
        let sol = solve(&row_clues, &col_clues, 3, 3).unwrap();
        assert!(sol.iter().all(|r| r.iter().all(|&c| !c)));
    }

    #[test]
    fn test_solve_full_row() {
        let row_clues = vec![vec![5]];
        let col_clues = vec![vec![1]; 5];
        let sol = solve(&row_clues, &col_clues, 1, 5).unwrap();
        assert_eq!(sol, vec![vec![true; 5]]);
    }

    #[test]
    fn test_solve_5x5() {
        // Cross pattern
        let row_clues = vec![vec![1], vec![3], vec![5], vec![3], vec![1]];
        let col_clues = vec![vec![1], vec![3], vec![5], vec![3], vec![1]];
        let sol = solve(&row_clues, &col_clues, 5, 5);
        assert!(sol.is_some());
        let grid = sol.unwrap();
        for (r, clue) in row_clues.iter().enumerate() {
            assert_eq!(&clues_from_line(&grid[r]), clue);
        }
    }

    #[test]
    fn test_unique_solution() {
        let row_clues = vec![vec![5]];
        let col_clues = vec![vec![1]; 5];
        assert!(has_unique_solution(&row_clues, &col_clues, 1, 5));
    }

    #[test]
    fn test_non_unique() {
        // 3x3 with single 1 in each row/col — multiple valid placements
        let row_clues = vec![vec![1], vec![1], vec![1]];
        let col_clues = vec![vec![1], vec![1], vec![1]];
        assert!(!has_unique_solution(&row_clues, &col_clues, 3, 3));
    }

    #[test]
    fn test_solve_line_full_overlap() {
        let line = vec![Cell::Unknown; 5];
        let result = solve_line(&line, &[5]).unwrap();
        assert!(result.iter().all(|c| *c == Cell::Filled));
    }

    #[test]
    fn test_solve_line_partial_overlap() {
        let line = vec![Cell::Unknown; 5];
        let result = solve_line(&line, &[3]).unwrap();
        assert_eq!(result[0], Cell::Unknown);
        assert_eq!(result[2], Cell::Filled);
        assert_eq!(result[4], Cell::Unknown);
    }

    #[test]
    fn test_solve_with_partial() {
        let row_clues = vec![vec![2], vec![1]];
        let col_clues = vec![vec![1, 1], vec![1]];
        let partial = vec![
            vec![CellState::Filled, CellState::Empty],
            vec![CellState::Empty, CellState::Empty],
        ];
        let sol = solve_with_partial(&row_clues, &col_clues, 2, 2, Some(&partial));
        assert!(sol.is_none());
    }

    #[test]
    fn test_line_solvable_cross() {
        let row_clues = vec![vec![1], vec![3], vec![5], vec![3], vec![1]];
        let col_clues = vec![vec![1], vec![3], vec![5], vec![3], vec![1]];
        assert!(is_line_solvable(&row_clues, &col_clues, 5, 5));
    }

    #[test]
    fn test_line_solvable_not() {
        let row_clues = vec![vec![1], vec![1], vec![1]];
        let col_clues = vec![vec![1], vec![1], vec![1]];
        assert!(!is_line_solvable(&row_clues, &col_clues, 3, 3));
    }
}
