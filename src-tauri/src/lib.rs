use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

struct SsrProcess(Mutex<Option<Child>>);

fn parse_port() -> u16 {
  std::env::var("TAURI_SSR_PORT")
    .ok()
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(4322)
}

fn parse_startup_timeout_ms() -> u64 {
  std::env::var("TAURI_SSR_TIMEOUT_MS")
    .ok()
    .and_then(|value| value.parse::<u64>().ok())
    .unwrap_or(45_000)
}

fn normalize_windows_path(path: &Path) -> PathBuf {
  #[cfg(windows)]
  {
    let raw = path.to_string_lossy();

    if let Some(stripped) = raw.strip_prefix(r"\\?\UNC\") {
      return PathBuf::from(format!(r"\\{}", stripped));
    }

    if let Some(stripped) = raw.strip_prefix(r"\\?\") {
      return PathBuf::from(stripped);
    }
  }

  path.to_path_buf()
}

fn runtime_log_path(app: &tauri::AppHandle) -> PathBuf {
  app
    .path()
    .app_data_dir()
    .unwrap_or(std::env::temp_dir().join("Universal Brick Inventory"))
    .join("runtime.log")
}

fn runtime_log(app: &tauri::AppHandle, message: &str) {
  let log_path = runtime_log_path(app);

  if let Some(parent) = log_path.parent() {
    let _ = std::fs::create_dir_all(parent);
  }

  let line = format!("{}\n", message);
  let _ = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(log_path)
    .and_then(|mut file| file.write_all(line.as_bytes()));
}

fn show_startup_error(app: &tauri::AppHandle, message: &str) {
  if let Some(window) = app.get_webview_window("main") {
    let safe = message.replace("\\", "\\\\").replace('\'', "\\'");
    let script = format!(
      "document.documentElement.innerHTML = '<body style=\"font-family:Segoe UI,Arial,sans-serif;padding:24px\"><h2>No se pudo iniciar la aplicación</h2><p>{}</p><p>Revisa runtime.log en AppData de la app.</p></body>';",
      safe
    );
    let _ = window.eval(&script);
  }
}

fn relay_pipe_to_runtime_log<R: std::io::Read + Send + 'static>(
  reader: R,
  app: tauri::AppHandle,
  stream_name: &'static str,
) {
  thread::spawn(move || {
    let reader = BufReader::new(reader);
    for line in reader.lines() {
      match line {
        Ok(content) => runtime_log(&app, &format!("[ssr:{}] {}", stream_name, content)),
        Err(error) => {
          runtime_log(
            &app,
            &format!("[ssr:{}] error leyendo stream: {}", stream_name, error),
          );
          break;
        }
      }
    }
  });
}

fn wait_for_server(app: &tauri::AppHandle, child: &mut Child, port: u16, timeout_ms: u64) -> bool {
  let started = Instant::now();
  let timeout = Duration::from_millis(timeout_ms);

  while started.elapsed() < timeout {
    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
      runtime_log(app, &format!("server_ready port={}", port));
      return true;
    }

    match child.try_wait() {
      Ok(Some(status)) => {
        runtime_log(
          app,
          &format!("server_exited_early status={} before binding port={}", status, port),
        );
        return false;
      }
      Ok(None) => {}
      Err(error) => {
        runtime_log(app, &format!("server_try_wait_error={}", error));
      }
    }

    thread::sleep(Duration::from_millis(250));
  }

  runtime_log(
    app,
    &format!("server_not_ready_timeout timeout_ms={} port={}", timeout_ms, port),
  );

  false
}

fn spawn_ssr_server(app: &tauri::AppHandle, port: u16) -> Result<Child, std::io::Error> {
  let resource_dir_raw = app
    .path()
    .resource_dir()
    .map_err(|e| std::io::Error::other(e.to_string()))?;
  let resource_dir = normalize_windows_path(&resource_dir_raw);

  let exe_dir = std::env::current_exe()
    .ok()
    .and_then(|p| p.parent().map(normalize_windows_path))
    .unwrap_or_else(|| resource_dir.clone());

  let app_data_dir = app
    .path()
    .app_data_dir()
    .unwrap_or(std::env::temp_dir().join("Universal Brick Inventory"));

  let resource_roots: [PathBuf; 4] = [
    resource_dir.clone(),
    normalize_windows_path(&resource_dir.join("_up_")),
    exe_dir.clone(),
    normalize_windows_path(&exe_dir.join("_up_")),
  ];

  let entry = resource_roots
    .iter()
    .map(|root| normalize_windows_path(&root.join("dist").join("server").join("entry.mjs")))
    .find(|path| path.exists())
    .ok_or_else(|| {
      std::io::Error::new(
        std::io::ErrorKind::NotFound,
        format!(
          "No se encontró entry.mjs en roots={:?}",
          resource_roots
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect::<Vec<_>>()
        ),
      )
    })?;

  let server_dir = entry
    .parent()
    .map(normalize_windows_path)
    .ok_or_else(|| std::io::Error::other("entry.mjs no tiene directorio padre"))?;

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
    PathBuf::from("node")
  };

  runtime_log(
    app,
    &format!(
      "spawn_ssr resource_dir={:?} exe_dir={:?} server_dir={:?} entry={:?} entry_exists={} command={:?}",
      resource_dir,
      exe_dir,
      server_dir,
      entry,
      entry.exists(),
      command
    ),
  );

  let mut cmd = Command::new(&command);
  cmd
    .arg(&entry)
    .current_dir(&server_dir)
    .env("APP_DATA_DIR", &app_data_dir)
    .env("HOST", "127.0.0.1")
    .env("PORT", port.to_string())
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

  #[cfg(windows)]
  {
    cmd.creation_flags(CREATE_NO_WINDOW);
  }

  runtime_log(
    app,
    &format!(
      "spawn_ssr cmd={:?} arg0={:?} cwd={:?}",
      command,
      entry,
      server_dir
    ),
  );

  let mut child = cmd.spawn()?;

  if let Some(stdout) = child.stdout.take() {
    relay_pipe_to_runtime_log(stdout, app.clone(), "stdout");
  } else {
    runtime_log(app, "[ssr:stdout] no disponible");
  }

  if let Some(stderr) = child.stderr.take() {
    relay_pipe_to_runtime_log(stderr, app.clone(), "stderr");
  } else {
    runtime_log(app, "[ssr:stderr] no disponible");
  }

  Ok(child)
}

fn stop_ssr_server(app_handle: &tauri::AppHandle) {
  if let Ok(mut guard) = app_handle.state::<SsrProcess>().0.lock() {
    if let Some(mut child) = guard.take() {
      let _ = child.kill();
      let _ = child.wait();
      runtime_log(app_handle, "ssr_process_stopped");
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

      let app_handle = app.handle().clone();
      let port = parse_port();
      let timeout_ms = parse_startup_timeout_ms();

      let mut child = match spawn_ssr_server(&app_handle, port) {
        Ok(child) => child,
        Err(error) => {
          runtime_log(&app_handle, &format!("spawn_error={}", error));
          show_startup_error(&app_handle, "Error iniciando servidor SSR");
          return Ok(());
        }
      };

      if !wait_for_server(&app_handle, &mut child, port, timeout_ms) {
        let _ = child.kill();
        let _ = child.wait();
        show_startup_error(
          &app_handle,
          "El servidor SSR no respondió a tiempo. Revisa runtime.log para ver stdout/stderr.",
        );
        return Ok(());
      }

      if let Ok(mut guard) = app.state::<SsrProcess>().0.lock() {
        *guard = Some(child);
      }

      if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&format!("window.location.replace('http://127.0.0.1:{}')", port));
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
