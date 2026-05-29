use crate::games::nonogram::{generator, hint, solver, types::*};

#[tauri::command]
pub async fn generate_nonogram_puzzle(
    difficulty: String,
    rows: Option<usize>,
    cols: Option<usize>,
) -> Result<NonogramPuzzle, String> {
    let rows = rows.unwrap_or(10).clamp(5, 20);
    let cols = cols.unwrap_or(10).clamp(5, 20);

    tauri::async_runtime::spawn_blocking(move || {
        generator::generate(rows, cols, &difficulty)
            .map(|sol| sol.puzzle)
            .ok_or_else(|| "Failed to generate puzzle after max attempts".to_string())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub fn validate_nonogram_solution(
    player_grid: Vec<Vec<CellState>>,
    row_clues: Vec<Vec<usize>>,
    col_clues: Vec<Vec<usize>>,
) -> bool {
    let rows = player_grid.len();
    if rows == 0 {
        return false;
    }
    let cols = player_grid[0].len();
    if player_grid.iter().any(|row| row.len() != cols) {
        return false;
    }

    if row_clues.len() != rows || col_clues.len() != cols {
        return false;
    }

    // Blanks count the same whether empty or X-marked; only Filled runs are matched against the clues.
    for (r, clue) in row_clues.iter().enumerate() {
        let line: Vec<bool> = player_grid[r].iter().map(|c| *c == CellState::Filled).collect();
        if &clues_from_line(&line) != clue {
            return false;
        }
    }

    for (c, clue) in col_clues.iter().enumerate() {
        let line: Vec<bool> = (0..rows).map(|r| player_grid[r][c] == CellState::Filled).collect();
        if &clues_from_line(&line) != clue {
            return false;
        }
    }

    true
}

#[tauri::command]
pub fn get_nonogram_hint(
    player_grid: Vec<Vec<CellState>>,
    row_clues: Vec<Vec<usize>>,
    col_clues: Vec<Vec<usize>>,
) -> Option<NonogramHint> {
    let rows = player_grid.len();
    if rows == 0 {
        return None;
    }
    let cols = player_grid[0].len();
    if player_grid.iter().any(|row| row.len() != cols) {
        return None;
    }
    if row_clues.len() != rows || col_clues.len() != cols {
        return None;
    }

    hint::get_hint(&row_clues, &col_clues, &player_grid, rows, cols)
}

#[tauri::command]
pub fn check_nonogram_errors(
    player_grid: Vec<Vec<CellState>>,
    row_clues: Vec<Vec<usize>>,
    col_clues: Vec<Vec<usize>>,
) -> Vec<(usize, usize)> {
    let rows = player_grid.len();
    if rows == 0 {
        return vec![];
    }
    let cols = player_grid[0].len();
    if player_grid.iter().any(|row| row.len() != cols) {
        return vec![];
    }
    if row_clues.len() != rows || col_clues.len() != cols {
        return vec![];
    }

    let Some(solution) = solver::solve_timed(&row_clues, &col_clues, rows, cols, std::time::Duration::from_secs(5)) else {
        return vec![];
    };

    let mut errors = Vec::new();
    for r in 0..rows {
        for c in 0..cols {
            if player_grid[r][c] == CellState::Empty {
                continue;
            }
            let player_filled = player_grid[r][c] == CellState::Filled;
            if player_filled != solution[r][c] {
                errors.push((r, c));
            }
        }
    }
    errors
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_puzzle() -> (Vec<Vec<bool>>, Vec<Vec<usize>>, Vec<Vec<usize>>) {
        let sol = generator::generate(5, 5, "easy").expect("generate test puzzle");
        (sol.solution, sol.puzzle.row_clues, sol.puzzle.col_clues)
    }

    #[test]
    fn test_validate_correct() {
        let (solution, row_clues, col_clues) = make_test_puzzle();
        let player: Vec<Vec<CellState>> = solution.iter()
            .map(|row| row.iter().map(|&b| {
                if b { CellState::Filled } else { CellState::Marked }
            }).collect())
            .collect();
        assert!(validate_nonogram_solution(player, row_clues, col_clues));
    }

    #[test]
    fn test_validate_wrong() {
        let (mut solution, row_clues, col_clues) = make_test_puzzle();
        solution[0][0] = !solution[0][0];
        let player: Vec<Vec<CellState>> = solution.iter()
            .map(|row| row.iter().map(|&b| {
                if b { CellState::Filled } else { CellState::Marked }
            }).collect())
            .collect();
        assert!(!validate_nonogram_solution(player, row_clues, col_clues));
    }

    #[test]
    fn test_validate_empty_grid() {
        let grid: Vec<Vec<CellState>> = vec![];
        assert!(!validate_nonogram_solution(grid, vec![], vec![]));
    }

    #[test]
    fn test_validate_blanks_left_empty() {
        let (solution, row_clues, col_clues) = make_test_puzzle();
        let player: Vec<Vec<CellState>> = solution.iter()
            .map(|row| row.iter().map(|&b| {
                if b { CellState::Filled } else { CellState::Empty }
            }).collect())
            .collect();
        assert!(validate_nonogram_solution(player, row_clues, col_clues));
    }

    #[test]
    fn test_validate_incomplete_is_invalid() {
        let (_, row_clues, col_clues) = make_test_puzzle();
        let grid = vec![vec![CellState::Empty; 5]; 5];
        assert!(!validate_nonogram_solution(grid, row_clues, col_clues));
    }

    #[test]
    fn test_hint_returns_something() {
        let (_, row_clues, col_clues) = make_test_puzzle();
        let player = vec![vec![CellState::Empty; 5]; 5];
        let hint = get_nonogram_hint(player, row_clues, col_clues);
        assert!(hint.is_some());
    }

    #[test]
    fn test_check_errors_correct() {
        let (solution, row_clues, col_clues) = make_test_puzzle();
        let player: Vec<Vec<CellState>> = solution.iter()
            .map(|row| row.iter().map(|&b| {
                if b { CellState::Filled } else { CellState::Marked }
            }).collect())
            .collect();
        let errors = check_nonogram_errors(player, row_clues, col_clues);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_check_errors_wrong_cell() {
        let (solution, row_clues, col_clues) = make_test_puzzle();
        let mut player: Vec<Vec<CellState>> = solution.iter()
            .map(|row| row.iter().map(|&b| {
                if b { CellState::Filled } else { CellState::Marked }
            }).collect())
            .collect();
        let flipped = if player[0][0] == CellState::Filled {
            CellState::Marked
        } else {
            CellState::Filled
        };
        player[0][0] = flipped;
        let errors = check_nonogram_errors(player, row_clues, col_clues);
        assert!(errors.contains(&(0, 0)));
    }
}
