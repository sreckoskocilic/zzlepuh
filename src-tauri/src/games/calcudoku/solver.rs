use std::time::{Duration, Instant};

use super::types::*;

#[cfg(test)]
pub fn solve(puzzle: &CalcudokuPuzzle) -> Option<Vec<Vec<u8>>> {
    solve_internal(puzzle, None, None)
}

pub fn solve_timed(puzzle: &CalcudokuPuzzle, timeout: Duration) -> Option<Vec<Vec<u8>>> {
    solve_internal(puzzle, None, Some(Instant::now() + timeout))
}

#[cfg(test)]
pub fn solve_with_partial(
    puzzle: &CalcudokuPuzzle,
    partial: Option<&Vec<Vec<u8>>>,
) -> Option<Vec<Vec<u8>>> {
    solve_internal(puzzle, partial, None)
}

pub fn solve_with_partial_timed(
    puzzle: &CalcudokuPuzzle,
    partial: Option<&Vec<Vec<u8>>>,
    timeout: Duration,
) -> Option<Vec<Vec<u8>>> {
    solve_internal(puzzle, partial, Some(Instant::now() + timeout))
}

fn solve_internal(
    puzzle: &CalcudokuPuzzle,
    partial: Option<&Vec<Vec<u8>>>,
    deadline: Option<Instant>,
) -> Option<Vec<Vec<u8>>> {
    let n = puzzle.size;
    let mut domains = initial_domains(n);

    if let Some(p) = partial {
        for r in 0..n {
            for c in 0..n {
                if p[r][c] > 0 {
                    domains[r][c] = vec![p[r][c]];
                }
            }
        }
    }

    if !propagate(&mut domains, puzzle) {
        return None;
    }

    if is_solved(&domains) {
        return Some(extract_solution(&domains));
    }

    backtrack(domains, puzzle, deadline)
}

pub fn has_unique_solution(puzzle: &CalcudokuPuzzle) -> bool {
    has_unique_solution_timed(puzzle, Duration::from_secs(5))
}

pub fn has_unique_solution_timed(puzzle: &CalcudokuPuzzle, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    let n = puzzle.size;
    let mut domains = initial_domains(n);

    if !propagate(&mut domains, puzzle) {
        return false;
    }

    if is_solved(&domains) {
        return true;
    }

    let mut count = 0;
    count_backtrack(&domains, puzzle, &mut count, 2, deadline);
    count == 1
}

fn initial_domains(n: usize) -> Vec<Vec<Vec<u8>>> {
    let all: Vec<u8> = (1..=n as u8).collect();
    vec![vec![all; n]; n]
}

fn count_backtrack(
    domains: &[Vec<Vec<u8>>],
    puzzle: &CalcudokuPuzzle,
    count: &mut usize,
    limit: usize,
    deadline: Instant,
) {
    if *count >= limit || Instant::now() >= deadline {
        return;
    }

    let Some((r, c)) = find_best_cell(domains) else {
        *count += 1;
        return;
    };

    for &val in &domains[r][c] {
        let mut d = clone_domains(domains);
        d[r][c] = vec![val];
        if propagate(&mut d, puzzle) {
            if is_solved(&d) {
                *count += 1;
                if *count >= limit {
                    return;
                }
            } else {
                count_backtrack(&d, puzzle, count, limit, deadline);
            }
        }
    }
}

#[allow(clippy::needless_range_loop)]
fn propagate(domains: &mut Vec<Vec<Vec<u8>>>, puzzle: &CalcudokuPuzzle) -> bool {
    let n = puzzle.size;
    loop {
        let snapshot: Vec<Vec<usize>> = domains
            .iter()
            .map(|row| row.iter().map(|d| d.len()).collect())
            .collect();

        for r in 0..n {
            for c in 0..n {
                if domains[r][c].len() == 1 {
                    let val = domains[r][c][0];
                    for c2 in 0..n {
                        if c2 != c {
                            domains[r][c2].retain(|&v| v != val);
                            if domains[r][c2].is_empty() {
                                return false;
                            }
                        }
                    }
                }
            }
        }

        for c in 0..n {
            for r in 0..n {
                if domains[r][c].len() == 1 {
                    let val = domains[r][c][0];
                    for r2 in 0..n {
                        if r2 != r {
                            domains[r2][c].retain(|&v| v != val);
                            if domains[r2][c].is_empty() {
                                return false;
                            }
                        }
                    }
                }
            }
        }

        for r in 0..n {
            for val in 1..=n as u8 {
                let positions: Vec<usize> =
                    (0..n).filter(|&c| domains[r][c].contains(&val)).collect();
                if positions.is_empty() {
                    return false;
                }
                if positions.len() == 1 && domains[r][positions[0]].len() > 1 {
                    domains[r][positions[0]] = vec![val];
                }
            }
        }

        for c in 0..n {
            for val in 1..=n as u8 {
                let positions: Vec<usize> =
                    (0..n).filter(|&r| domains[r][c].contains(&val)).collect();
                if positions.is_empty() {
                    return false;
                }
                if positions.len() == 1 && domains[positions[0]][c].len() > 1 {
                    domains[positions[0]][c] = vec![val];
                }
            }
        }

        for cage in &puzzle.cages {
            if !propagate_cage(domains, cage) {
                return false;
            }
        }

        let current: Vec<Vec<usize>> = domains
            .iter()
            .map(|row| row.iter().map(|d| d.len()).collect())
            .collect();
        if current == snapshot {
            break;
        }
    }
    true
}

fn propagate_cage(domains: &mut Vec<Vec<Vec<u8>>>, cage: &Cage) -> bool {
    let cell_domains: Vec<Vec<u8>> = cage
        .cells
        .iter()
        .map(|&(r, c)| domains[r][c].clone())
        .collect();

    let n = cage.cells.len();
    let mut valid_values: Vec<Vec<u8>> = vec![vec![]; n];
    let mut combo = vec![0u8; n];

    enumerate_combos(
        &cell_domains,
        cage.operation,
        cage.target,
        0,
        &mut combo,
        &mut valid_values,
    );

    for (i, &(r, c)) in cage.cells.iter().enumerate() {
        if valid_values[i].is_empty() {
            return false;
        }
        valid_values[i].sort_unstable();
        valid_values[i].dedup();
        domains[r][c].retain(|v| valid_values[i].contains(v));
        if domains[r][c].is_empty() {
            return false;
        }
    }

    true
}

fn enumerate_combos(
    cell_domains: &[Vec<u8>],
    operation: Operation,
    target: u32,
    idx: usize,
    combo: &mut Vec<u8>,
    valid_values: &mut Vec<Vec<u8>>,
) {
    if idx == cell_domains.len() {
        if check_cage_values(combo, operation, target) {
            for (i, &val) in combo.iter().enumerate() {
                valid_values[i].push(val);
            }
        }
        return;
    }

    for &val in &cell_domains[idx] {
        combo[idx] = val;
        enumerate_combos(cell_domains, operation, target, idx + 1, combo, valid_values);
    }
}

fn backtrack(
    domains: Vec<Vec<Vec<u8>>>,
    puzzle: &CalcudokuPuzzle,
    deadline: Option<Instant>,
) -> Option<Vec<Vec<u8>>> {
    if deadline.is_some_and(|d| Instant::now() >= d) {
        return None;
    }

    let Some((r, c)) = find_best_cell(&domains) else {
        return Some(extract_solution(&domains));
    };

    for &val in &domains[r][c].clone() {
        let mut d = domains.clone();
        d[r][c] = vec![val];
        if propagate(&mut d, puzzle) {
            if let Some(sol) = backtrack(d, puzzle, deadline) {
                return Some(sol);
            }
        }
    }
    None
}

fn find_best_cell(domains: &[Vec<Vec<u8>>]) -> Option<(usize, usize)> {
    let mut best: Option<(usize, usize, usize)> = None;
    for (r, row) in domains.iter().enumerate() {
        for (c, domain) in row.iter().enumerate() {
            if domain.len() > 1 {
                match best {
                    None => best = Some((r, c, domain.len())),
                    Some((_, _, best_len)) if domain.len() < best_len => {
                        best = Some((r, c, domain.len()));
                    }
                    _ => {}
                }
            }
        }
    }
    best.map(|(r, c, _)| (r, c))
}

fn is_solved(domains: &[Vec<Vec<u8>>]) -> bool {
    domains
        .iter()
        .all(|row| row.iter().all(|d| d.len() == 1))
}

fn extract_solution(domains: &[Vec<Vec<u8>>]) -> Vec<Vec<u8>> {
    domains
        .iter()
        .map(|row| row.iter().map(|d| d[0]).collect())
        .collect()
}

fn clone_domains(domains: &[Vec<Vec<u8>>]) -> Vec<Vec<Vec<u8>>> {
    domains.iter().map(|row| row.to_vec()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solve_2x2() {
        let puzzle = CalcudokuPuzzle {
            size: 2,
            cages: vec![
                Cage {
                    cells: vec![(0, 0)],
                    operation: Operation::None,
                    target: 1,
                },
                Cage {
                    cells: vec![(0, 1)],
                    operation: Operation::None,
                    target: 2,
                },
                Cage {
                    cells: vec![(1, 0), (1, 1)],
                    operation: Operation::Add,
                    target: 3,
                },
            ],
            difficulty: "easy".to_string(),
        };
        let sol = solve(&puzzle).unwrap();
        assert_eq!(sol, vec![vec![1, 2], vec![2, 1]]);
        assert!(has_unique_solution(&puzzle));
    }

    #[test]
    fn test_solve_4x4() {
        let puzzle = CalcudokuPuzzle {
            size: 4,
            cages: vec![
                Cage {
                    cells: vec![(0, 0)],
                    operation: Operation::None,
                    target: 1,
                },
                Cage {
                    cells: vec![(0, 1), (0, 2)],
                    operation: Operation::Add,
                    target: 5,
                },
                Cage {
                    cells: vec![(0, 3)],
                    operation: Operation::None,
                    target: 4,
                },
                Cage {
                    cells: vec![(1, 0), (2, 0)],
                    operation: Operation::Add,
                    target: 7,
                },
                Cage {
                    cells: vec![(1, 1), (1, 2)],
                    operation: Operation::Subtract,
                    target: 3,
                },
                Cage {
                    cells: vec![(1, 3), (2, 3)],
                    operation: Operation::Add,
                    target: 5,
                },
                Cage {
                    cells: vec![(2, 1)],
                    operation: Operation::None,
                    target: 1,
                },
                Cage {
                    cells: vec![(2, 2), (3, 2)],
                    operation: Operation::Divide,
                    target: 2,
                },
                Cage {
                    cells: vec![(3, 0), (3, 1)],
                    operation: Operation::Subtract,
                    target: 1,
                },
                Cage {
                    cells: vec![(3, 3)],
                    operation: Operation::None,
                    target: 1,
                },
            ],
            difficulty: "easy".to_string(),
        };
        let sol = solve(&puzzle);
        assert!(sol.is_some());
        assert!(has_unique_solution(&puzzle));
    }

    #[test]
    fn test_non_unique() {
        let puzzle = CalcudokuPuzzle {
            size: 2,
            cages: vec![Cage {
                cells: vec![(0, 0), (0, 1), (1, 0), (1, 1)],
                operation: Operation::Add,
                target: 6,
            }],
            difficulty: "easy".to_string(),
        };
        assert!(!has_unique_solution(&puzzle));
    }

    #[test]
    fn test_impossible_puzzle() {
        let puzzle = CalcudokuPuzzle {
            size: 2,
            cages: vec![
                Cage {
                    cells: vec![(0, 0), (0, 1)],
                    operation: Operation::Add,
                    target: 10,
                },
                Cage {
                    cells: vec![(1, 0), (1, 1)],
                    operation: Operation::Add,
                    target: 3,
                },
            ],
            difficulty: "easy".to_string(),
        };
        assert!(solve(&puzzle).is_none());
        assert!(!has_unique_solution(&puzzle));
    }

    #[test]
    fn test_solve_with_partial() {
        let puzzle = CalcudokuPuzzle {
            size: 2,
            cages: vec![
                Cage {
                    cells: vec![(0, 0), (0, 1)],
                    operation: Operation::Add,
                    target: 3,
                },
                Cage {
                    cells: vec![(1, 0), (1, 1)],
                    operation: Operation::Add,
                    target: 3,
                },
            ],
            difficulty: "easy".to_string(),
        };
        let partial = vec![vec![1, 0], vec![0, 0]];
        let sol = solve_with_partial(&puzzle, Some(&partial)).unwrap();
        assert_eq!(sol, vec![vec![1, 2], vec![2, 1]]);
    }
}
