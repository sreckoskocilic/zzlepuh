use std::time::Duration;

use super::solver;
use super::types::*;

const SOLVE_TIMEOUT: Duration = Duration::from_secs(5);

pub fn get_hint(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    player_grid: &[Vec<CellState>],
    rows: usize,
    cols: usize,
) -> Option<NonogramHint> {
    let solution = solver::solve_with_partial_timed(
        row_clues, col_clues, rows, cols, Some(&player_grid.to_vec()), SOLVE_TIMEOUT,
    )?;

    for r in 0..rows {
        for c in 0..cols {
            if player_grid[r][c] == CellState::Empty {
                return Some(NonogramHint {
                    row: r,
                    col: c,
                    filled: solution[r][c],
                    reason: if solution[r][c] {
                        "This cell must be filled".to_string()
                    } else {
                        "This cell must be empty".to_string()
                    },
                });
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games::nonogram::generator;

    #[test]
    fn test_hint_returns_valid() {
        let sol = generator::generate(5, 5, "easy").unwrap();
        let player_grid = vec![vec![CellState::Empty; 5]; 5];
        let hint = get_hint(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            &player_grid,
            5, 5,
        );
        assert!(hint.is_some());
        let h = hint.unwrap();
        assert_eq!(h.filled, sol.solution[h.row][h.col]);
    }

    #[test]
    fn test_hint_none_when_complete() {
        let sol = generator::generate(5, 5, "easy").unwrap();
        let player_grid: Vec<Vec<CellState>> = sol.solution.iter()
            .map(|row| row.iter().map(|&b| {
                if b { CellState::Filled } else { CellState::Marked }
            }).collect())
            .collect();
        let hint = get_hint(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            &player_grid,
            5, 5,
        );
        assert!(hint.is_none());
    }
}
