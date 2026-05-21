mod commands;
mod games;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bimaru::generate_bimaru_puzzle,
            commands::bimaru::validate_bimaru_solution,
            commands::bimaru::get_bimaru_hint,
            commands::bimaru::check_bimaru_errors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
