use rand::Rng;

use super::solver;
use super::types::*;

pub fn generate(
    rows: usize,
    cols: usize,
    difficulty: &str,
) -> Option<NonogramSolution> {
    let large = rows > 12 || cols > 12;

    let fill_ratio = if large {
        // Higher fill for large grids → more constrained → line-solvable more often
        match difficulty {
            "easy" => 0.60..0.75,
            "hard" => 0.40..0.50,
            _ => 0.50..0.65,
        }
    } else {
        match difficulty {
            "easy" => 0.55..0.65,
            "hard" => 0.35..0.45,
            _ => 0.45..0.55,
        }
    };

    let max_attempts = if rows >= 20 || cols >= 20 { 2000 } else if large { 500 } else { 200 };
    let mut rng = rand::rng();

    for _ in 0..max_attempts {
        let ratio = rng.random_range(fill_ratio.clone());
        let grid = random_grid(rows, cols, ratio, &mut rng);
        let (row_clues, col_clues) = clues_from_grid(&grid);

        // For large grids, only accept puzzles solvable by line logic alone (fast + guaranteed unique).
        // For small grids, allow backtracking-requiring puzzles if they have unique solutions.
        let unique = if large {
            solver::is_line_solvable(&row_clues, &col_clues, rows, cols)
        } else {
            solver::has_unique_solution(&row_clues, &col_clues, rows, cols)
        };

        if !unique {
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
}
