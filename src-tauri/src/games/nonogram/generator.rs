use rand::Rng;

use super::solver;
use super::types::*;

pub fn generate(
    rows: usize,
    cols: usize,
    difficulty: &str,
) -> Option<NonogramSolution> {
    if rows > 12 || cols > 12 {
        generate_large(rows, cols, difficulty)
    } else {
        generate_small(rows, cols, difficulty)
    }
}

/// Small grids: random + full uniqueness check. Fast enough.
fn generate_small(rows: usize, cols: usize, difficulty: &str) -> Option<NonogramSolution> {
    let fill_ratio = match difficulty {
        "easy" => 0.55..0.65,
        "hard" => 0.35..0.45,
        _ => 0.45..0.55,
    };

    let mut rng = rand::rng();

    for _ in 0..200 {
        let ratio = rng.random_range(fill_ratio.clone());
        let grid = random_grid(rows, cols, ratio, &mut rng);
        let (row_clues, col_clues) = clues_from_grid(&grid);

        if !solver::has_unique_solution(&row_clues, &col_clues, rows, cols) {
            continue;
        }

        if !difficulty_check(&row_clues, &col_clues, rows, cols, difficulty) {
            continue;
        }

        let puzzle = NonogramPuzzle {
            rows,
            cols,
            row_clues,
            col_clues,
            difficulty: difficulty.to_string(),
        };

        return Some(NonogramSolution {
            puzzle,
            solution: grid,
        });
    }

    None
}

/// Large grids: hill-climbing repair. Generate random grid, then flip cells
/// near the determined/undetermined boundary to push toward line-solvability.
fn generate_large(rows: usize, cols: usize, difficulty: &str) -> Option<NonogramSolution> {
    let fill_ratio = match difficulty {
        "easy" => 0.58..0.70,
        "hard" => 0.48..0.58,
        _ => 0.50..0.62,
    };

    let total = rows * cols;
    let max_outer = 80;
    let max_flips = total / 3;
    let mut rng = rand::rng();

    for _ in 0..max_outer {
        let ratio = rng.random_range(fill_ratio.clone());
        let mut grid = random_grid(rows, cols, ratio, &mut rng);
        let mut row_clues;
        let mut col_clues;
        (row_clues, col_clues) = clues_from_grid(&grid);

        let (ok, mut best) = solver::propagation_progress(&row_clues, &col_clues, rows, cols);
        if !ok {
            continue;
        }
        if best == total {
            if difficulty_check(&row_clues, &col_clues, rows, cols, difficulty) {
                return Some(make_solution(grid, row_clues, col_clues, rows, cols, difficulty));
            }
            continue;
        }

        // Quick reject: if first propagation determines very little, skip
        if best < total / 4 {
            continue;
        }

        let mut stale = 0;
        for _ in 0..max_flips {
            let (fr, fc) = pick_flip_cell(rows, cols, &mut rng);
            grid[fr][fc] = !grid[fr][fc];

            // Only update affected row and column clues
            row_clues[fr] = clues_from_line(&grid[fr]);
            let col_line: Vec<bool> = (0..rows).map(|r| grid[r][fc]).collect();
            col_clues[fc] = clues_from_line(&col_line);

            let (ok, determined) = solver::propagation_progress(&row_clues, &col_clues, rows, cols);

            if !ok || determined < best {
                // Undo: flip back and restore clues
                grid[fr][fc] = !grid[fr][fc];
                row_clues[fr] = clues_from_line(&grid[fr]);
                let col_line: Vec<bool> = (0..rows).map(|r| grid[r][fc]).collect();
                col_clues[fc] = clues_from_line(&col_line);
                stale += 1;
                if stale > 50 {
                    break;
                }
                continue;
            }

            stale = 0;
            best = determined;

            if best == total {
                if difficulty_check(&row_clues, &col_clues, rows, cols, difficulty) {
                    return Some(make_solution(grid, row_clues, col_clues, rows, cols, difficulty));
                }
                break;
            }
        }
    }

    None
}

fn pick_flip_cell(rows: usize, cols: usize, rng: &mut impl Rng) -> (usize, usize) {
    (rng.random_range(0..rows), rng.random_range(0..cols))
}

fn make_solution(
    grid: Vec<Vec<bool>>,
    row_clues: Vec<Vec<usize>>,
    col_clues: Vec<Vec<usize>>,
    rows: usize,
    cols: usize,
    difficulty: &str,
) -> NonogramSolution {
    NonogramSolution {
        puzzle: NonogramPuzzle {
            rows,
            cols,
            row_clues,
            col_clues,
            difficulty: difficulty.to_string(),
        },
        solution: grid,
    }
}

fn random_grid(rows: usize, cols: usize, fill_ratio: f64, rng: &mut impl Rng) -> Vec<Vec<bool>> {
    (0..rows)
        .map(|_| (0..cols).map(|_| rng.random_bool(fill_ratio)).collect())
        .collect()
}

fn difficulty_check(
    row_clues: &[Vec<usize>],
    col_clues: &[Vec<usize>],
    rows: usize,
    cols: usize,
    difficulty: &str,
) -> bool {
    let total_clue_count: usize = row_clues.iter().chain(col_clues.iter())
        .map(|c| c.len())
        .sum();

    let total_lines = rows + cols;
    let avg_clues = total_clue_count as f64 / total_lines as f64;

    match difficulty {
        "easy" => {
            let has_full_line = row_clues.iter().any(|c| c == &[cols])
                || col_clues.iter().any(|c| c == &[rows]);
            let has_zero_line = row_clues.iter().any(|c| c == &[0])
                || col_clues.iter().any(|c| c == &[0]);
            has_full_line || has_zero_line || avg_clues <= 2.0
        }
        "hard" => avg_clues >= 2.5,
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_5x5_easy() {
        let sol = generate(5, 5, "easy");
        assert!(sol.is_some());
        let sol = sol.unwrap();
        assert_eq!(sol.puzzle.rows, 5);
        assert_eq!(sol.puzzle.cols, 5);
        assert_eq!(sol.puzzle.difficulty, "easy");
    }

    #[test]
    fn test_generate_5x5_medium() {
        let sol = generate(5, 5, "medium");
        assert!(sol.is_some());
    }

    #[test]
    fn test_generate_10x10() {
        let sol = generate(10, 10, "medium");
        assert!(sol.is_some());
        let sol = sol.unwrap();
        let (row_clues, col_clues) = clues_from_grid(&sol.solution);
        assert_eq!(row_clues, sol.puzzle.row_clues);
        assert_eq!(col_clues, sol.puzzle.col_clues);
    }

    #[test]
    fn test_generate_has_unique_solution() {
        let sol = generate(5, 5, "easy").unwrap();
        assert!(solver::has_unique_solution(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            5,
            5
        ));
    }

    #[test]
    fn test_generate_15x15() {
        let sol = generate(15, 15, "medium");
        assert!(sol.is_some());
    }

    #[test]
    fn test_generate_20x20() {
        let sol = generate(20, 20, "medium");
        assert!(sol.is_some());
    }

    #[test]
    fn test_generate_25x25_easy() {
        let sol = generate(25, 25, "easy");
        assert!(sol.is_some());
    }

    #[test]
    fn test_generate_25x25_hard() {
        let sol = generate(25, 25, "hard");
        assert!(sol.is_some());
    }

    #[test]
    fn test_generate_large_is_line_solvable() {
        let sol = generate(15, 15, "medium").unwrap();
        assert!(solver::is_line_solvable(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            15,
            15
        ));
    }

    #[test]
    fn test_generate_25x25_medium() {
        let sol = generate(25, 25, "medium");
        assert!(sol.is_some());
    }
}
