use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Operation {
    Add,
    Subtract,
    Multiply,
    Divide,
    None,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cage {
    pub cells: Vec<(usize, usize)>,
    pub operation: Operation,
    pub target: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CalcudokuPuzzle {
    pub size: usize,
    pub cages: Vec<Cage>,
    pub difficulty: String,
}

#[derive(Clone, Debug)]
pub struct CalcudokuSolution {
    pub puzzle: CalcudokuPuzzle,
    #[allow(dead_code)]
    pub solution: Vec<Vec<u8>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CalcudokuHint {
    pub row: usize,
    pub col: usize,
    pub value: u8,
    pub reason: String,
}

pub fn check_cage_values(values: &[u8], operation: Operation, target: u32) -> bool {
    match operation {
        Operation::None => values.len() == 1 && values[0] as u32 == target,
        Operation::Add => values.iter().map(|&v| v as u32).sum::<u32>() == target,
        Operation::Multiply => values
            .iter()
            .try_fold(1u32, |acc, &v| acc.checked_mul(v as u32))
            .is_some_and(|product| product == target),
        Operation::Subtract => {
            if values.len() != 2 {
                return false;
            }
            let diff = (values[0] as i32 - values[1] as i32).unsigned_abs();
            diff == target
        }
        Operation::Divide => {
            if values.len() != 2 {
                return false;
            }
            let (a, b) = (values[0] as u32, values[1] as u32);
            if a == 0 || b == 0 {
                return false;
            }
            (a >= b && a / b == target && a % b == 0)
                || (b >= a && b / a == target && b % a == 0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert!(check_cage_values(&[2, 3], Operation::Add, 5));
        assert!(check_cage_values(&[1, 2, 3], Operation::Add, 6));
        assert!(!check_cage_values(&[2, 3], Operation::Add, 6));
    }

    #[test]
    fn test_subtract() {
        assert!(check_cage_values(&[5, 2], Operation::Subtract, 3));
        assert!(check_cage_values(&[2, 5], Operation::Subtract, 3));
        assert!(!check_cage_values(&[2, 5], Operation::Subtract, 2));
    }

    #[test]
    fn test_multiply() {
        assert!(check_cage_values(&[2, 3], Operation::Multiply, 6));
        assert!(check_cage_values(&[1, 2, 3], Operation::Multiply, 6));
        assert!(!check_cage_values(&[2, 3], Operation::Multiply, 5));
    }

    #[test]
    fn test_divide() {
        assert!(check_cage_values(&[6, 2], Operation::Divide, 3));
        assert!(check_cage_values(&[2, 6], Operation::Divide, 3));
        assert!(!check_cage_values(&[5, 2], Operation::Divide, 2));
    }

    #[test]
    fn test_none() {
        assert!(check_cage_values(&[5], Operation::None, 5));
        assert!(!check_cage_values(&[5], Operation::None, 3));
    }
}
