use super::engine;
use super::types::*;

const W_TABLA: f64 = 10.0;
const W_HONOR: f64 = 1.0;
const W_TEN_D_BONUS: f64 = 1.0;
const W_TWO_C: f64 = 1.0;
const W_CARD: f64 = 0.6;

fn capture_cost(captured: &[Card], is_tabla: bool) -> f64 {
    let mut cost = W_CARD * captured.len() as f64;
    for card in captured {
        if card.is_honor() {
            cost += W_HONOR;
        }
        if card.is_ten_of_diamonds() {
            cost += W_TEN_D_BONUS;
        }
        if card.is_two_of_clubs() {
            cost += W_TWO_C;
        }
    }
    if is_tabla {
        cost += W_TABLA;
    }
    cost
}

fn dump_cost(card: &Card) -> f64 {
    let value = card.capture_values().iter().copied().max().unwrap_or(0) as f64;
    let mut cost = 0.01 * (15.0 - value);
    if card.is_honor() || card.is_two_of_clubs() {
        cost -= 0.05;
    }
    cost
}

pub fn decide_move(state: &GameState) -> Move {
    let moves = engine::legal_moves(state);
    let mut best_idx = 0;
    let mut best_cost = f64::INFINITY;
    for (i, mv) in moves.iter().enumerate() {
        let captured: Vec<Card> = mv.captures.iter().flatten().copied().collect();
        let cost = if captured.is_empty() {
            dump_cost(&mv.card)
        } else {
            capture_cost(&captured, mv.is_tabla)
        };
        if cost < best_cost {
            best_cost = cost;
            best_idx = i;
        }
    }
    moves[best_idx].clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn c(rank: u8, suit: Suit) -> Card {
        Card::new(rank, suit)
    }

    #[test]
    fn decide_returns_card_in_hand() {
        let s = engine::new_game(3, 101, Some(5));
        let mv = decide_move(&s);
        assert!(s.hands[s.current].contains(&mv.card));
    }

    #[test]
    fn avoids_capture_when_a_dump_exists() {
        let mut s = engine::new_game(2, 101, Some(1));
        s.current = 0;
        s.table = vec![c(8, Suit::Hearts)];
        s.hands[0] = vec![c(8, Suit::Spades), c(3, Suit::Clubs)];
        let mv = decide_move(&s);
        assert_eq!(mv.card, c(3, Suit::Clubs));
        assert!(mv.captures.iter().all(|g| g.is_empty()));
    }

    #[test]
    fn avoids_tabla_when_avoidable() {
        let mut s = engine::new_game(2, 101, Some(1));
        s.current = 0;
        s.table = vec![c(8, Suit::Hearts)];
        s.hands[0] = vec![c(8, Suit::Spades), c(13, Suit::Clubs)];
        let mv = decide_move(&s);
        assert!(!mv.is_tabla);
    }

    #[test]
    fn picks_cheapest_capture_when_forced() {
        let mut s = engine::new_game(2, 101, Some(1));
        s.current = 0;
        s.table = vec![c(10, Suit::Diamonds), c(3, Suit::Hearts)];
        s.hands[0] = vec![c(10, Suit::Spades), c(3, Suit::Clubs)];
        let mv = decide_move(&s);
        assert_eq!(mv.card, c(3, Suit::Clubs));
    }
}
