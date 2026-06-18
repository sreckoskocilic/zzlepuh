use crate::games::bimaru::{generator, hint, solver, types::*};

#[tauri::command]
pub async fn generate_bimaru_puzzle(
    difficulty: String,
    rows: Option<usize>,
    cols: Option<usize>,
) -> Result<BimaruPuzzle, String> {
    let rows = rows.unwrap_or(10).clamp(4, 20);
    let cols = cols.unwrap_or(10).clamp(4, 20);
    let fleet = Fleet::for_size(rows, cols);

    tauri::async_runtime::spawn_blocking(move || {
        generator::generate(rows, cols, &difficulty, &fleet)
            .map(|sol| sol.puzzle)
            .ok_or_else(|| "Failed to generate puzzle after max attempts".to_string())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub fn validate_bimaru_solution(
    player_grid: Vec<Vec<CellValue>>,
    row_clues: Vec<usize>,
    col_clues: Vec<usize>,
    fleet: Fleet,
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

    solver::is_valid_solution(&player_grid, &row_clues, &col_clues, &fleet, rows, cols)
}

#[tauri::command]
pub async fn get_bimaru_hint(
    player_grid: Vec<Vec<CellValue>>,
    row_clues: Vec<usize>,
    col_clues: Vec<usize>,
    fleet: Fleet,
    hints: Vec<Vec<HintCell>>,
) -> Option<BimaruHint> {
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
    if hints.len() != rows || hints.iter().any(|r| r.len() != cols) {
        return None;
    }
    let fleet_cells: usize = fleet.ships.iter().map(|s| s.length * s.count).sum();
    if fleet_cells > rows * cols {
        return None;
    }

    // Off the async reactor: a worst-case deduction can spin to the solver deadline.
    tauri::async_runtime::spawn_blocking(move || {
        hint::get_hint(
            &row_clues,
            &col_clues,
            &player_grid,
            &hints,
            &fleet,
            rows,
            cols,
        )
    })
    .await
    .ok()
    .flatten()
}

#[tauri::command]
pub async fn check_bimaru_errors(
    player_grid: Vec<Vec<CellValue>>,
    row_clues: Vec<usize>,
    col_clues: Vec<usize>,
    fleet: Fleet,
    hints: Vec<Vec<HintCell>>,
) -> Result<Vec<(usize, usize)>, String> {
    let rows = player_grid.len();
    if rows == 0 {
        return Ok(vec![]);
    }
    let cols = player_grid[0].len();
    if player_grid.iter().any(|row| row.len() != cols) {
        return Ok(vec![]);
    }
    if row_clues.len() != rows || col_clues.len() != cols {
        return Ok(vec![]);
    }
    if hints.len() != rows || hints.iter().any(|r| r.len() != cols) {
        return Ok(vec![]);
    }
    let fleet_cells: usize = fleet.ships.iter().map(|s| s.length * s.count).sum();
    if fleet_cells > rows * cols {
        return Ok(vec![]);
    }

    tauri::async_runtime::spawn_blocking(move || {
        let Some(solution) = solver::solve(&row_clues, &col_clues, &hints, &fleet, rows, cols) else {
            return vec![];
        };

        let mut errors = Vec::new();
        for r in 0..rows {
            for c in 0..cols {
                if player_grid[r][c] == CellValue::Empty {
                    continue;
                }
                if player_grid[r][c] != solution[r][c] {
                    errors.push((r, c));
                }
            }
        }
        errors
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))
}

#[cfg(test)]
fn make_test_puzzle() -> (Vec<Vec<CellValue>>, Vec<usize>, Vec<usize>, Fleet, Vec<Vec<HintCell>>) {
    let fleet = Fleet::standard();
    let sol = crate::games::bimaru::generator::generate(10, 10, "easy", &fleet)
        .expect("generate test puzzle");
    (sol.solution, sol.puzzle.row_clues, sol.puzzle.col_clues, fleet, sol.puzzle.hints)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_correct_solution() {
        let (solution, row_clues, col_clues, fleet, _) = make_test_puzzle();
        assert!(validate_bimaru_solution(solution, row_clues, col_clues, fleet));
    }

    #[test]
    fn test_validate_wrong_clues() {
        let (solution, mut row_clues, col_clues, fleet, _) = make_test_puzzle();
        row_clues[0] = 99;
        assert!(!validate_bimaru_solution(solution, row_clues, col_clues, fleet));
    }

    #[test]
    fn test_validate_empty_grid() {
        let grid: Vec<Vec<CellValue>> = vec![];
        assert!(!validate_bimaru_solution(grid, vec![], vec![], Fleet::standard()));
    }

    #[test]
    fn test_validate_all_water() {
        let grid = vec![vec![CellValue::Water; 10]; 10];
        let row_clues = vec![0; 10];
        let col_clues = vec![0; 10];
        let fleet = Fleet { ships: vec![] };
        assert!(validate_bimaru_solution(grid, row_clues, col_clues, fleet));
    }

    #[test]
    fn test_validate_diagonal_violation() {
        let mut grid = vec![vec![CellValue::Water; 4]; 4];
        grid[0][0] = CellValue::Ship;
        grid[1][1] = CellValue::Ship;
        let row_clues = vec![1, 1, 0, 0];
        let col_clues = vec![1, 1, 0, 0];
        let fleet = Fleet { ships: vec![ShipSpec { length: 1, count: 2 }] };
        assert!(!validate_bimaru_solution(grid, row_clues, col_clues, fleet));
    }

    #[test]
    fn test_validate_wrong_fleet() {
        let (solution, row_clues, col_clues, _, _) = make_test_puzzle();
        let wrong_fleet = Fleet { ships: vec![ShipSpec { length: 1, count: 1 }] };
        assert!(!validate_bimaru_solution(solution, row_clues, col_clues, wrong_fleet));
    }

    #[tokio::test]
    async fn test_get_hint_returns_hint() {
        let (_, row_clues, col_clues, fleet, hints) = make_test_puzzle();
        let player_grid = vec![vec![CellValue::Empty; 10]; 10];
        let result = get_bimaru_hint(player_grid, row_clues, col_clues, fleet, hints).await;
        assert!(result.is_some());
    }

    #[tokio::test]
    async fn test_get_hint_empty_grid() {
        let grid: Vec<Vec<CellValue>> = vec![];
        let result = get_bimaru_hint(grid, vec![], vec![], Fleet::standard(), vec![]).await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_check_errors_correct_solution() {
        let (solution, row_clues, col_clues, fleet, hints) = make_test_puzzle();
        let errors = check_bimaru_errors(solution, row_clues, col_clues, fleet, hints).await.unwrap();
        assert!(errors.is_empty());
    }

    #[tokio::test]
    async fn test_check_errors_wrong_cell() {
        let (mut solution, row_clues, col_clues, fleet, hints) = make_test_puzzle();
        let mut flipped = None;
        for r in 0..10 {
            for c in 0..10 {
                if hints[r][c] == HintCell::Empty && solution[r][c] == CellValue::Water {
                    solution[r][c] = CellValue::Ship;
                    flipped = Some((r, c));
                    break;
                }
            }
            if flipped.is_some() { break; }
        }
        let errors = check_bimaru_errors(solution, row_clues, col_clues, fleet, hints).await.unwrap();
        assert!(!errors.is_empty());
        assert!(errors.contains(&flipped.unwrap()));
    }

    #[tokio::test]
    async fn test_check_errors_empty_grid() {
        let grid: Vec<Vec<CellValue>> = vec![];
        let errors = check_bimaru_errors(grid, vec![], vec![], Fleet::standard(), vec![]).await.unwrap();
        assert!(errors.is_empty());
    }
}
