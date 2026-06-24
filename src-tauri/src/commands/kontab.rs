use crate::games::kontab::{ai, engine, types::*};

fn state_is_valid(state: &GameState) -> bool {
    let n = state.num_players;
    (2..=4).contains(&n)
        && state.hands.len() == n
        && state.piles.len() == n
        && state.scores.len() == n
        && state.deal_scores.len() == n
        && state.tablas.len() == n
        && state.current < n
        && state.dealer < n
}

#[tauri::command]
pub async fn start_kontab_game(
    num_players: usize,
    target: u32,
    seed: Option<u64>,
) -> Result<GameState, String> {
    if !(2..=4).contains(&num_players) {
        return Err("num_players must be 2, 3 or 4".into());
    }
    let target = if target == 51 { 51 } else { 101 };
    tauri::async_runtime::spawn_blocking(move || engine::new_game(num_players, target, seed))
        .await
        .map_err(|e| format!("Task failed: {}", e))
}

#[tauri::command]
pub fn kontab_legal_moves(state: GameState) -> Vec<Move> {
    if !state_is_valid(&state) || state.phase != Phase::Playing {
        return vec![];
    }
    engine::legal_moves(&state)
}

#[tauri::command]
pub fn kontab_apply_move(state: GameState, card: Card) -> Result<ApplyResult, String> {
    if !state_is_valid(&state) {
        return Err("Invalid game state".into());
    }
    engine::apply_move(&state, &card)
}

#[tauri::command]
pub async fn kontab_ai_move(state: GameState) -> Result<Move, String> {
    if !state_is_valid(&state) || state.phase != Phase::Playing {
        return Err("Not an AI-playable state".into());
    }
    tauri::async_runtime::spawn_blocking(move || ai::decide_move(&state))
        .await
        .map_err(|e| format!("Task failed: {}", e))
}

#[tauri::command]
pub fn kontab_next_deal(state: GameState, seed: Option<u64>) -> Result<GameState, String> {
    if !state_is_valid(&state) {
        return Err("Invalid game state".into());
    }
    engine::next_deal(&state, seed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn start_game_roundtrips_through_json() {
        let state = start_kontab_game(3, 101, Some(99)).await.unwrap();
        let json = serde_json::to_string(&state).unwrap();
        let back: GameState = serde_json::from_str(&json).unwrap();
        assert_eq!(back.num_players, 3);
        assert_eq!(back.hands.len(), 3);
        let moves = kontab_legal_moves(back);
        assert_eq!(moves.len(), 6);
    }

    #[tokio::test]
    async fn ai_move_then_apply_advances() {
        let state = start_kontab_game(2, 101, Some(3)).await.unwrap();
        let mv = kontab_ai_move(state.clone()).await.unwrap();
        let result = kontab_apply_move(state, mv.card).unwrap();
        assert_eq!(result.events.len(), 1);
    }

    #[test]
    fn rejects_bad_player_count() {
        let mut state = engine::new_game(2, 101, Some(1));
        state.num_players = 5;
        assert!(kontab_apply_move(state, Card::new(5, Suit::Hearts)).is_err());
    }
}
