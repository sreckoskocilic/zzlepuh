use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Suit {
    Hearts,
    Diamonds,
    Clubs,
    Spades,
}

impl Suit {
    pub const ALL: [Suit; 4] = [Suit::Hearts, Suit::Diamonds, Suit::Clubs, Suit::Spades];
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Card {
    pub rank: u8,
    pub suit: Suit,
}

impl Card {
    pub fn new(rank: u8, suit: Suit) -> Self {
        Card { rank, suit }
    }

    pub fn capture_values(&self) -> Vec<u8> {
        match self.rank {
            1 => vec![1, 11],
            2..=10 => vec![self.rank],
            11 => vec![12],
            12 => vec![13],
            13 => vec![14],
            _ => vec![self.rank],
        }
    }

    pub fn is_ace(&self) -> bool {
        self.rank == 1
    }

    pub fn is_honor(&self) -> bool {
        matches!(self.rank, 1 | 10 | 11 | 12 | 13)
    }

    pub fn is_ten_of_diamonds(&self) -> bool {
        self.rank == 10 && self.suit == Suit::Diamonds
    }

    pub fn is_two_of_clubs(&self) -> bool {
        self.rank == 2 && self.suit == Suit::Clubs
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum Phase {
    Playing,
    DealComplete,
    GameOver { loser: usize },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GameState {
    pub num_players: usize,
    pub deck: Vec<Card>,
    pub table: Vec<Card>,
    pub hands: Vec<Vec<Card>>,
    pub piles: Vec<Vec<Card>>,
    pub scores: Vec<u32>,
    pub deal_scores: Vec<u32>,
    pub tablas: Vec<u32>,
    pub current: usize,
    pub dealer: usize,
    pub last_capturer: Option<usize>,
    pub deal_number: u32,
    pub target: u32,
    pub phase: Phase,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub most_cards: u32,
    pub honors: u32,
    pub two_of_clubs: u32,
    pub tablas: u32,
    pub total: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Move {
    pub card: Card,
    pub captures: Vec<Vec<Card>>,
    pub played_value: u8,
    pub is_tabla: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MoveEvent {
    pub player: usize,
    pub card: Card,
    pub captured: Vec<Card>,
    pub is_tabla: bool,
    pub deal_complete: bool,
    pub deal_breakdown: Option<Vec<ScoreBreakdown>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ApplyResult {
    pub state: GameState,
    pub events: Vec<MoveEvent>,
}
