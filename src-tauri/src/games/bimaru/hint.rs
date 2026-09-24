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
    let solution = solver::solve(row_clues, col_clues, hints, fleet, rows, cols);

    // Propagation from a wrong-but-consistent-looking player cell deduces falsehoods,
    // so only trust a deduction when every filled cell agrees with the solution.
    let consistent = solution.as_ref().map_or(true, |sol| {
        (0..rows).all(|r| {
            (0..cols).all(|c| player_grid[r][c] == CellValue::Empty || player_grid[r][c] == sol[r][c])
        })
    });
    if consistent {
        if let Some((r, c, value, reason)) =
            solver::find_deduction(row_clues, col_clues, player_grid, hints, rows, cols)
        {
            if solution.as_ref().map_or(true, |sol| sol[r][c] == value) {
                return Some(BimaruHint {
                    row: r,
                    col: c,
                    value,
                    reason,
                    is_correction: false,
                });
            }
        }
    }

    if let Some(solution) = solution {
        let mut wrong_filled: Option<(usize, usize)> = None;
        for r in 0..rows {
            for c in 0..cols {
                if player_grid[r][c] == solution[r][c] {
                    continue;
                }
                if player_grid[r][c] == CellValue::Empty {
                    return Some(BimaruHint {
                        row: r,
                        col: c,
                        value: solution[r][c],
                        reason: "No logical deduction available — revealing from solution"
                            .to_string(),
                        is_correction: false,
                    });
                }
                if wrong_filled.is_none() {
                    wrong_filled = Some((r, c));
                }
            }
        }
        if let Some((r, c)) = wrong_filled {
            return Some(BimaruHint {
                row: r,
                col: c,
                value: solution[r][c],
                reason: "This cell is wrong — correcting it".to_string(),
                is_correction: true,
            });
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

        let h = hint.expect("Should produce a hint on a fresh puzzle");
        assert_eq!(h.value, sol.solution[h.row][h.col], "hint value must match solution");
    }

    #[test]
    fn test_hint_ignores_deduction_from_wrong_but_consistent_cell() {
        let parse = |rows: &[&str]| -> Vec<Vec<CellValue>> {
            rows.iter()
                .map(|r| {
                    r.chars()
                        .map(|ch| match ch {
                            'S' => CellValue::Ship,
                            '~' => CellValue::Water,
                            _ => CellValue::Empty,
                        })
                        .collect()
                })
                .collect()
        };
        let row_clues = [2, 2, 1, 1, 1, 3];
        let col_clues = [1, 2, 2, 0, 4, 1];
        let hints = vec![vec![HintCell::Empty; 6]; 6];
        let fleet = Fleet::for_size(6, 6);
        let truth = parse(&["~S~~S~", "~S~~S~", "~~~~S~", "~~S~~~", "S~~~~~", "~~S~SS"]);
        // Only error: (4,4) is Ship, truth is Water. It breaks no count or diagonal rule.
        let player = parse(&[".S.~..", "~S.~S.", "~...S~", "~..~~~", "...~S.", "~~.~S."]);

        let h = get_hint(&row_clues, &col_clues, &player, &hints, &fleet, 6, 6)
            .expect("Should produce a hint");
        assert_eq!(h.value, truth[h.row][h.col], "hint at ({},{}) contradicts the solution", h.row, h.col);
    }
}
