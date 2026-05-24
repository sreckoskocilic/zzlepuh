use std::time::Duration;

use super::solver;
use super::types::*;

const SOLVE_TIMEOUT: Duration = Duration::from_secs(5);

pub fn get_hint(
    puzzle: &CalcudokuPuzzle,
    player_grid: &[Vec<u8>],
) -> Option<CalcudokuHint> {
    let solution =
        solver::solve_with_partial_timed(puzzle, Some(&player_grid.to_vec()), SOLVE_TIMEOUT)
            .or_else(|| solver::solve_timed(puzzle, SOLVE_TIMEOUT))?;

    let n = puzzle.size;
    for r in 0..n {
        for c in 0..n {
            if player_grid[r][c] == 0 {
                return Some(CalcudokuHint {
                    row: r,
                    col: c,
                    value: solution[r][c],
                    reason: format!("This cell should be {}", solution[r][c]),
                });
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games::calcudoku::generator;

    #[test]
    fn test_hint_returns_valid() {
        let sol = generator::generate(4, "easy").unwrap();
        let player_grid = vec![vec![0u8; 4]; 4];
        let hint = get_hint(&sol.puzzle, &player_grid);
        assert!(hint.is_some());
        let h = hint.unwrap();
        assert_eq!(h.value, sol.solution[h.row][h.col]);
    }

    #[test]
    fn test_hint_skips_filled_cells() {
        let sol = generator::generate(4, "easy").unwrap();
        let mut grid = vec![vec![0u8; 4]; 4];
        grid[0][0] = sol.solution[0][0];
        let hint = get_hint(&sol.puzzle, &grid);
        assert!(hint.is_some());
        let h = hint.unwrap();
        assert!(h.row != 0 || h.col != 0);
        assert_eq!(h.value, sol.solution[h.row][h.col]);
    }

    #[test]
    fn test_hint_none_when_complete() {
        let sol = generator::generate(4, "easy").unwrap();
        let hint = get_hint(&sol.puzzle, &sol.solution);
        assert!(hint.is_none());
    }
}
