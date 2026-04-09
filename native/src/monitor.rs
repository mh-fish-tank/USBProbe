// monitor.rs — udev event monitoring using libudev

use std::os::fd::AsRawFd;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use std::path::PathBuf;

use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode, ErrorStrategy};

use nix::poll::{PollFd, PollFlags, poll, PollTimeout};

use crate::device::{read_device, NativeUSBDevice};

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

#[napi(object)]
#[derive(Debug, Clone)]
pub struct MonitorEvent {
    /// "add" or "remove"
    pub action: String,
    /// The sysfs path of the device
    pub sysfs_path: String,
    /// Device details (populated on "add", may be None on "remove")
    pub device: Option<NativeUSBDevice>,
}

#[napi]
pub struct MonitorHandle {
    running: Arc<AtomicBool>,
}

#[napi]
impl MonitorHandle {
    /// Stop the monitor thread.
    #[napi]
    pub fn stop(&self) {
        self.running.store(false, Ordering::Relaxed);
    }
}

// ---------------------------------------------------------------------------
// start_monitor
// ---------------------------------------------------------------------------

#[napi]
pub fn start_monitor(
    callback: ThreadsafeFunction<MonitorEvent, ErrorStrategy::CalleeHandled>,
) -> Result<MonitorHandle> {
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    thread::spawn(move || {
        // Build and start the udev monitor
        let socket = match udev::MonitorBuilder::new()
            .and_then(|b| b.match_subsystem("usb"))
            .and_then(|b| b.listen())
        {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[usbprobe] Failed to start udev monitor: {}", e);
                return;
            }
        };

        let raw_fd = socket.as_raw_fd();

        while running_clone.load(Ordering::Relaxed) {
            // SAFETY: BorrowedFd::borrow_raw requires the fd to be valid and not closed
            // while the borrowed fd is in use. The socket owns the fd, so it's valid here.
            let borrowed = unsafe { std::os::fd::BorrowedFd::borrow_raw(raw_fd) };
            let mut fds = [PollFd::new(borrowed, PollFlags::POLLIN)];

            // Poll with 500ms timeout so we can check the running flag
            match poll(&mut fds, PollTimeout::from(500u16)) {
                Ok(0) => {
                    // Timeout — loop and check running flag
                    continue;
                }
                Err(_) => {
                    // EINTR or other error — loop
                    continue;
                }
                Ok(_) => {
                    // Event(s) available — drain the socket iterator
                    for event in socket.iter() {
                        handle_event(&event, &callback, &running_clone);
                    }
                }
            }
        }
    });

    Ok(MonitorHandle { running })
}

// ---------------------------------------------------------------------------
// Internal event handler
// ---------------------------------------------------------------------------

fn handle_event(
    event: &udev::Event,
    callback: &ThreadsafeFunction<MonitorEvent, ErrorStrategy::CalleeHandled>,
    running: &Arc<AtomicBool>,
) {
    if !running.load(Ordering::Relaxed) {
        return;
    }

    let event_type = event.event_type();

    let action = match event_type {
        udev::EventType::Add => "add",
        udev::EventType::Remove => "remove",
        _ => return, // Ignore bind/unbind/change
    };

    let sysfs_path = event
        .syspath()
        .to_string_lossy()
        .to_string();

    // Skip interface directories (their sysname contains ':')
    let sysname = event
        .sysname()
        .to_string_lossy()
        .to_string();

    if sysname.contains(':') {
        return;
    }

    let monitor_event = if action == "add" {
        // Wait for sysfs to be fully populated
        thread::sleep(Duration::from_millis(200));

        let device = read_device(&PathBuf::from(&sysfs_path)).ok();

        MonitorEvent {
            action: "add".to_string(),
            sysfs_path,
            device,
        }
    } else {
        MonitorEvent {
            action: "remove".to_string(),
            sysfs_path,
            device: None,
        }
    };

    callback.call(Ok(monitor_event), ThreadsafeFunctionCallMode::NonBlocking);
}
