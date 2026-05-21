use super::solver;
use super::types::*;

pub fn get_hint(
    row_clues: &[usize],
    col_clues: &[usize],
    player_grid: &[Vec<CellValue>],
    hints: &[Vec<HintCell>],
    fleet: &Fleet,
    rows: usize,
    cols: usize,
) -> Option<BimaruHint> {
    // Try constraint propagation first
    if let Some((r, c, value, reason)) =
        solver::find_deduction(row_clues, col_clues, player_grid, hints, rows, cols)
    {
        return Some(BimaruHint {
            row: r,
            col: c,
            value,
            reason,
        });
    }

    // Fallback: solve and reveal a cell from the solution
    if let Some(solution) = solver::solve(row_clues, col_clues, hints, fleet, rows, cols) {
        // Find first cell where player hasn't placed correctly
        for r in 0..rows {
            for c in 0..cols {
                if player_grid[r][c] != solution[r][c] {
                    return Some(BimaruHint {
                        row: r,
                        col: c,
                        value: solution[r][c],
                        reason: "No logical deduction available — revealing from solution"
                            .to_string(),
                    });
                }
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games::bimaru::generator;

    #[test]
    fn test_hint_on_fresh_puzzle() {
        let fleet = Fleet::standard();
        let sol = generator::generate(10, 10, "easy", &fleet)
            .expect("Should generate an easy puzzle");

        // Fresh grid with only hints placed
        let mut player_grid = vec![vec![CellValue::Empty; 10]; 10];
        for r in 0..10 {
            for c in 0..10 {
                match sol.puzzle.hints[r][c] {
                    HintCell::Water => player_grid[r][c] = CellValue::Water,
                    HintCell::Ship => player_grid[r][c] = CellValue::Ship,
                    HintCell::Empty => {}
                }
            }
        }

        let hint = get_hint(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            &player_grid,
            &sol.puzzle.hints,
            &fleet,
            10,
            10,
        );

        assert!(hint.is_some(), "Should produce a hint on a fresh puzzle");
    }
}
