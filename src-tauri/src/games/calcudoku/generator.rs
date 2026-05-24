use rand::Rng;

use super::solver;
use super::types::*;

pub fn generate(size: usize, difficulty: &str) -> Option<CalcudokuSolution> {
    let mut rng = rand::rng();

    for _ in 0..50 {
        let Some(grid) = generate_latin_square(size, &mut rng) else {
            continue;
        };

        for _ in 0..10 {
            let cages = generate_cages(size, &grid, difficulty, &mut rng);
            let puzzle = CalcudokuPuzzle {
                size,
                cages,
                difficulty: difficulty.to_string(),
            };

            if solver::has_unique_solution(&puzzle) {
                return Some(CalcudokuSolution {
                    puzzle,
                    solution: grid.clone(),
                });
            }
        }
    }
    None
}

fn generate_latin_square(size: usize, rng: &mut impl Rng) -> Option<Vec<Vec<u8>>> {
    let mut grid = vec![vec![0u8; size]; size];
    if fill_latin(size, &mut grid, 0, 0, rng) {
        Some(grid)
    } else {
        None
    }
}

fn fill_latin(
    size: usize,
    grid: &mut Vec<Vec<u8>>,
    row: usize,
    col: usize,
    rng: &mut impl Rng,
) -> bool {
    if row == size {
        return true;
    }
    let (nr, nc) = if col + 1 == size {
        (row + 1, 0)
    } else {
        (row, col + 1)
    };

    let mut values: Vec<u8> = (1..=size as u8).collect();
    for i in (1..values.len()).rev() {
        let j = rng.random_range(0..=i);
        values.swap(i, j);
    }

    for val in values {
        if grid[row][..col].contains(&val) {
            continue;
        }
        if (0..row).any(|r| grid[r][col] == val) {
            continue;
        }
        grid[row][col] = val;
        if fill_latin(size, grid, nr, nc, rng) {
            return true;
        }
    }
    grid[row][col] = 0;
    false
}

fn generate_cages(
    size: usize,
    grid: &[Vec<u8>],
    difficulty: &str,
    rng: &mut impl Rng,
) -> Vec<Cage> {
    let mut used = vec![vec![false; size]; size];
    let mut cages = Vec::new();

    let (max_cage, single_prob): (usize, f64) = match difficulty {
        "easy" => (2, 0.3),
        "hard" => (4, 0.0),
        _ => (3, 0.1),
    };

    let mut cells: Vec<(usize, usize)> = (0..size)
        .flat_map(|r| (0..size).map(move |c| (r, c)))
        .collect();
    for i in (1..cells.len()).rev() {
        let j = rng.random_range(0..=i);
        cells.swap(i, j);
    }

    for (r, c) in cells {
        if used[r][c] {
            continue;
        }

        let mut cage_cells = vec![(r, c)];
        used[r][c] = true;

        if rng.random_bool(single_prob) {
            let values: Vec<u8> = cage_cells.iter().map(|&(r, c)| grid[r][c]).collect();
            let (operation, target) = assign_operation(&values, difficulty, rng);
            cages.push(Cage {
                cells: cage_cells,
                operation,
                target,
            });
            continue;
        }

        let target_size = rng.random_range(2..=max_cage);

        while cage_cells.len() < target_size {
            let mut neighbors = Vec::new();
            for &(cr, cc) in &cage_cells {
                for (dr, dc) in [(0i32, 1i32), (0, -1), (1, 0), (-1, 0)] {
                    let nr = cr as i32 + dr;
                    let nc = cc as i32 + dc;
                    if nr >= 0 && nr < size as i32 && nc >= 0 && nc < size as i32 {
                        let (nr, nc) = (nr as usize, nc as usize);
                        if !used[nr][nc] && !cage_cells.contains(&(nr, nc)) {
                            neighbors.push((nr, nc));
                        }
                    }
                }
            }
            neighbors.sort_unstable();
            neighbors.dedup();

            if neighbors.is_empty() {
                break;
            }

            let idx = rng.random_range(0..neighbors.len());
            let (nr, nc) = neighbors[idx];
            cage_cells.push((nr, nc));
            used[nr][nc] = true;
        }

        let values: Vec<u8> = cage_cells.iter().map(|&(r, c)| grid[r][c]).collect();
        let (operation, target) = assign_operation(&values, difficulty, rng);
        cages.push(Cage {
            cells: cage_cells,
            operation,
            target,
        });
    }

    cages
}

fn assign_operation(
    values: &[u8],
    difficulty: &str,
    rng: &mut impl Rng,
) -> (Operation, u32) {
    if values.len() == 1 {
        return (Operation::None, values[0] as u32);
    }

    let mut candidates: Vec<(Operation, u32)> = Vec::new();

    let sum: u32 = values.iter().map(|&v| v as u32).sum();
    candidates.push((Operation::Add, sum));

    let product: u32 = values.iter().map(|&v| v as u32).product();
    candidates.push((Operation::Multiply, product));

    if values.len() == 2 {
        let (a, b) = (values[0], values[1]);
        let (max_v, min_v) = if a >= b { (a, b) } else { (b, a) };

        candidates.push((Operation::Subtract, (max_v - min_v) as u32));

        if min_v > 0 && max_v % min_v == 0 {
            candidates.push((Operation::Divide, (max_v / min_v) as u32));
        }
    }

    let filtered: Vec<(Operation, u32)> = if difficulty == "easy" {
        candidates
            .iter()
            .filter(|(op, _)| {
                matches!(op, Operation::Add | Operation::Subtract | Operation::None)
            })
            .copied()
            .collect()
    } else {
        candidates
    };

    let choices = if filtered.is_empty() {
        vec![(Operation::Add, sum)]
    } else {
        filtered
    };

    let idx = rng.random_range(0..choices.len());
    choices[idx]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_4x4_easy() {
        let sol = generate(4, "easy");
        assert!(sol.is_some());
        let sol = sol.unwrap();
        assert_eq!(sol.puzzle.size, 4);
        assert_eq!(sol.solution.len(), 4);
    }

    #[test]
    fn test_generate_4x4_medium() {
        let sol = generate(4, "medium");
        assert!(sol.is_some());
    }

    #[test]
    fn test_generate_4x4_hard() {
        let sol = generate(4, "hard");
        assert!(sol.is_some());
    }

    #[test]
    fn test_generate_6x6() {
        let sol = generate(6, "medium");
        assert!(sol.is_some());
        let sol = sol.unwrap();
        assert_eq!(sol.puzzle.size, 6);
        assert!(solver::has_unique_solution(&sol.puzzle));
    }

    #[test]
    fn test_generate_9x9() {
        let sol = generate(9, "easy");
        assert!(sol.is_some());
    }

    #[test]
    fn test_latin_square_valid() {
        let sol = generate(6, "medium").unwrap();
        let grid = &sol.solution;
        let n = sol.puzzle.size;
        for r in 0..n {
            let mut seen = vec![false; n + 1];
            for c in 0..n {
                let v = grid[r][c] as usize;
                assert!(v >= 1 && v <= n);
                assert!(!seen[v]);
                seen[v] = true;
            }
        }
        for c in 0..n {
            let mut seen = vec![false; n + 1];
            for r in 0..n {
                let v = grid[r][c] as usize;
                assert!(!seen[v]);
                seen[v] = true;
            }
        }
    }

    #[test]
    fn test_generate_5x5() {
        let sol = generate(5, "medium");
        assert!(sol.is_some());
        assert_eq!(sol.unwrap().puzzle.size, 5);
    }

    #[test]
    fn test_generate_7x7() {
        let sol = generate(7, "easy");
        assert!(sol.is_some());
        assert_eq!(sol.unwrap().puzzle.size, 7);
    }

    #[test]
    fn test_generate_8x8() {
        let sol = generate(8, "medium");
        assert!(sol.is_some());
    }

    #[test]
    fn test_cages_contiguous() {
        let sol = generate(6, "hard").unwrap();
        for cage in &sol.puzzle.cages {
            if cage.cells.len() <= 1 {
                continue;
            }
            for i in 1..cage.cells.len() {
                let (r, c) = cage.cells[i];
                let connected = cage.cells[..i].iter().any(|&(pr, pc)| {
                    (r == pr && (c as i32 - pc as i32).abs() == 1)
                        || (c == pc && (r as i32 - pr as i32).abs() == 1)
                });
                assert!(connected, "cage cells must be contiguous");
            }
        }
    }

    #[test]
    fn test_cage_operations_match_values() {
        let sol = generate(6, "medium").unwrap();
        for cage in &sol.puzzle.cages {
            let values: Vec<u8> = cage.cells.iter().map(|&(r, c)| sol.solution[r][c]).collect();
            assert!(
                check_cage_values(&values, cage.operation, cage.target),
                "cage {:?} with values {:?} should satisfy op {:?} target {}",
                cage.cells,
                values,
                cage.operation,
                cage.target
            );
        }
    }

    #[test]
    fn test_easy_no_multiply_divide() {
        let sol = generate(6, "easy").unwrap();
        for cage in &sol.puzzle.cages {
            assert!(
                !matches!(cage.operation, Operation::Multiply | Operation::Divide),
                "easy difficulty should not use multiply/divide"
            );
        }
    }

    #[test]
    fn test_cages_cover_all_cells() {
        let sol = generate(6, "medium").unwrap();
        let n = sol.puzzle.size;
        let mut covered = vec![vec![false; n]; n];
        for cage in &sol.puzzle.cages {
            for &(r, c) in &cage.cells {
                assert!(!covered[r][c]);
                covered[r][c] = true;
            }
        }
        assert!(covered.iter().all(|row| row.iter().all(|&c| c)));
    }
}
