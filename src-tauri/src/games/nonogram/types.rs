use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CellState {
    Empty,
    Filled,
    Marked,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NonogramPuzzle {
    pub rows: usize,
    pub cols: usize,
    pub row_clues: Vec<Vec<usize>>,
    pub col_clues: Vec<Vec<usize>>,
    pub difficulty: String,
    /// Picture title — only attached on the win reveal, never during play.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

#[derive(Clone, Debug)]
pub struct NonogramSolution {
    pub puzzle: NonogramPuzzle,
    #[allow(dead_code)]
    pub solution: Vec<Vec<bool>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NonogramHint {
    pub row: usize,
    pub col: usize,
    pub filled: bool,
    pub reason: String,
}

pub fn clues_from_line(line: &[bool]) -> Vec<usize> {
    let mut clues = Vec::new();
    let mut run = 0;
    for &cell in line {
        if cell {
            run += 1;
        } else if run > 0 {
            clues.push(run);
            run = 0;
        }
    }
    if run > 0 {
        clues.push(run);
    }
    if clues.is_empty() {
        clues.push(0);
    }
    clues
}

pub fn clues_from_grid(grid: &[Vec<bool>]) -> (Vec<Vec<usize>>, Vec<Vec<usize>>) {
    let rows = grid.len();
    let cols = if rows > 0 { grid[0].len() } else { 0 };

    let row_clues: Vec<Vec<usize>> = grid.iter().map(|row| clues_from_line(row)).collect();

    let col_clues: Vec<Vec<usize>> = (0..cols)
        .map(|c| {
            let col: Vec<bool> = (0..rows).map(|r| grid[r][c]).collect();
            clues_from_line(&col)
        })
        .collect();

    (row_clues, col_clues)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clues_from_line_basic() {
        assert_eq!(clues_from_line(&[true, true, false, true]), vec![2, 1]);
    }

    #[test]
    fn test_clues_from_line_empty() {
        assert_eq!(clues_from_line(&[false, false, false]), vec![0]);
    }

    #[test]
    fn test_clues_from_line_full() {
        assert_eq!(clues_from_line(&[true, true, true]), vec![3]);
    }

    #[test]
    fn test_clues_from_line_alternating() {
        assert_eq!(
            clues_from_line(&[true, false, true, false, true]),
            vec![1, 1, 1]
        );
    }

    #[test]
    fn test_clues_from_grid() {
        let grid = vec![
            vec![true, false, true],
            vec![false, true, false],
            vec![true, true, true],
        ];
        let (row_clues, col_clues) = clues_from_grid(&grid);
        assert_eq!(row_clues, vec![vec![1, 1], vec![1], vec![3]]);
        assert_eq!(col_clues, vec![vec![1, 1], vec![2], vec![1, 1]]);
    }
}
