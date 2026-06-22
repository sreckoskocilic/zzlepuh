use rand::Rng;

use super::solver;
use super::types::*;

/// Above this side length, full uniqueness checking is too slow; switch to the
/// hill-climbing repair path instead.
const LARGE_GRID_THRESHOLD: usize = 12;
/// Random-grid attempts for the small-grid (full uniqueness) path.
const SMALL_GRID_ATTEMPTS: usize = 200;
/// Fresh random-grid restarts for the large-grid hill-climbing path.
const LARGE_OUTER_ATTEMPTS: usize = 80;
/// Consecutive rejected flips before abandoning a hill-climb restart.
const LARGE_STALE_LIMIT: usize = 50;

pub fn generate(
    rows: usize,
    cols: usize,
    difficulty: &str,
) -> Option<NonogramSolution> {
    if rows > LARGE_GRID_THRESHOLD || cols > LARGE_GRID_THRESHOLD {
        generate_large(rows, cols, difficulty)
    } else {
        generate_small(rows, cols, difficulty)
    }
}

/// Recompute the row and column clues touched by a flip at `(fr, fc)`.
fn recompute_clues(
    grid: &[Vec<bool>],
    fr: usize,
    fc: usize,
    rows: usize,
    row_clues: &mut [Vec<usize>],
    col_clues: &mut [Vec<usize>],
) {
    row_clues[fr] = clues_from_line(&grid[fr]);
    let col_line: Vec<bool> = (0..rows).map(|r| grid[r][fc]).collect();
    col_clues[fc] = clues_from_line(&col_line);
}

/// Small grids: random + full uniqueness check. Fast enough.
fn generate_small(rows: usize, cols: usize, difficulty: &str) -> Option<NonogramSolution> {
    let fill_ratio = match difficulty {
        "easy" => 0.55..0.65,
        "hard" => 0.35..0.45,
        _ => 0.45..0.55,
    };

    let mut rng = rand::rng();

    for _ in 0..SMALL_GRID_ATTEMPTS {
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
            title: None,
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
    let max_flips = total / 3;
    let mut rng = rand::rng();

    for _ in 0..LARGE_OUTER_ATTEMPTS {
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
            recompute_clues(&grid, fr, fc, rows, &mut row_clues, &mut col_clues);

            let (ok, determined) = solver::propagation_progress(&row_clues, &col_clues, rows, cols);

            if !ok || determined < best {
                // Undo the flip and restore the clues it touched.
                grid[fr][fc] = !grid[fr][fc];
                recompute_clues(&grid, fr, fc, rows, &mut row_clues, &mut col_clues);
                stale += 1;
                if stale > LARGE_STALE_LIMIT {
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
            title: None,
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
            // Large+easy is dense; `avg_clues <= 2.0` is unreachable, so accept
            // high fill or generation always returns None.
            let is_large = rows > LARGE_GRID_THRESHOLD || cols > LARGE_GRID_THRESHOLD;
            let filled: usize = row_clues.iter().flatten().sum();
            let fill_fraction = filled as f64 / (rows * cols) as f64;
            has_full_line || has_zero_line || avg_clues <= 2.0
                || (is_large && fill_fraction >= 0.5)
        }
        "hard" => avg_clues >= 2.5,
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Full validity of a generated nonogram: the published clues are exactly the
    /// clues derived from the solution, and the puzzle has a unique solution.
    fn assert_valid_nonogram(sol: &NonogramSolution, rows: usize, cols: usize) {
        let (row_clues, col_clues) = clues_from_grid(&sol.solution);
        assert_eq!(row_clues, sol.puzzle.row_clues, "row clues on {}x{}", rows, cols);
        assert_eq!(col_clues, sol.puzzle.col_clues, "col clues on {}x{}", rows, cols);
        assert!(
            solver::has_unique_solution(&sol.puzzle.row_clues, &sol.puzzle.col_clues, rows, cols),
            "puzzle not unique on {}x{}",
            rows, cols
        );
    }

    #[test]
    fn test_generate_valid_across_sizes() {
        // Small-grid hard puzzles aren't always generatable (the difficulty filter
        // can reject every attempt), so stick to size×difficulty combos the
        // generator reliably produces — the goal here is oracle strength per size.
        for (n, diff) in [
            (5, "easy"),
            (5, "medium"),
            (10, "medium"),
            (15, "medium"),
            (20, "medium"),
            (25, "medium"),
        ] {
            let sol = generate(n, n, diff).unwrap_or_else(|| panic!("generate {}x{} {}", n, n, diff));
            assert_valid_nonogram(&sol, n, n);
        }
    }

    /// 25×25 is the max UI size; prove every difficulty generates (not None).
    #[test]
    fn test_generate_25x25_max_size_reliable() {
        for diff in ["easy", "medium", "hard"] {
            for attempt in 0..5 {
                let sol = generate(25, 25, diff)
                    .unwrap_or_else(|| panic!("generate 25x25 {} (attempt {})", diff, attempt));
                assert_valid_nonogram(&sol, 25, 25);
            }
        }
    }

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
    fn test_generate_large_is_line_solvable() {
        let sol = generate(15, 15, "medium").unwrap();
        assert!(solver::is_line_solvable(
            &sol.puzzle.row_clues,
            &sol.puzzle.col_clues,
            15,
            15
        ));
    }

}


