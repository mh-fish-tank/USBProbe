#[macro_use]
extern crate napi_derive;

mod device;
mod descriptor;
mod monitor;
mod usb_ids;

use napi::bindgen_prelude::*;
use device::{enumerate_devices, read_device, NativeUSBDevice};
use std::path::PathBuf;

#[napi]
pub fn list_devices() -> Vec<NativeUSBDevice> {
    enumerate_devices()
}

#[napi]
pub fn get_device_descriptor(sysfs_path: String) -> Result<NativeUSBDevice> {
    read_device(&PathBuf::from(sysfs_path))
}

#[napi]
pub fn get_raw_descriptor(sysfs_path: String) -> Result<Vec<u32>> {
    let path = PathBuf::from(&sysfs_path).join("descriptors");
    let bytes = std::fs::read(&path)
        .map_err(|e| napi::Error::from_reason(format!("Failed to read descriptors: {}", e)))?;
    Ok(bytes.iter().map(|b| *b as u32).collect())
}
