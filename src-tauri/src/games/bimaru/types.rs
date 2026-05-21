use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CellValue {
    Empty,
    Water,
    Ship,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HintCell {
    Empty,
    Water,
    Ship,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ShipSpec {
    pub length: usize,
    pub count: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Fleet {
    pub ships: Vec<ShipSpec>,
}

impl Fleet {
    pub fn standard() -> Self {
        Fleet {
            ships: vec![
                ShipSpec { length: 4, count: 1 },
                ShipSpec { length: 3, count: 2 },
                ShipSpec { length: 2, count: 3 },
                ShipSpec { length: 1, count: 4 },
            ],
        }
    }

    pub fn for_size(rows: usize, cols: usize) -> Self {
        let size = rows.min(cols);
        if size <= 6 {
            Fleet {
                ships: vec![
                    ShipSpec { length: 3, count: 1 },
                    ShipSpec { length: 2, count: 2 },
                    ShipSpec { length: 1, count: 3 },
                ],
            }
        } else if size <= 8 {
            Fleet {
                ships: vec![
                    ShipSpec { length: 4, count: 1 },
                    ShipSpec { length: 3, count: 1 },
                    ShipSpec { length: 2, count: 2 },
                    ShipSpec { length: 1, count: 3 },
                ],
            }
        } else if size <= 10 {
            Fleet::standard()
        } else {
            Fleet {
                ships: vec![
                    ShipSpec { length: 5, count: 1 },
                    ShipSpec { length: 4, count: 1 },
                    ShipSpec { length: 3, count: 2 },
                    ShipSpec { length: 2, count: 3 },
                    ShipSpec { length: 1, count: 4 },
                ],
            }
        }
    }

    #[allow(dead_code)]
    pub fn total_cells(&self) -> usize {
        self.ships.iter().map(|s| s.length * s.count).sum()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BimaruPuzzle {
    pub rows: usize,
    pub cols: usize,
    pub row_clues: Vec<usize>,
    pub col_clues: Vec<usize>,
    pub hints: Vec<Vec<HintCell>>,
    pub fleet: Fleet,
    pub difficulty: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BimaruSolution {
    pub puzzle: BimaruPuzzle,
    pub solution: Vec<Vec<CellValue>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BimaruHint {
    pub row: usize,
    pub col: usize,
    pub value: CellValue,
    pub reason: String,
}

#[derive(Clone, Debug)]
pub struct PlacedShip {
    pub row: usize,
    pub col: usize,
    pub length: usize,
    pub horizontal: bool,
}

impl PlacedShip {
    pub fn cells(&self) -> Vec<(usize, usize)> {
        (0..self.length)
            .map(|i| {
                if self.horizontal {
                    (self.row, self.col + i)
                } else {
                    (self.row + i, self.col)
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_placed_ship_cells_horizontal() {
        let ship = PlacedShip { row: 2, col: 3, length: 4, horizontal: true };
        assert_eq!(ship.cells(), vec![(2, 3), (2, 4), (2, 5), (2, 6)]);
    }

    #[test]
    fn test_placed_ship_cells_vertical() {
        let ship = PlacedShip { row: 1, col: 5, length: 3, horizontal: false };
        assert_eq!(ship.cells(), vec![(1, 5), (2, 5), (3, 5)]);
    }

    #[test]
    fn test_placed_ship_cells_single() {
        let ship = PlacedShip { row: 0, col: 0, length: 1, horizontal: true };
        assert_eq!(ship.cells(), vec![(0, 0)]);
    }

    #[test]
    fn test_fleet_standard_total() {
        let fleet = Fleet::standard();
        assert_eq!(fleet.total_cells(), 4 + 6 + 6 + 4);
    }

    #[test]
    fn test_fleet_for_size_small() {
        let fleet = Fleet::for_size(6, 6);
        assert_eq!(fleet.ships.len(), 3);
        assert_eq!(fleet.total_cells(), 3 + 4 + 3);
    }

    #[test]
    fn test_fleet_for_size_medium() {
        let fleet = Fleet::for_size(8, 8);
        assert_eq!(fleet.ships.len(), 4);
    }

    #[test]
    fn test_fleet_for_size_large() {
        let fleet = Fleet::for_size(10, 10);
        assert_eq!(fleet.ships, Fleet::standard().ships.iter().map(|s| ShipSpec { length: s.length, count: s.count }).collect::<Vec<_>>());
    }

    #[test]
    fn test_fleet_for_size_12x12() {
        let fleet = Fleet::for_size(12, 12);
        assert_eq!(fleet.ships.len(), 5);
        assert_eq!(fleet.ships[0].length, 5);
        assert_eq!(fleet.total_cells(), 5 + 4 + 6 + 6 + 4);
    }
}
