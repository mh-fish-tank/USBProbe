// usb_ids.rs — USB ID database parser (usb.ids format)

use std::fs;

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ProductEntry {
    pub id: u32,
    pub name: String,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct VendorEntry {
    pub id: u32,
    pub name: String,
    pub products: Vec<ProductEntry>,
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/// Parse a usb.ids-format file from the given string content.
fn parse_ids_content(content: &str) -> Vec<VendorEntry> {
    let mut vendors: Vec<VendorEntry> = Vec::new();

    for line in content.lines() {
        // Skip comments
        if line.starts_with('#') {
            continue;
        }
        // Skip empty lines
        if line.trim().is_empty() {
            continue;
        }

        // Sub-products (two leading tabs) — skip
        if line.starts_with("\t\t") {
            continue;
        }

        // Products (one leading tab)
        if line.starts_with('\t') {
            let rest = &line[1..]; // strip one tab
            if let Some(product) = parse_hex_entry(rest) {
                if let Some(vendor) = vendors.last_mut() {
                    vendor.products.push(ProductEntry {
                        id: product.0,
                        name: product.1,
                    });
                }
            }
            continue;
        }

        // Vendor entry (no leading whitespace)
        if let Some(vendor) = parse_hex_entry(line) {
            vendors.push(VendorEntry {
                id: vendor.0,
                name: vendor.1,
                products: Vec::new(),
            });
        }
    }

    vendors
}

/// Parse a line of format `HHHH  Name...` returning (hex_id, name).
/// The usb.ids format uses exactly two spaces between the hex ID and the name.
fn parse_hex_entry(line: &str) -> Option<(u32, String)> {
    // Expect at least 4 hex chars, then two spaces, then name
    let parts: Vec<&str> = line.splitn(2, "  ").collect();
    if parts.len() < 2 {
        return None;
    }
    let id_str = parts[0].trim();
    let name = parts[1].trim().to_string();
    let id = u32::from_str_radix(id_str, 16).ok()?;
    Some((id, name))
}

// ---------------------------------------------------------------------------
// Public NAPI functions
// ---------------------------------------------------------------------------

/// Parse the system usb.ids database.
///
/// If `file_path` is provided, that path is used directly. Otherwise the
/// function tries a list of well-known locations.
#[napi]
pub fn parse_usb_ids(file_path: Option<String>) -> Vec<VendorEntry> {
    let candidates: Vec<String> = if let Some(p) = file_path {
        vec![p]
    } else {
        vec![
            "/usr/share/hwdata/usb.ids".to_string(),
            "/usr/share/misc/usb.ids".to_string(),
            "/usr/share/usb.ids".to_string(),
            "/var/lib/usbutils/usb.ids".to_string(),
        ]
    };

    for path in &candidates {
        if let Ok(content) = fs::read_to_string(path) {
            return parse_ids_content(&content);
        }
    }

    Vec::new()
}

/// Look up a vendor by VID in a pre-parsed list.
#[napi]
pub fn lookup_vendor(vendors: Vec<VendorEntry>, vid: u32) -> Option<VendorEntry> {
    vendors.into_iter().find(|v| v.id == vid)
}

/// Look up a product by VID+PID in a pre-parsed list.
#[napi]
pub fn lookup_product(vendors: Vec<VendorEntry>, vid: u32, pid: u32) -> Option<ProductEntry> {
    let vendor = vendors.into_iter().find(|v| v.id == vid)?;
    vendor.products.into_iter().find(|p| p.id == pid)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_sample() {
        let sample = "046d  Logitech, Inc.\n\tc52b  Unifying Receiver\n\tc534  Unifying Receiver\n04e8  Samsung Electronics Co., Ltd\n\t61f5  Portable SSD T5\n";
        std::fs::write("/tmp/test_usb_ids.txt", sample).unwrap();
        let vendors = parse_usb_ids(Some("/tmp/test_usb_ids.txt".into()));
        assert_eq!(vendors.len(), 2);
        assert_eq!(vendors[0].name, "Logitech, Inc.");
        assert_eq!(vendors[0].products.len(), 2);
    }

    #[test]
    fn test_lookup_vendor() {
        let sample = "046d  Logitech, Inc.\n\tc52b  Unifying Receiver\n";
        std::fs::write("/tmp/test_usb_ids_lookup.txt", sample).unwrap();
        let vendors = parse_usb_ids(Some("/tmp/test_usb_ids_lookup.txt".into()));
        let v = lookup_vendor(vendors.clone(), 0x046d);
        assert!(v.is_some());
        assert_eq!(v.unwrap().name, "Logitech, Inc.");
        assert!(lookup_vendor(vendors, 0xFFFF).is_none());
    }

    #[test]
    fn test_lookup_product() {
        let sample = "046d  Logitech, Inc.\n\tc52b  Unifying Receiver\n\tc534  Unifying Receiver\n";
        std::fs::write("/tmp/test_usb_ids_product.txt", sample).unwrap();
        let vendors = parse_usb_ids(Some("/tmp/test_usb_ids_product.txt".into()));
        let p = lookup_product(vendors, 0x046d, 0xc52b);
        assert!(p.is_some());
        assert_eq!(p.unwrap().name, "Unifying Receiver");
    }

    #[test]
    fn test_skip_comments_and_sub_products() {
        let sample = "# Comment line\n046d  Logitech, Inc.\n\tc52b  Unifying Receiver\n\t\t0000  Sub-product\n04e8  Samsung Electronics Co., Ltd\n";
        std::fs::write("/tmp/test_usb_ids_comments.txt", sample).unwrap();
        let vendors = parse_usb_ids(Some("/tmp/test_usb_ids_comments.txt".into()));
        assert_eq!(vendors.len(), 2);
        assert_eq!(vendors[0].products.len(), 1); // sub-product skipped
    }
}
