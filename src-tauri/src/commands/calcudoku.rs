use crate::games::calcudoku::{generator, hint, solver, types::*};

fn cages_in_bounds(puzzle: &CalcudokuPuzzle) -> bool {
    let n = puzzle.size;
    puzzle
        .cages
        .iter()
        .all(|cage| cage.cells.iter().all(|&(r, c)| r < n && c < n))
}

#[tauri::command]
pub async fn generate_calcudoku_puzzle(
    difficulty: String,
    size: Option<usize>,
) -> Result<CalcudokuPuzzle, String> {
    let size = size.unwrap_or(6).clamp(4, 9);

    tauri::async_runtime::spawn_blocking(move || {
        generator::generate(size, &difficulty)
            .map(|sol| sol.puzzle)
            .ok_or_else(|| "Failed to generate puzzle after max attempts".to_string())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub fn validate_calcudoku_solution(
    player_grid: Vec<Vec<u8>>,
    puzzle: CalcudokuPuzzle,
) -> bool {
    let n = puzzle.size;
    if player_grid.len() != n {
        return false;
    }
    if player_grid.iter().any(|row| row.len() != n) {
        return false;
    }
    if player_grid.iter().any(|row| row.contains(&0)) {
        return false;
    }
    if !cages_in_bounds(&puzzle) {
        return false;
    }

    for row in &player_grid {
        let mut seen = vec![false; n + 1];
        for &val in row {
            let v = val as usize;
            if v > n || seen[v] {
                return false;
            }
            seen[v] = true;
        }
    }

    for c in 0..n {
        let mut seen = vec![false; n + 1];
        for row in player_grid.iter().take(n) {
            let v = row[c] as usize;
            if v > n || seen[v] {
                return false;
            }
            seen[v] = true;
        }
    }

    for cage in &puzzle.cages {
        let values: Vec<u8> = cage.cells.iter().map(|&(r, c)| player_grid[r][c]).collect();
        if !check_cage_values(&values, cage.operation, cage.target) {
            return false;
        }
    }

    true
}

#[tauri::command]
pub fn get_calcudoku_hint(
    player_grid: Vec<Vec<u8>>,
    puzzle: CalcudokuPuzzle,
) -> Option<CalcudokuHint> {
    let n = puzzle.size;
    if player_grid.len() != n {
        return None;
    }
    if player_grid.iter().any(|row| row.len() != n) {
        return None;
    }
    if !cages_in_bounds(&puzzle) {
        return None;
    }

    hint::get_hint(&puzzle, &player_grid)
}

#[tauri::command]
pub fn check_calcudoku_errors(
    player_grid: Vec<Vec<u8>>,
    puzzle: CalcudokuPuzzle,
) -> Vec<(usize, usize)> {
    let n = puzzle.size;
    if player_grid.len() != n {
        return vec![];
    }
    if player_grid.iter().any(|row| row.len() != n) {
        return vec![];
    }
    if !cages_in_bounds(&puzzle) {
        return vec![];
    }

    let Some(solution) = solver::solve_timed(&puzzle, std::time::Duration::from_secs(5)) else {
        return vec![];
    };

    let mut errors = Vec::new();
    for r in 0..n {
        for c in 0..n {
            if player_grid[r][c] > 0 && player_grid[r][c] != solution[r][c] {
                errors.push((r, c));
            }
        }
    }
    errors
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_puzzle() -> (Vec<Vec<u8>>, CalcudokuPuzzle) {
        let sol = generator::generate(4, "easy").expect("generate test puzzle");
        (sol.solution, sol.puzzle)
    }

    #[test]
    fn test_validate_correct() {
        let (solution, puzzle) = make_test_puzzle();
        assert!(validate_calcudoku_solution(solution, puzzle));
    }

    #[test]
    fn test_validate_correct_all_sizes_and_difficulties() {
        for size in 4..=9 {
            for diff in ["easy", "medium", "hard"] {
                let sol = generator::generate(size, diff)
                    .unwrap_or_else(|| panic!("generate {size} {diff}"));
                assert!(
                    validate_calcudoku_solution(sol.solution.clone(), sol.puzzle),
                    "validate rejected the generated solution for size={size} diff={diff}"
                );
            }
        }
    }

    #[test]
    fn test_validate_wrong() {
        let (mut solution, puzzle) = make_test_puzzle();
        let orig = solution[0][0];
        solution[0][0] = if orig == 1 { 2 } else { 1 };
        assert!(!validate_calcudoku_solution(solution, puzzle));
    }

    #[test]
    fn test_validate_empty() {
        let (_, puzzle) = make_test_puzzle();
        let grid = vec![vec![0u8; 4]; 4];
        assert!(!validate_calcudoku_solution(grid, puzzle));
    }

    #[test]
    fn test_hint_returns_something() {
        let (_, puzzle) = make_test_puzzle();
        let grid = vec![vec![0u8; 4]; 4];
        let hint = get_calcudoku_hint(grid, puzzle);
        assert!(hint.is_some());
    }

    #[test]
    fn test_check_errors_correct() {
        let (solution, puzzle) = make_test_puzzle();
        let errors = check_calcudoku_errors(solution, puzzle);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_validate_wrong_size_grid() {
        let (_, puzzle) = make_test_puzzle();
        let grid = vec![vec![1u8; 3]; 3];
        assert!(!validate_calcudoku_solution(grid, puzzle));
    }

    #[test]
    fn test_validate_duplicate_in_row() {
        let (mut solution, puzzle) = make_test_puzzle();
        solution[0][0] = solution[0][1];
        assert!(!validate_calcudoku_solution(solution, puzzle));
    }

    #[test]
    fn test_hint_with_partial_progress() {
        let (solution, puzzle) = make_test_puzzle();
        let mut grid = vec![vec![0u8; 4]; 4];
        grid[0][0] = solution[0][0];
        grid[0][1] = solution[0][1];
        let hint = get_calcudoku_hint(grid.clone(), puzzle);
        assert!(hint.is_some());
        let h = hint.unwrap();
        assert!(h.row != 0 || (h.col != 0 && h.col != 1));
    }

    #[test]
    fn test_hint_wrong_size_grid() {
        let (_, puzzle) = make_test_puzzle();
        let grid = vec![vec![0u8; 3]; 3];
        assert!(get_calcudoku_hint(grid, puzzle).is_none());
    }

    #[test]
    fn test_check_errors_empty_grid() {
        let (_, puzzle) = make_test_puzzle();
        let grid = vec![vec![0u8; 4]; 4];
        let errors = check_calcudoku_errors(grid, puzzle);
        assert!(errors.is_empty());
    }

    #[test]
    fn test_check_errors_wrong() {
        let (mut solution, puzzle) = make_test_puzzle();
        let orig = solution[0][0];
        solution[0][0] = if orig == 1 { 2 } else { 1 };
        let errors = check_calcudoku_errors(solution, puzzle);
        assert!(errors.contains(&(0, 0)));
    }
}
