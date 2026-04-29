use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::Manager;

struct SsrProcess(Mutex<Option<Child>>);

fn parse_port() -> u16 {
  std::env::var("TAURI_SSR_PORT")
    .ok()
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(4321)
}

fn runtime_log(app: &tauri::AppHandle, message: &str) {
  let log_path = app
    .path()
    .app_data_dir()
    .unwrap_or(std::env::temp_dir().join("Universal Brick Inventory"))
    .join("runtime.log");
  if let Some(parent) = log_path.parent() {
    let _ = std::fs::create_dir_all(parent);
  }
  let line = format!("{}\n", message);
  let _ = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(log_path)
    .and_then(|mut file| std::io::Write::write_all(&mut file, line.as_bytes()));
}

fn show_startup_error(app: &tauri::AppHandle, message: &str) {
  if let Some(window) = app.get_webview_window("main") {
    let safe = message.replace("\\", "\\\\").replace("'", "\\'");
    let script = format!(
      "document.documentElement.innerHTML = '<body style=\"font-family:Segoe UI,Arial,sans-serif;padding:24px\"><h2>No se pudo iniciar la aplicación</h2><p>{}</p><p>Revisa runtime.log en AppData de la app.</p></body>';",
      safe
    );
    let _ = window.eval(&script);
  }
}

fn wait_for_server(port: u16) -> bool {
  for _ in 0..120 {
    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
      return true;
    }
    thread::sleep(Duration::from_millis(250));
  }
  false
}

fn spawn_ssr_server(app: &tauri::AppHandle, port: u16) -> Result<Child, std::io::Error> {
  let resource_dir = app
    .path()
    .resource_dir()
    .map_err(|e| std::io::Error::other(e.to_string()))?;
  let exe_dir = std::env::current_exe()
    .ok()
    .and_then(|p| p.parent().map(|d| d.to_path_buf()))
    .unwrap_or_else(|| resource_dir.clone());
  let app_data_dir = app
    .path()
    .app_data_dir()
    .unwrap_or(std::env::temp_dir().join("Universal Brick Inventory"));

  let resource_roots: [PathBuf; 4] = [
    resource_dir.clone(),
    resource_dir.join("_up_"),
    exe_dir.clone(),
    exe_dir.join("_up_"),
  ];

  let entry = resource_roots
    .iter()
    .map(|root| root.join("dist").join("server").join("entry.mjs"))
    .find(|path| path.exists())
    .unwrap_or_else(|| resource_dir.join("dist").join("server").join("entry.mjs"));

  let bundled_node_exe = resource_roots
    .iter()
    .map(|root| root.join("node-runtime").join("node.exe"))
    .find(|path| path.exists());

  let bundled_node = resource_roots
    .iter()
    .map(|root| root.join("node-runtime").join("node"))
    .find(|path| path.exists());

  let command = if let Some(path) = bundled_node_exe {
    path
  } else if let Some(path) = bundled_node {
    path
  } else {
    "node".into()
  };

  runtime_log(
    app,
    &format!(
      "resource_dir={:?} exe_dir={:?} entry={:?} entry_exists={} command={:?}",
      resource_dir,
      exe_dir,
      entry,
      entry.exists(),
      command
    ),
  );

  let stdout_log = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(app_data_dir.join("ssr-stdout.log"));
  let stderr_log = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(app_data_dir.join("ssr-stderr.log"));

  let mut cmd = Command::new(command);
  cmd.arg(entry)
    .env("APP_DATA_DIR", &app_data_dir)
    .env("HOST", "127.0.0.1")
    .env("PORT", port.to_string());

  if let Some(parent) = resource_roots
    .iter()
    .map(|root| root.join("dist").join("server"))
    .find(|path| path.exists())
  {
    cmd.current_dir(parent);
  }

  if let Ok(file) = stdout_log {
    cmd.stdout(Stdio::from(file));
  }
  if let Ok(file) = stderr_log {
    cmd.stderr(Stdio::from(file));
  }

  cmd.spawn()
}

fn stop_ssr_server(app_handle: &tauri::AppHandle) {
  if let Ok(mut guard) = app_handle.state::<SsrProcess>().0.lock() {
    if let Some(mut child) = guard.take() {
      let _ = child.kill();
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      app.manage(SsrProcess(Mutex::new(None)));

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
        return Ok(());
      }

      let port = parse_port();
      let child = match spawn_ssr_server(&app.handle().clone(), port) {
        Ok(child) => child,
        Err(error) => {
          runtime_log(&app.handle().clone(), &format!("spawn_error={}", error));
          show_startup_error(&app.handle().clone(), "Error iniciando servidor SSR");
          return Ok(());
        }
      };

      if let Ok(mut guard) = app.state::<SsrProcess>().0.lock() {
        *guard = Some(child);
      }

      if !wait_for_server(port) {
        runtime_log(&app.handle().clone(), "server_not_ready_timeout");
        stop_ssr_server(&app.handle().clone());
        show_startup_error(&app.handle().clone(), "El servidor SSR no respondió a tiempo");
        return Ok(());
      }

      if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&format!(
          "window.location.replace('http://127.0.0.1:{}')",
          port
        ));
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if matches!(event, tauri::RunEvent::Exit) {
        stop_ssr_server(app_handle);
      }
    });
}
