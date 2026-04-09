// descriptor.rs — Binary USB descriptor parsing

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

#[napi(object)]
#[derive(Debug, Clone)]
pub struct DescriptorField {
    pub name: String,
    pub offset: u32,
    pub size: u32,
    pub raw_bytes: Vec<u32>,
    pub value: u32,
    pub description: String,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ParsedDescriptor {
    pub descriptor_type: String,
    pub fields: Vec<DescriptorField>,
    pub raw_bytes: Vec<u32>,
    pub total_length: u32,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn read_u16_le(data: &[u8], offset: usize) -> u32 {
    if offset + 1 < data.len() {
        (data[offset] as u32) | ((data[offset + 1] as u32) << 8)
    } else if offset < data.len() {
        data[offset] as u32
    } else {
        0
    }
}

fn byte_at(data: &[u8], offset: usize) -> u32 {
    if offset < data.len() {
        data[offset] as u32
    } else {
        0
    }
}

fn make_field(
    name: &str,
    offset: u32,
    size: u32,
    value: u32,
    description: String,
    data: &[u8],
) -> DescriptorField {
    let start = offset as usize;
    let end = (offset + size) as usize;
    let raw_bytes: Vec<u32> = data
        .get(start..end.min(data.len()))
        .unwrap_or(&[])
        .iter()
        .map(|b| *b as u32)
        .collect();
    DescriptorField {
        name: name.to_string(),
        offset,
        size,
        raw_bytes,
        value,
        description,
    }
}

fn device_class_name(class: u32) -> &'static str {
    match class {
        0x00 => "Use class info in Interface Descriptors",
        0x01 => "Audio",
        0x02 => "Communications and CDC Control",
        0x03 => "HID (Human Interface Device)",
        0x05 => "Physical",
        0x06 => "Image",
        0x07 => "Printer",
        0x08 => "Mass Storage",
        0x09 => "Hub",
        0x0A => "CDC-Data",
        0x0B => "Smart Card",
        0x0D => "Content Security",
        0x0E => "Video",
        0x0F => "Personal Healthcare",
        0x10 => "Audio/Video Devices",
        0xDC => "Diagnostic Device",
        0xE0 => "Wireless Controller",
        0xEF => "Miscellaneous",
        0xFE => "Application Specific",
        0xFF => "Vendor Specific",
        _ => "Unknown",
    }
}

fn transfer_type_name(tt: u32) -> &'static str {
    match tt & 0x03 {
        0x00 => "Control",
        0x01 => "Isochronous",
        0x02 => "Bulk",
        0x03 => "Interrupt",
        _ => "Unknown",
    }
}

// ---------------------------------------------------------------------------
// Device descriptor (18 bytes)
// ---------------------------------------------------------------------------

pub fn parse_device_descriptor(data: &[u8]) -> ParsedDescriptor {
    let raw_bytes: Vec<u32> = data.iter().map(|b| *b as u32).collect();

    let b_length = byte_at(data, 0);
    let b_descriptor_type = byte_at(data, 1);
    let bcd_usb = read_u16_le(data, 2);
    let b_device_class = byte_at(data, 4);
    let b_device_sub_class = byte_at(data, 5);
    let b_device_protocol = byte_at(data, 6);
    let b_max_packet_size0 = byte_at(data, 7);
    let id_vendor = read_u16_le(data, 8);
    let id_product = read_u16_le(data, 10);
    let bcd_device = read_u16_le(data, 12);
    let i_manufacturer = byte_at(data, 14);
    let i_product = byte_at(data, 15);
    let i_serial_number = byte_at(data, 16);
    let b_num_configurations = byte_at(data, 17);

    // Format bcdUSB as version string like "2.00"
    let usb_ver_major = (bcd_usb >> 8) & 0xFF;
    let usb_ver_minor = (bcd_usb >> 4) & 0x0F;
    let usb_ver_sub = bcd_usb & 0x0F;
    let usb_version_str = if usb_ver_sub == 0 {
        format!("USB {}.{:02}", usb_ver_major, usb_ver_minor)
    } else {
        format!("USB {}.{:02}.{}", usb_ver_major, usb_ver_minor, usb_ver_sub)
    };

    // bcdDevice version
    let dev_major = (bcd_device >> 8) & 0xFF;
    let dev_minor = (bcd_device >> 4) & 0x0F;
    let dev_sub = bcd_device & 0x0F;
    let dev_version_str = if dev_sub == 0 {
        format!("{}.{:02}", dev_major, dev_minor)
    } else {
        format!("{}.{:02}.{}", dev_major, dev_minor, dev_sub)
    };

    let fields = vec![
        make_field("bLength", 0, 1, b_length,
            format!("{} bytes", b_length), data),
        make_field("bDescriptorType", 1, 1, b_descriptor_type,
            "Device Descriptor".to_string(), data),
        make_field("bcdUSB", 2, 2, bcd_usb,
            usb_version_str, data),
        make_field("bDeviceClass", 4, 1, b_device_class,
            device_class_name(b_device_class).to_string(), data),
        make_field("bDeviceSubClass", 5, 1, b_device_sub_class,
            format!("0x{:02X}", b_device_sub_class), data),
        make_field("bDeviceProtocol", 6, 1, b_device_protocol,
            format!("0x{:02X}", b_device_protocol), data),
        make_field("bMaxPacketSize0", 7, 1, b_max_packet_size0,
            format!("{} bytes", b_max_packet_size0), data),
        make_field("bNumConfigurations", 17, 1, b_num_configurations,
            format!("{} configuration(s)", b_num_configurations), data),
        make_field("idVendor", 8, 2, id_vendor,
            format!("0x{:04X}", id_vendor), data),
        make_field("idProduct", 10, 2, id_product,
            format!("0x{:04X}", id_product), data),
        make_field("bcdDevice", 12, 2, bcd_device,
            dev_version_str, data),
        make_field("iManufacturer", 14, 1, i_manufacturer,
            if i_manufacturer == 0 { "No string".to_string() }
            else { format!("String index {}", i_manufacturer) }, data),
        make_field("iProduct", 15, 1, i_product,
            if i_product == 0 { "No string".to_string() }
            else { format!("String index {}", i_product) }, data),
        make_field("iSerialNumber", 16, 1, i_serial_number,
            if i_serial_number == 0 { "No string".to_string() }
            else { format!("String index {}", i_serial_number) }, data),
    ];

    ParsedDescriptor {
        descriptor_type: "DEVICE".to_string(),
        fields,
        raw_bytes,
        total_length: b_length,
    }
}

// ---------------------------------------------------------------------------
// Configuration descriptor (9 bytes)
// ---------------------------------------------------------------------------

pub fn parse_configuration_descriptor(data: &[u8]) -> ParsedDescriptor {
    let raw_bytes: Vec<u32> = data.iter().map(|b| *b as u32).collect();

    let b_length = byte_at(data, 0);
    let b_descriptor_type = byte_at(data, 1);
    let w_total_length = read_u16_le(data, 2);
    let b_num_interfaces = byte_at(data, 4);
    let b_configuration_value = byte_at(data, 5);
    let i_configuration = byte_at(data, 6);
    let bm_attributes = byte_at(data, 7);
    let b_max_power = byte_at(data, 8);

    let self_powered = if bm_attributes & 0x40 != 0 { "Self-powered" } else { "Bus-powered" };
    let remote_wakeup = if bm_attributes & 0x20 != 0 { ", Remote Wakeup" } else { "" };
    let attributes_desc = format!("0x{:02X} ({}{})", bm_attributes, self_powered, remote_wakeup);

    let fields = vec![
        make_field("bLength", 0, 1, b_length,
            format!("{} bytes", b_length), data),
        make_field("bDescriptorType", 1, 1, b_descriptor_type,
            "Configuration Descriptor".to_string(), data),
        make_field("wTotalLength", 2, 2, w_total_length,
            format!("{} bytes total", w_total_length), data),
        make_field("bNumInterfaces", 4, 1, b_num_interfaces,
            format!("{} interface(s)", b_num_interfaces), data),
        make_field("bConfigurationValue", 5, 1, b_configuration_value,
            format!("Configuration {}", b_configuration_value), data),
        make_field("iConfiguration", 6, 1, i_configuration,
            if i_configuration == 0 { "No string".to_string() }
            else { format!("String index {}", i_configuration) }, data),
        make_field("bmAttributes", 7, 1, bm_attributes,
            attributes_desc, data),
        make_field("bMaxPower", 8, 1, b_max_power,
            format!("{} mA", b_max_power * 2), data),
        make_field("bNumConfigurations", 4, 1, b_num_interfaces,
            format!("{} interface(s)", b_num_interfaces), data),
    ];

    ParsedDescriptor {
        descriptor_type: "CONFIGURATION".to_string(),
        fields,
        raw_bytes,
        total_length: b_length,
    }
}

// ---------------------------------------------------------------------------
// Interface descriptor (9 bytes)
// ---------------------------------------------------------------------------

pub fn parse_interface_descriptor(data: &[u8]) -> ParsedDescriptor {
    let raw_bytes: Vec<u32> = data.iter().map(|b| *b as u32).collect();

    let b_length = byte_at(data, 0);
    let b_descriptor_type = byte_at(data, 1);
    let b_interface_number = byte_at(data, 2);
    let b_alternate_setting = byte_at(data, 3);
    let b_num_endpoints = byte_at(data, 4);
    let b_interface_class = byte_at(data, 5);
    let b_interface_sub_class = byte_at(data, 6);
    let b_interface_protocol = byte_at(data, 7);
    let i_interface = byte_at(data, 8);

    let fields = vec![
        make_field("bLength", 0, 1, b_length,
            format!("{} bytes", b_length), data),
        make_field("bDescriptorType", 1, 1, b_descriptor_type,
            "Interface Descriptor".to_string(), data),
        make_field("bInterfaceNumber", 2, 1, b_interface_number,
            format!("Interface {}", b_interface_number), data),
        make_field("bAlternateSetting", 3, 1, b_alternate_setting,
            format!("Alternate setting {}", b_alternate_setting), data),
        make_field("bNumEndpoints", 4, 1, b_num_endpoints,
            format!("{} endpoint(s)", b_num_endpoints), data),
        make_field("bInterfaceClass", 5, 1, b_interface_class,
            device_class_name(b_interface_class).to_string(), data),
        make_field("bInterfaceSubClass", 6, 1, b_interface_sub_class,
            format!("0x{:02X}", b_interface_sub_class), data),
        make_field("bInterfaceProtocol", 7, 1, b_interface_protocol,
            format!("0x{:02X}", b_interface_protocol), data),
        make_field("iInterface", 8, 1, i_interface,
            if i_interface == 0 { "No string".to_string() }
            else { format!("String index {}", i_interface) }, data),
    ];

    ParsedDescriptor {
        descriptor_type: "INTERFACE".to_string(),
        fields,
        raw_bytes,
        total_length: b_length,
    }
}

// ---------------------------------------------------------------------------
// Endpoint descriptor (7 bytes)
// ---------------------------------------------------------------------------

pub fn parse_endpoint_descriptor(data: &[u8]) -> ParsedDescriptor {
    let raw_bytes: Vec<u32> = data.iter().map(|b| *b as u32).collect();

    let b_length = byte_at(data, 0);
    let b_descriptor_type = byte_at(data, 1);
    let b_endpoint_address = byte_at(data, 2);
    let bm_attributes = byte_at(data, 3);
    let w_max_packet_size = read_u16_le(data, 4);
    let b_interval = byte_at(data, 6);

    let ep_num = b_endpoint_address & 0x0F;
    let direction = if b_endpoint_address & 0x80 != 0 { "IN" } else { "OUT" };
    let ep_address_desc = format!("0x{:02X} EP {} {}", b_endpoint_address, ep_num, direction);

    let transfer_type = transfer_type_name(bm_attributes);
    // For Interrupt/Bulk/Control, just show the transfer type name.
    // Isochronous endpoints include sync and usage detail.
    let attributes_desc = if (bm_attributes & 0x03) == 0x01 {
        // Isochronous — include sync and usage
        let sync_type = match (bm_attributes >> 2) & 0x03 {
            0 => "No Sync",
            1 => "Async",
            2 => "Adaptive",
            3 => "Sync",
            _ => "Unknown",
        };
        let usage_type = match (bm_attributes >> 4) & 0x03 {
            0 => "Data",
            1 => "Feedback",
            2 => "Implicit Feedback Data",
            _ => "Unknown",
        };
        format!("{} ({}, {})", transfer_type, sync_type, usage_type)
    } else {
        transfer_type.to_string()
    };

    let fields = vec![
        make_field("bLength", 0, 1, b_length,
            format!("{} bytes", b_length), data),
        make_field("bDescriptorType", 1, 1, b_descriptor_type,
            "Endpoint Descriptor".to_string(), data),
        make_field("bEndpointAddress", 2, 1, b_endpoint_address,
            ep_address_desc, data),
        make_field("bmAttributes", 3, 1, bm_attributes,
            attributes_desc, data),
        make_field("wMaxPacketSize", 4, 2, w_max_packet_size,
            format!("{} bytes", w_max_packet_size & 0x07FF), data),
        make_field("bInterval", 6, 1, b_interval,
            format!("{} ms", b_interval), data),
    ];

    ParsedDescriptor {
        descriptor_type: "ENDPOINT".to_string(),
        fields,
        raw_bytes,
        total_length: b_length,
    }
}

// ---------------------------------------------------------------------------
// Public NAPI dispatcher
// ---------------------------------------------------------------------------

#[napi]
pub fn parse_descriptor(raw_bytes: Vec<u32>, descriptor_type: String) -> ParsedDescriptor {
    let data: Vec<u8> = raw_bytes.iter().map(|b| *b as u8).collect();
    match descriptor_type.to_uppercase().as_str() {
        "DEVICE" => parse_device_descriptor(&data),
        "CONFIGURATION" => parse_configuration_descriptor(&data),
        "INTERFACE" => parse_interface_descriptor(&data),
        "ENDPOINT" => parse_endpoint_descriptor(&data),
        other => {
            // Unknown type — return a minimal parsed descriptor
            ParsedDescriptor {
                descriptor_type: other.to_string(),
                fields: vec![],
                raw_bytes: raw_bytes.clone(),
                total_length: raw_bytes.first().copied().unwrap_or(0),
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_device_descriptor() {
        let data: Vec<u8> = vec![
            0x12, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x08,
            0x6D, 0x04, 0x2B, 0xC5, 0x11, 0x22, 0x01, 0x02,
            0x00, 0x01,
        ];
        let result = parse_device_descriptor(&data);
        assert_eq!(result.descriptor_type, "DEVICE");
        assert_eq!(result.fields.len(), 14);
        assert_eq!(result.fields[8].name, "idVendor");
        assert_eq!(result.fields[8].value, 0x046D);
        assert_eq!(result.fields[9].name, "idProduct");
        assert_eq!(result.fields[9].value, 0xC52B);
    }

    #[test]
    fn test_parse_endpoint_descriptor() {
        let data: Vec<u8> = vec![0x07, 0x05, 0x81, 0x03, 0x08, 0x00, 0x0A];
        let result = parse_endpoint_descriptor(&data);
        assert_eq!(result.descriptor_type, "ENDPOINT");
        assert!(result.fields[2].description.contains("IN"));
        assert_eq!(result.fields[3].description, "Interrupt");
    }
}
