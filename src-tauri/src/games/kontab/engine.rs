use std::collections::HashMap;

use rand::seq::SliceRandom;
use rand::rngs::StdRng;
use rand::SeedableRng;

use super::types::*;

const HAND_SIZE: usize = 6;
const TABLE_START: usize = 4;

pub fn full_deck() -> Vec<Card> {
    let mut deck = Vec::with_capacity(52);
    for suit in Suit::ALL {
        for rank in 1..=13u8 {
            deck.push(Card::new(rank, suit));
        }
    }
    deck
}

fn rng_from(seed: Option<u64>) -> StdRng {
    match seed {
        Some(s) => StdRng::seed_from_u64(s),
        None => StdRng::seed_from_u64(rand::random::<u64>()),
    }
}

fn round_size(deck_len: usize, num_players: usize) -> usize {
    if deck_len >= HAND_SIZE * num_players {
        HAND_SIZE
    } else {
        deck_len / num_players
    }
}

fn deal_round(state: &mut GameState) {
    let size = round_size(state.deck.len(), state.num_players);
    for _ in 0..size {
        for p in 0..state.num_players {
            if let Some(card) = state.deck.pop() {
                state.hands[p].push(card);
            }
        }
    }
}

pub fn new_game(num_players: usize, target: u32, seed: Option<u64>) -> GameState {
    let dealer = num_players - 1;
    let mut state = GameState {
        num_players,
        deck: Vec::new(),
        table: Vec::new(),
        hands: vec![Vec::new(); num_players],
        piles: vec![Vec::new(); num_players],
        scores: vec![0; num_players],
        deal_scores: vec![0; num_players],
        tablas: vec![0; num_players],
        current: 0,
        dealer,
        last_capturer: None,
        deal_number: 1,
        target,
        phase: Phase::Playing,
    };
    start_deal(&mut state, seed);
    state
}

fn start_deal(state: &mut GameState, seed: Option<u64>) {
    let mut rng = rng_from(seed);
    let mut deck = full_deck();
    deck.shuffle(&mut rng);

    state.table = deck.split_off(deck.len() - TABLE_START);
    state.deck = deck;
    state.hands = vec![Vec::new(); state.num_players];
    state.piles = vec![Vec::new(); state.num_players];
    state.tablas = vec![0; state.num_players];
    state.deal_scores = vec![0; state.num_players];
    state.last_capturer = None;
    state.current = (state.dealer + 1) % state.num_players;
    state.phase = Phase::Playing;
    deal_round(state);
}

fn subset_hits_target(cards: &[Card], target: u8) -> bool {
    let mut base: u32 = 0;
    let mut aces: u32 = 0;
    for c in cards {
        if c.is_ace() {
            aces += 1;
            base += 1;
        } else {
            base += c.capture_values()[0] as u32;
        }
    }
    let t = target as u32;
    if t < base {
        return false;
    }
    let extra = t - base;
    extra % 10 == 0 && extra / 10 <= aces
}

pub fn max_carry_indices(table: &[Card], value: u8) -> Vec<Vec<usize>> {
    let n = table.len();
    if n == 0 || n > 24 {
        return greedy_carry(table, value);
    }
    let full: u32 = (1u32 << n) - 1;
    let mut memo: HashMap<u32, (usize, Vec<Vec<usize>>)> = HashMap::new();
    best_carry(table, value, full, &mut memo).1
}

fn best_carry(
    table: &[Card],
    value: u8,
    avail: u32,
    memo: &mut HashMap<u32, (usize, Vec<Vec<usize>>)>,
) -> (usize, Vec<Vec<usize>>) {
    if avail == 0 {
        return (0, Vec::new());
    }
    if let Some(hit) = memo.get(&avail) {
        return hit.clone();
    }

    let first = avail.trailing_zeros() as usize;
    let mut best = best_carry(table, value, avail & !(1 << first), memo);

    let rest = avail & !(1u32 << first);
    let mut groups = Vec::new();
    enumerate_groups(table, value, rest, first, 1u32 << first, &mut groups);
    for group_mask in groups {
        let (cnt, mut sub) = best_carry(table, value, avail & !group_mask, memo);
        let total = cnt + group_mask.count_ones() as usize;
        if total > best.0 {
            sub.push(mask_to_indices(group_mask));
            best = (total, sub);
        }
    }

    memo.insert(avail, best.clone());
    best
}

fn enumerate_groups(
    table: &[Card],
    value: u8,
    candidates: u32,
    next_bit: usize,
    current: u32,
    out: &mut Vec<u32>,
) {
    let cards = mask_to_cards(table, current);
    let base: u32 = cards
        .iter()
        .map(|c| if c.is_ace() { 1 } else { c.capture_values()[0] as u32 })
        .sum();
    if base > value as u32 {
        return;
    }
    if subset_hits_target(&cards, value) {
        out.push(current);
    }
    let mut bit = next_bit + 1;
    let mut remaining = candidates >> (next_bit + 1);
    while remaining != 0 {
        if remaining & 1 == 1 {
            enumerate_groups(table, value, candidates, bit, current | (1u32 << bit), out);
        }
        remaining >>= 1;
        bit += 1;
    }
}

fn greedy_carry(table: &[Card], value: u8) -> Vec<Vec<usize>> {
    let mut used = vec![false; table.len()];
    let mut groups = Vec::new();
    loop {
        let mut group = Vec::new();
        let mut sum = 0u32;
        for i in 0..table.len() {
            if used[i] {
                continue;
            }
            let v = if table[i].is_ace() { 1 } else { table[i].capture_values()[0] as u32 };
            if sum + v <= value as u32 {
                group.push(i);
                sum += v;
            }
        }
        let cards: Vec<Card> = group.iter().map(|&i| table[i]).collect();
        if !group.is_empty() && subset_hits_target(&cards, value) {
            for &i in &group {
                used[i] = true;
            }
            groups.push(group);
        } else {
            break;
        }
    }
    groups
}

fn mask_to_indices(mask: u32) -> Vec<usize> {
    (0..32).filter(|i| mask & (1 << i) != 0).collect()
}

fn mask_to_cards(table: &[Card], mask: u32) -> Vec<Card> {
    (0..table.len())
        .filter(|i| mask & (1 << i) != 0)
        .map(|i| table[i])
        .collect()
}

pub fn best_play(table: &[Card], card: &Card) -> (u8, Vec<Vec<Card>>) {
    let mut best_value = card.capture_values()[0];
    let mut best_groups: Vec<Vec<usize>> = Vec::new();
    let mut best_count = 0usize;
    for &value in &card.capture_values() {
        let groups = max_carry_indices(table, value);
        let count: usize = groups.iter().map(|g| g.len()).sum();
        if count > best_count {
            best_count = count;
            best_groups = groups;
            best_value = value;
        }
    }
    let groups = best_groups
        .into_iter()
        .map(|g| g.into_iter().map(|i| table[i]).collect())
        .collect();
    (best_value, groups)
}

pub fn legal_moves(state: &GameState) -> Vec<Move> {
    let p = state.current;
    let mut moves = Vec::new();
    for &card in &state.hands[p] {
        let (value, groups) = best_play(&state.table, &card);
        let captured: usize = groups.iter().map(|g| g.len()).sum();
        let is_tabla = captured > 0 && captured == state.table.len();
        moves.push(Move {
            card,
            captures: groups,
            played_value: value,
            is_tabla,
        });
    }
    moves
}

pub fn apply_move(state: &GameState, card: &Card) -> Result<ApplyResult, String> {
    if state.phase != Phase::Playing {
        return Err("Game is not in a playable phase".into());
    }
    let mut state = state.clone();
    let p = state.current;

    let pos = state.hands[p]
        .iter()
        .position(|c| c == card)
        .ok_or("Card is not in the current player's hand")?;
    state.hands[p].remove(pos);

    let (_value, groups) = best_play(&state.table, card);
    let captured_cards: Vec<Card> = groups.iter().flatten().copied().collect();
    let mut is_tabla = false;

    if captured_cards.is_empty() {
        state.table.push(*card);
    } else {
        state
            .table
            .retain(|c| !captured_cards.iter().any(|cap| cap == c));
        let mut pts = card_points(card);
        for c in &captured_cards {
            pts += card_points(c);
        }
        state.piles[p].extend(captured_cards.iter().copied());
        state.piles[p].push(*card);
        state.last_capturer = Some(p);
        if state.table.is_empty() {
            state.tablas[p] += 1;
            is_tabla = true;
            pts += 10;
        }
        state.deal_scores[p] += pts;
        state.scores[p] += pts;
    }

    let mut event = MoveEvent {
        player: p,
        card: *card,
        captured: captured_cards,
        is_tabla,
        deal_complete: false,
        deal_breakdown: None,
    };

    if let Some(loser) = first_to_cross(&state.scores, state.target) {
        state.phase = Phase::GameOver { loser };
        return Ok(ApplyResult {
            state,
            events: vec![event],
        });
    }

    let hands_empty = state.hands.iter().all(|h| h.is_empty());
    if hands_empty {
        if state.deck.is_empty() {
            let breakdown = finish_deal(&mut state, p);
            event.deal_complete = true;
            event.deal_breakdown = Some(breakdown);
        } else {
            deal_round(&mut state);
            state.current = (state.current + 1) % state.num_players;
        }
    } else {
        state.current = (state.current + 1) % state.num_players;
    }

    Ok(ApplyResult {
        state,
        events: vec![event],
    })
}

fn finish_deal(state: &mut GameState, fallback: usize) -> Vec<ScoreBreakdown> {
    if !state.table.is_empty() {
        let taker = state.last_capturer.unwrap_or(fallback);
        let leftover = std::mem::take(&mut state.table);
        let pts: u32 = leftover.iter().map(card_points).sum();
        state.piles[taker].extend(leftover);
        state.deal_scores[taker] += pts;
        state.scores[taker] += pts;
    }

    if let Some(leader) = most_cards_leader(&state.piles) {
        state.deal_scores[leader] += 3;
        state.scores[leader] += 3;
    }

    let breakdown = score_deal(state);

    if let Some(loser) = first_to_cross(&state.scores, state.target) {
        state.phase = Phase::GameOver { loser };
    } else {
        state.phase = Phase::DealComplete;
    }
    breakdown
}

pub fn next_deal(state: &GameState, seed: Option<u64>) -> Result<GameState, String> {
    if state.phase != Phase::DealComplete {
        return Err("No deal to advance from".into());
    }
    let mut state = state.clone();
    state.dealer = (state.dealer + 1) % state.num_players;
    state.deal_number += 1;
    start_deal(&mut state, seed);
    Ok(state)
}

pub fn score_deal(state: &GameState) -> Vec<ScoreBreakdown> {
    let n = state.num_players;
    let mut out = vec![ScoreBreakdown::default(); n];

    for p in 0..n {
        let pile = &state.piles[p];
        let honors = pile.iter().filter(|c| c.is_honor()).count() as u32;
        let ten_d_bonus = pile.iter().filter(|c| c.is_ten_of_diamonds()).count() as u32;
        out[p].honors = honors + ten_d_bonus;
        out[p].two_of_clubs = if pile.iter().any(|c| c.is_two_of_clubs()) { 1 } else { 0 };
        out[p].tablas = state.tablas[p] * 10;
    }

    if let Some(leader) = most_cards_leader(&state.piles) {
        out[leader].most_cards = 3;
    }

    for b in out.iter_mut() {
        b.total = b.most_cards + b.honors + b.two_of_clubs + b.tablas;
    }
    out
}

fn card_points(card: &Card) -> u32 {
    let mut pts = 0;
    if card.is_honor() {
        pts += 1;
    }
    if card.is_ten_of_diamonds() {
        pts += 1;
    }
    if card.is_two_of_clubs() {
        pts += 1;
    }
    pts
}

fn most_cards_leader(piles: &[Vec<Card>]) -> Option<usize> {
    let counts: Vec<usize> = piles.iter().map(|p| p.len()).collect();
    let max_count = *counts.iter().max().unwrap_or(&0);
    if max_count == 0 {
        return None;
    }
    let leaders: Vec<usize> = (0..piles.len()).filter(|&p| counts[p] == max_count).collect();
    if leaders.len() == 1 {
        Some(leaders[0])
    } else {
        None
    }
}

fn first_to_cross(scores: &[u32], target: u32) -> Option<usize> {
    (0..scores.len()).find(|&p| scores[p] >= target)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn c(rank: u8, suit: Suit) -> Card {
        Card::new(rank, suit)
    }

    fn count(groups: &[Vec<Card>]) -> usize {
        groups.iter().map(|g| g.len()).sum()
    }

    #[test]
    fn deck_is_52_unique() {
        let deck = full_deck();
        assert_eq!(deck.len(), 52);
        let mut seen = std::collections::HashSet::new();
        for card in &deck {
            assert!(seen.insert((card.rank, card.suit as u8)));
        }
    }

    #[test]
    fn queen_carries_queen_and_two_plus_ace() {
        let table = vec![
            c(12, Suit::Hearts),
            c(2, Suit::Clubs),
            c(1, Suit::Spades),
            c(5, Suit::Diamonds),
        ];
        let (value, groups) = best_play(&table, &c(12, Suit::Spades));
        assert_eq!(value, 13);
        assert_eq!(count(&groups), 3);
        let taken: Vec<Card> = groups.iter().flatten().copied().collect();
        assert!(taken.contains(&c(12, Suit::Hearts)));
        assert!(taken.contains(&c(2, Suit::Clubs)));
        assert!(taken.contains(&c(1, Suit::Spades)));
        assert!(!taken.contains(&c(5, Suit::Diamonds)));
    }

    #[test]
    fn ace_takes_three_cards_not_two() {
        let table = vec![
            c(1, Suit::Hearts),
            c(1, Suit::Clubs),
            c(9, Suit::Spades),
            c(2, Suit::Diamonds),
        ];
        let (value, groups) = best_play(&table, &c(1, Suit::Spades));
        assert_eq!(value, 11);
        assert_eq!(count(&groups), 4);
        let taken: Vec<Card> = groups.iter().flatten().copied().collect();
        assert!(taken.contains(&c(9, Suit::Spades)));
        assert!(taken.contains(&c(1, Suit::Hearts)));
        assert!(taken.contains(&c(1, Suit::Clubs)));
        assert!(taken.contains(&c(2, Suit::Diamonds)));
    }

    #[test]
    fn captures_multiple_groups() {
        let table = vec![
            c(7, Suit::Hearts),
            c(3, Suit::Clubs),
            c(4, Suit::Spades),
            c(9, Suit::Diamonds),
        ];
        let (_, groups) = best_play(&table, &c(7, Suit::Spades));
        assert_eq!(count(&groups), 3);
        let taken: Vec<Card> = groups.iter().flatten().copied().collect();
        assert!(taken.contains(&c(7, Suit::Hearts)));
        assert!(taken.contains(&c(3, Suit::Clubs)));
        assert!(taken.contains(&c(4, Suit::Spades)));
        assert!(!taken.contains(&c(9, Suit::Diamonds)));
    }

    #[test]
    fn no_capture_drops_card() {
        let table = vec![c(5, Suit::Hearts), c(8, Suit::Clubs)];
        let (_, groups) = best_play(&table, &c(3, Suit::Spades));
        assert_eq!(count(&groups), 0);
    }

    #[test]
    fn new_game_deals_correctly() {
        for np in 2..=4 {
            let s = new_game(np, 101, Some(42));
            assert_eq!(s.hands.len(), np);
            for h in &s.hands {
                assert_eq!(h.len(), HAND_SIZE);
            }
            assert_eq!(s.table.len(), TABLE_START);
            assert_eq!(s.deck.len(), 52 - TABLE_START - HAND_SIZE * np);
            assert_eq!(s.current, 0);
        }
    }

    #[test]
    fn seed_is_deterministic() {
        let a = new_game(3, 101, Some(7));
        let b = new_game(3, 101, Some(7));
        assert_eq!(a.table, b.table);
        assert_eq!(a.hands, b.hands);
    }

    #[test]
    fn apply_no_capture_pushes_table() {
        let mut s = new_game(2, 101, Some(1));
        s.hands[0] = vec![c(3, Suit::Spades)];
        s.table = vec![c(8, Suit::Hearts)];
        let r = apply_move(&s, &c(3, Suit::Spades)).unwrap();
        assert!(r.state.table.contains(&c(3, Suit::Spades)));
        assert_eq!(r.events[0].captured.len(), 0);
    }

    #[test]
    fn apply_capture_moves_to_pile_and_detects_tabla() {
        let mut s = new_game(2, 101, Some(1));
        s.hands[0] = vec![c(8, Suit::Spades)];
        s.hands[1] = vec![c(5, Suit::Spades)];
        s.table = vec![c(8, Suit::Hearts)];
        let r = apply_move(&s, &c(8, Suit::Spades)).unwrap();
        assert!(r.events[0].is_tabla);
        assert_eq!(r.state.tablas[0], 1);
        assert!(r.state.table.is_empty());
        assert_eq!(r.state.piles[0].len(), 2);
    }

    #[test]
    fn apply_rejects_card_not_in_hand() {
        let s = new_game(2, 101, Some(1));
        let stray = c(12, Suit::Clubs);
        let in_hand = s.hands[0].contains(&stray);
        let r = apply_move(&s, &stray);
        assert_eq!(r.is_err(), !in_hand);
    }

    #[test]
    fn score_deal_categories() {
        let mut s = new_game(2, 101, Some(1));
        s.piles[0] = vec![
            c(1, Suit::Hearts),
            c(1, Suit::Clubs),
            c(10, Suit::Diamonds),
            c(2, Suit::Clubs),
            c(5, Suit::Spades),
        ];
        s.piles[1] = vec![c(7, Suit::Hearts)];
        s.tablas[0] = 1;
        let b = score_deal(&s);
        assert_eq!(b[0].honors, 4);
        assert_eq!(b[0].two_of_clubs, 1);
        assert_eq!(b[0].most_cards, 3);
        assert_eq!(b[0].tablas, 10);
        assert_eq!(b[0].total, 4 + 1 + 3 + 10);
        assert_eq!(b[1].most_cards, 0);
    }

    #[test]
    fn most_cards_tie_awards_nobody() {
        let mut s = new_game(2, 101, Some(1));
        s.piles[0] = vec![c(3, Suit::Hearts), c(4, Suit::Hearts)];
        s.piles[1] = vec![c(5, Suit::Clubs), c(6, Suit::Clubs)];
        let b = score_deal(&s);
        assert_eq!(b[0].most_cards, 0);
        assert_eq!(b[1].most_cards, 0);
    }

    #[test]
    fn capture_crosses_target_ends_game_immediately() {
        let mut s = new_game(2, 51, Some(1));
        s.scores = vec![49, 0];
        s.deal_scores = vec![0, 0];
        s.hands[0] = vec![c(12, Suit::Spades)];
        s.hands[1] = vec![c(3, Suit::Diamonds)];
        s.table = vec![c(12, Suit::Hearts), c(5, Suit::Clubs)];
        s.current = 0;
        let r = apply_move(&s, &c(12, Suit::Spades)).unwrap();
        assert_eq!(r.state.scores[0], 51);
        assert_eq!(r.state.deal_scores[0], 2);
        assert_eq!(r.state.phase, Phase::GameOver { loser: 0 });
        assert!(!r.events[0].deal_complete);
    }

    #[test]
    fn deal_scores_match_score_deal_with_leftover() {
        let mut s = new_game(2, 101, Some(1));
        s.deck = Vec::new();
        s.piles = vec![Vec::new(); 2];
        s.deal_scores = vec![0; 2];
        s.tablas = vec![0; 2];
        s.scores = vec![0; 2];
        s.last_capturer = None;
        s.table = vec![c(1, Suit::Hearts)];
        s.hands[0] = vec![c(1, Suit::Spades)];
        s.hands[1] = vec![c(2, Suit::Clubs)];
        s.current = 0;

        let r0 = apply_move(&s, &c(1, Suit::Spades)).unwrap();
        assert_eq!(r0.state.phase, Phase::Playing);
        let r1 = apply_move(&r0.state, &c(2, Suit::Clubs)).unwrap();

        assert_eq!(r1.state.phase, Phase::DealComplete);
        let breakdown = score_deal(&r1.state);
        for p in 0..2 {
            assert_eq!(r1.state.deal_scores[p], breakdown[p].total, "player {p}");
        }
        assert_eq!(r1.state.deal_scores[0], 16);
        assert_eq!(r1.state.scores[0], 16);
        assert_eq!(r1.state.deal_scores[1], 0);
    }

    #[test]
    fn first_to_cross_breaks_ties_by_seat_order() {
        assert_eq!(first_to_cross(&[20, 30], 51), None);
        assert_eq!(first_to_cross(&[60, 30], 51), Some(0));
        assert_eq!(first_to_cross(&[30, 55], 51), Some(1));
        assert_eq!(first_to_cross(&[53, 58], 51), Some(0));
        assert_eq!(first_to_cross(&[40, 60, 55], 51), Some(1));
    }

    #[test]
    fn full_game_with_seed_terminates() {
        let mut s = new_game(3, 101, Some(123));
        let mut guard = 0;
        loop {
            guard += 1;
            assert!(guard < 100_000, "game did not terminate");
            match s.phase {
                Phase::Playing => {
                    let card = super::super::ai::decide_move(&s).card;
                    s = apply_move(&s, &card).unwrap().state;
                }
                Phase::DealComplete => {
                    s = next_deal(&s, Some(guard as u64)).unwrap();
                }
                Phase::GameOver { loser } => {
                    assert!(loser < 3);
                    assert!(s.scores[loser] >= s.target);
                    break;
                }
            }
        }
    }
}
