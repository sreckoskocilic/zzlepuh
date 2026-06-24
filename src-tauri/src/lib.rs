mod commands;
mod games;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            // Logging is on in release too, written to a file so the updater
            // (and any error) can be diagnosed on a user's machine.
            // Windows log file: %APPDATA%\com.zzlepuh.desktop\logs\
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .targets([
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                            file_name: Some("zzlepuh".into()),
                        }),
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    ])
                    .build(),
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bimaru::generate_bimaru_puzzle,
            commands::bimaru::validate_bimaru_solution,
            commands::bimaru::get_bimaru_hint,
            commands::bimaru::check_bimaru_errors,
            commands::nonogram::generate_nonogram_puzzle,
            commands::nonogram::validate_nonogram_solution,
            commands::nonogram::get_nonogram_hint,
            commands::nonogram::check_nonogram_errors,
            commands::nonogram::list_nonogram_pictures,
            commands::nonogram::generate_nonogram_picture,
            commands::calcudoku::generate_calcudoku_puzzle,
            commands::calcudoku::validate_calcudoku_solution,
            commands::calcudoku::get_calcudoku_hint,
            commands::calcudoku::check_calcudoku_errors,
            commands::kontab::start_kontab_game,
            commands::kontab::kontab_legal_moves,
            commands::kontab::kontab_apply_move,
            commands::kontab::kontab_ai_move,
            commands::kontab::kontab_next_deal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
