use napi::bindgen_prelude::*;
use std::fs;
use std::path::{Path, PathBuf};

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct NativeEndpoint {
    pub number: u32,
    pub direction: String,
    pub transfer_type: String,
    pub max_packet_size: u32,
    pub interval: u32,
}

#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct NativeInterface {
    pub number: u32,
    pub alternate_setting: u32,
    pub class_code: u32,
    pub subclass_code: u32,
    pub protocol_code: u32,
    pub interface_string: Option<String>,
    pub driver: Option<String>,
    pub endpoints: Vec<NativeEndpoint>,
}

#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct NativeConfiguration {
    pub configuration_value: u32,
    pub max_power: u32,
    pub attributes: u32,
    pub interfaces: Vec<NativeInterface>,
}

#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct NativeDeviceDescriptor {
    pub usb_version: String,
    pub device_class: u32,
    pub device_subclass: u32,
    pub device_protocol: u32,
    pub max_packet_size0: u32,
    pub vendor_id: u32,
    pub product_id: u32,
    pub device_version: String,
    pub manufacturer_string: Option<String>,
    pub product_string: Option<String>,
    pub serial_number_string: Option<String>,
    pub num_configurations: u32,
}

#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct NativeUSBDevice {
    pub bus_number: u32,
    pub device_address: u32,
    pub port_path: String,
    pub speed: String,
    pub vendor_id: u32,
    pub product_id: u32,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
    pub serial_number: Option<String>,
    pub device_class: u32,
    pub device_subclass: u32,
    pub device_protocol: u32,
    pub sysfs_path: String,
    pub descriptor: NativeDeviceDescriptor,
    pub configurations: Vec<NativeConfiguration>,
    pub raw_descriptors: Vec<u32>,
}

// ---------------------------------------------------------------------------
// sysfs helpers
// ---------------------------------------------------------------------------

pub fn read_sysfs_attr(base: &Path, attr: &str) -> Option<String> {
    let path = base.join(attr);
    fs::read_to_string(&path)
        .ok()
        .map(|s| s.trim().to_string())
}

pub fn read_sysfs_u32(base: &Path, attr: &str) -> Option<u32> {
    read_sysfs_attr(base, attr)?.parse::<u32>().ok()
}

pub fn read_sysfs_hex(base: &Path, attr: &str) -> Option<u32> {
    let raw = read_sysfs_attr(base, attr)?;
    u32::from_str_radix(raw.trim_start_matches("0x"), 16).ok()
}

fn speed_str(raw: &str) -> String {
    match raw {
        "1.5" => "LowSpeed".to_string(),
        "12" => "FullSpeed".to_string(),
        "480" => "HighSpeed".to_string(),
        "5000" => "SuperSpeed".to_string(),
        "10000" => "SuperSpeedPlus".to_string(),
        other => other.to_string(),
    }
}

fn bcd_to_str(bcd: u32) -> String {
    let major = (bcd >> 8) & 0xFF;
    let minor = (bcd >> 4) & 0x0F;
    let patch = bcd & 0x0F;
    if patch == 0 {
        format!("{}.{}", major, minor)
    } else {
        format!("{}.{}.{}", major, minor, patch)
    }
}

// ---------------------------------------------------------------------------
// Endpoint parsing
// ---------------------------------------------------------------------------

fn read_endpoint(ep_path: &Path) -> NativeEndpoint {
    let number = read_sysfs_hex(ep_path, "bEndpointAddress")
        .map(|v| v & 0x0F)
        .unwrap_or(0);

    let direction = read_sysfs_attr(ep_path, "direction")
        .unwrap_or_else(|| "unknown".to_string());

    let transfer_type = read_sysfs_attr(ep_path, "type")
        .unwrap_or_else(|| "unknown".to_string());

    let max_packet_size = read_sysfs_hex(ep_path, "wMaxPacketSize")
        .map(|v| v & 0x07FF)        // bits[10:0] are the actual size
        .unwrap_or(0);

    let interval = read_sysfs_u32(ep_path, "bInterval").unwrap_or(0);

    NativeEndpoint {
        number,
        direction,
        transfer_type,
        max_packet_size,
        interval,
    }
}

// ---------------------------------------------------------------------------
// Interface parsing
// ---------------------------------------------------------------------------

fn read_interface(iface_path: &Path) -> NativeInterface {
    let number = read_sysfs_u32(iface_path, "bInterfaceNumber").unwrap_or(0);
    let alternate_setting = read_sysfs_u32(iface_path, "bAlternateSetting").unwrap_or(0);
    let class_code = read_sysfs_hex(iface_path, "bInterfaceClass").unwrap_or(0);
    let subclass_code = read_sysfs_hex(iface_path, "bInterfaceSubClass").unwrap_or(0);
    let protocol_code = read_sysfs_hex(iface_path, "bInterfaceProtocol").unwrap_or(0);
    let interface_string = read_sysfs_attr(iface_path, "interface");
    let driver = read_driver(iface_path);

    // Collect endpoints: subdirectories starting with "ep_"
    let mut endpoints = Vec::new();
    if let Ok(entries) = fs::read_dir(iface_path) {
        let mut ep_paths: Vec<PathBuf> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_name()
                    .to_string_lossy()
                    .starts_with("ep_")
            })
            .map(|e| e.path())
            .collect();
        ep_paths.sort();
        for ep_path in ep_paths {
            if ep_path.is_dir() {
                endpoints.push(read_endpoint(&ep_path));
            }
        }
    }

    NativeInterface {
        number,
        alternate_setting,
        class_code,
        subclass_code,
        protocol_code,
        interface_string,
        driver,
        endpoints,
    }
}

fn read_driver(iface_path: &Path) -> Option<String> {
    let driver_link = iface_path.join("driver");
    fs::read_link(&driver_link)
        .ok()
        .and_then(|p| {
            p.file_name()
                .map(|n| n.to_string_lossy().to_string())
        })
}

// ---------------------------------------------------------------------------
// Configuration parsing
// ---------------------------------------------------------------------------

fn read_configurations(device_path: &Path) -> Vec<NativeConfiguration> {
    // Under the device path, interface directories look like `1-1:1.0`
    // The configuration value is the first number after ':'
    // We group interfaces by configuration value.

    let dir_name = device_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut configs: std::collections::BTreeMap<u32, NativeConfiguration> =
        std::collections::BTreeMap::new();

    // Default config from sysfs bmAttributes / bMaxPower
    let default_cfg_val = read_sysfs_u32(device_path, "bConfigurationValue").unwrap_or(1);
    let max_power = read_sysfs_u32(device_path, "bMaxPower").unwrap_or(0);
    let attributes = read_sysfs_hex(device_path, "bmAttributes").unwrap_or(0x80);

    let default_cfg = NativeConfiguration {
        configuration_value: default_cfg_val,
        max_power,
        attributes,
        interfaces: Vec::new(),
    };
    configs.insert(default_cfg_val, default_cfg);

    if let Ok(entries) = fs::read_dir(device_path) {
        let mut iface_paths: Vec<(u32, u32, PathBuf)> = entries
            .filter_map(|e| e.ok())
            .filter_map(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                // Interface dirs look like "1-1:1.0" or "usb1:1.0"
                // They must start with the device dir name and contain ':'
                if name.starts_with(&dir_name) && name.contains(':') {
                    // Parse ":cfg.iface" suffix
                    if let Some(colon_pos) = name.rfind(':') {
                        let suffix = &name[colon_pos + 1..];
                        let parts: Vec<&str> = suffix.split('.').collect();
                        if parts.len() == 2 {
                            let cfg_val = parts[0].parse::<u32>().ok()?;
                            let iface_num = parts[1].parse::<u32>().ok()?;
                            let path = e.path();
                            if path.is_dir() {
                                return Some((cfg_val, iface_num, path));
                            }
                        }
                    }
                }
                None
            })
            .collect();

        iface_paths.sort_by_key(|(c, i, _)| (*c, *i));

        for (cfg_val, _iface_num, iface_path) in iface_paths {
            let iface = read_interface(&iface_path);
            let entry = configs.entry(cfg_val).or_insert_with(|| NativeConfiguration {
                configuration_value: cfg_val,
                max_power,
                attributes,
                interfaces: Vec::new(),
            });
            entry.interfaces.push(iface);
        }
    }

    configs.into_values().collect()
}

// ---------------------------------------------------------------------------
// Raw descriptor bytes
// ---------------------------------------------------------------------------

fn read_raw_descriptors(device_path: &Path) -> Vec<u32> {
    let path = device_path.join("descriptors");
    fs::read(&path)
        .map(|bytes| bytes.iter().map(|b| *b as u32).collect())
        .unwrap_or_default()
}

// ---------------------------------------------------------------------------
// Device descriptor
// ---------------------------------------------------------------------------

fn read_device_descriptor(device_path: &Path) -> NativeDeviceDescriptor {
    let usb_version = {
        // bcdUSB is stored in hex format like "0200" or as "2.00"
        // sysfs exposes it via "version" attribute already formatted
        read_sysfs_attr(device_path, "version")
            .map(|v| v.trim().to_string())
            .unwrap_or_else(|| "Unknown".to_string())
    };

    let device_version = {
        // bcdDevice via "bcdDevice" attribute (hex) or "version" not present
        read_sysfs_hex(device_path, "bcdDevice")
            .map(|v| bcd_to_str(v))
            .unwrap_or_else(|| "Unknown".to_string())
    };

    let device_class = read_sysfs_hex(device_path, "bDeviceClass").unwrap_or(0);
    let device_subclass = read_sysfs_hex(device_path, "bDeviceSubClass").unwrap_or(0);
    let device_protocol = read_sysfs_hex(device_path, "bDeviceProtocol").unwrap_or(0);
    let max_packet_size0 = read_sysfs_u32(device_path, "bMaxPacketSize0").unwrap_or(0);
    let vendor_id = read_sysfs_hex(device_path, "idVendor").unwrap_or(0);
    let product_id = read_sysfs_hex(device_path, "idProduct").unwrap_or(0);
    let num_configurations = read_sysfs_u32(device_path, "bNumConfigurations").unwrap_or(1);

    let manufacturer_string = read_sysfs_attr(device_path, "manufacturer");
    let product_string = read_sysfs_attr(device_path, "product");
    let serial_number_string = read_sysfs_attr(device_path, "serial");

    NativeDeviceDescriptor {
        usb_version,
        device_class,
        device_subclass,
        device_protocol,
        max_packet_size0,
        vendor_id,
        product_id,
        device_version,
        manufacturer_string,
        product_string,
        serial_number_string,
        num_configurations,
    }
}

// ---------------------------------------------------------------------------
// Public: read a single device
// ---------------------------------------------------------------------------

pub fn read_device(sysfs_path: &Path) -> Result<NativeUSBDevice> {
    if !sysfs_path.exists() {
        return Err(Error::from_reason(format!(
            "sysfs path does not exist: {}",
            sysfs_path.display()
        )));
    }

    let bus_number = read_sysfs_u32(sysfs_path, "busnum").ok_or_else(|| {
        Error::from_reason(format!(
            "Missing busnum at {}",
            sysfs_path.display()
        ))
    })?;

    let device_address = read_sysfs_u32(sysfs_path, "devnum").unwrap_or(0);

    let dir_name = sysfs_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let port_path = dir_name.clone();

    let speed_raw = read_sysfs_attr(sysfs_path, "speed").unwrap_or_default();
    let speed = speed_str(&speed_raw);

    let vendor_id = read_sysfs_hex(sysfs_path, "idVendor").unwrap_or(0);
    let product_id = read_sysfs_hex(sysfs_path, "idProduct").unwrap_or(0);

    let manufacturer = read_sysfs_attr(sysfs_path, "manufacturer");
    let product = read_sysfs_attr(sysfs_path, "product");
    let serial_number = read_sysfs_attr(sysfs_path, "serial");

    let device_class = read_sysfs_hex(sysfs_path, "bDeviceClass").unwrap_or(0);
    let device_subclass = read_sysfs_hex(sysfs_path, "bDeviceSubClass").unwrap_or(0);
    let device_protocol = read_sysfs_hex(sysfs_path, "bDeviceProtocol").unwrap_or(0);

    let descriptor = read_device_descriptor(sysfs_path);
    let configurations = read_configurations(sysfs_path);
    let raw_descriptors = read_raw_descriptors(sysfs_path);

    Ok(NativeUSBDevice {
        bus_number,
        device_address,
        port_path,
        speed,
        vendor_id,
        product_id,
        manufacturer,
        product,
        serial_number,
        device_class,
        device_subclass,
        device_protocol,
        sysfs_path: sysfs_path.to_string_lossy().to_string(),
        descriptor,
        configurations,
        raw_descriptors,
    })
}

// ---------------------------------------------------------------------------
// Public: enumerate all USB devices
// ---------------------------------------------------------------------------

pub fn enumerate_devices() -> Vec<NativeUSBDevice> {
    let sysfs_usb = Path::new("/sys/bus/usb/devices");
    let mut devices = Vec::new();

    let entries = match fs::read_dir(sysfs_usb) {
        Ok(e) => e,
        Err(_) => return devices,
    };

    let mut paths: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            // Skip interface directories (contain ':')
            if name.contains(':') {
                return None;
            }
            let path = e.path();
            if !path.is_dir() {
                return None;
            }
            // Must have a busnum attribute to be a real device node
            if !path.join("busnum").exists() {
                return None;
            }
            Some(path)
        })
        .collect();

    paths.sort();

    for path in paths {
        match read_device(&path) {
            Ok(dev) => devices.push(dev),
            Err(_) => {
                // Skip devices we can't read (permission issues, hot-unplug, etc.)
            }
        }
    }

    devices
}
