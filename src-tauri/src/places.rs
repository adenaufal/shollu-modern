use rusqlite::{params, Connection};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct City {
    pub id: i32,
    pub region_id: i32,
    pub region_name: String,
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Region {
    pub id: i32,
    pub name: String,
}

pub struct CityRecord {
    pub name: String,
    pub latitude: f32,
    pub longitude: f32,
}

pub struct RegionRecord {
    pub name: String,
    pub cities: Vec<CityRecord>,
}

/// Parse a legacy `.spn` binary file
pub fn parse_spn_file(file_path: &Path) -> Result<Vec<RegionRecord>, String> {
    let file = File::open(file_path).map_err(|e| format!("Failed to open spn file '{}': {}", file_path.display(), e))?;
    let mut reader = BufReader::new(file);

    // Read magic marker (2 bytes)
    let mut magic = [0u8; 2];
    reader.read_exact(&mut magic).map_err(|e| format!("Failed to read magic: {}", e))?;
    if magic[0] != 0xEB || magic[1] != 0x00 {
        return Err(format!("Invalid magic: expected 0xEB00, got {:02X}{:02X}", magic[0], magic[1]));
    }

    // Read version (12 bytes)
    let mut version = [0u8; 12];
    reader.read_exact(&mut version).map_err(|e| format!("Failed to read version: {}", e))?;

    // Read number of administrative regions (u16, little-endian)
    let mut adm_cnt_bytes = [0u8; 2];
    reader.read_exact(&mut adm_cnt_bytes).map_err(|e| format!("Failed to read adm count: {}", e))?;
    let _adm_cnt = u16::from_le_bytes(adm_cnt_bytes);

    let mut regions = Vec::new();
    let mut current_byte = [0u8; 1];

    // Read first separator (must be 0xFA)
    if reader.read_exact(&mut current_byte).is_err() {
        return Ok(regions);
    }

    while current_byte[0] == 0xFA {
        // Read region name length (1 byte)
        let mut b2 = [0u8; 1];
        reader.read_exact(&mut b2).map_err(|e| format!("Failed to read region name len: {}", e))?;
        let name_len = b2[0] as usize;

        // Read region name
        let mut name_buf = vec![0u8; name_len];
        reader.read_exact(&mut name_buf).map_err(|e| format!("Failed to read region name: {}", e))?;
        let region_name = String::from_utf8_lossy(&name_buf).to_string();

        let mut cities = Vec::new();

        // Read next byte: can be 0xFA (next region), city_len (city), or EOF
        let mut check_byte = [0u8; 1];
        if reader.read_exact(&mut check_byte).is_err() {
            regions.push(RegionRecord {
                name: region_name,
                cities,
            });
            break;
        }

        while check_byte[0] != 0xFA {
            let city_len = check_byte[0] as usize;
            if city_len == 0 {
                break;
            }

            // Read city name
            let mut city_name_buf = vec![0u8; city_len];
            reader.read_exact(&mut city_name_buf).map_err(|e| format!("Failed to read city name: {}", e))?;
            let city_name = String::from_utf8_lossy(&city_name_buf).to_string();

            // Read latitude (f32, 4 bytes)
            let mut lat_bytes = [0u8; 4];
            reader.read_exact(&mut lat_bytes).map_err(|e| format!("Failed to read latitude: {}", e))?;
            let latitude = f32::from_le_bytes(lat_bytes);

            // Read longitude (f32, 4 bytes)
            let mut lon_bytes = [0u8; 4];
            reader.read_exact(&mut lon_bytes).map_err(|e| format!("Failed to read longitude: {}", e))?;
            let longitude = f32::from_le_bytes(lon_bytes);

            cities.push(CityRecord {
                name: city_name,
                latitude,
                longitude,
            });

            // Read next byte for loop condition
            if reader.read_exact(&mut check_byte).is_err() {
                break;
            }
        }

        regions.push(RegionRecord {
            name: region_name,
            cities,
        });

        current_byte[0] = check_byte[0];
    }

    Ok(regions)
}

/// Initialize the SQLite database and migrate `.spn` files
pub fn init_db(db_path: &Path, spn_dir: &Path) -> Result<(), String> {
    let mut conn = Connection::open(db_path).map_err(|e| format!("Failed to open DB '{}': {}", db_path.display(), e))?;

    // Create tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS regions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create regions table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS cities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region_id INTEGER NOT NULL REFERENCES regions(id),
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            UNIQUE(region_id, name)
        )",
        [],
    ).map_err(|e| format!("Failed to create cities table: {}", e))?;

    // Create indexes
    conn.execute("CREATE INDEX IF NOT EXISTS cities_region_idx ON cities (region_id)", [])
        .map_err(|e| format!("Failed to create region index: {}", e))?;
    conn.execute("CREATE INDEX IF NOT EXISTS cities_name_idx ON cities (name COLLATE NOCASE)", [])
        .map_err(|e| format!("Failed to create name index: {}", e))?;

    // Check if the database has cities already
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM cities", [], |r| r.get(0))
        .unwrap_or(0);

    if count > 0 {
        return Ok(());
    }

    // Migrate `.spn` files if database is empty
    if spn_dir.exists() {
        let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;
        
        let paths = std::fs::read_dir(spn_dir).map_err(|e| format!("Failed to read spn dir: {}", e))?;
        for path_res in paths {
            let path_entry = path_res.map_err(|e| format!("Failed to parse dir entry: {}", e))?;
            let path = path_entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("spn") || path.extension().and_then(|s| s.to_str()) == Some("SPN") {
                if let Ok(region_records) = parse_spn_file(&path) {
                    for region_record in region_records {
                        // Skip empty regions or malformed data
                        if region_record.name.trim().is_empty() {
                            continue;
                        }

                        // Insert region
                        let _ = tx.execute(
                            "INSERT OR IGNORE INTO regions (name) VALUES (?)",
                            params![region_record.name],
                        );

                        let region_id: i32 = tx.query_row(
                            "SELECT id FROM regions WHERE name = ?",
                            params![region_record.name],
                            |row| row.get(0),
                        ).unwrap_or(0);

                        if region_id == 0 {
                            continue;
                        }

                        // Insert cities inside transaction for speed
                        for city in region_record.cities {
                            if city.name.trim().is_empty() {
                                continue;
                            }
                            let _ = tx.execute(
                                "INSERT OR IGNORE INTO cities (region_id, name, latitude, longitude) VALUES (?, ?, ?, ?)",
                                params![region_id, city.name, city.latitude as f64, city.longitude as f64],
                            );
                        }
                    }
                }
            }
        }
        tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    }

    Ok(())
}

/// Search cities by query pattern
pub fn search_cities(db_path: &Path, query: &str, limit: usize) -> Result<Vec<City>, String> {
    let conn = Connection::open(db_path).map_err(|e| format!("Failed to open DB '{}': {}", db_path.display(), e))?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.region_id, r.name, c.name, c.latitude, c.longitude
             FROM cities c
             JOIN regions r ON c.region_id = r.id
             WHERE c.name LIKE ? ESCAPE '\\' OR r.name LIKE ? ESCAPE '\\'
             ORDER BY c.name ASC
             LIMIT ?",
        )
        .map_err(|e| format!("Failed to prepare search query: {}", e))?;

    let wildcard_query = format!("%{}%", query.replace('%', "\\%").replace('_', "\\_"));
    let rows = stmt
        .query_map(params![wildcard_query, wildcard_query, limit as i64], |row| {
            Ok(City {
                id: row.get(0)?,
                region_id: row.get(1)?,
                region_name: row.get(2)?,
                name: row.get(3)?,
                latitude: row.get(4)?,
                longitude: row.get(5)?,
            })
        })
        .map_err(|e| format!("City search query failed for '{}': {}", query, e))?;

    let results: Vec<City> = rows.flatten().collect();
    Ok(results)
}

/// List all administrative regions
pub fn list_regions(db_path: &Path) -> Result<Vec<Region>, String> {
    let conn = Connection::open(db_path).map_err(|e| format!("Failed to open DB '{}': {}", db_path.display(), e))?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM regions ORDER BY name ASC")
        .map_err(|e| format!("Failed to prepare regions query: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Region {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| format!("Regions query failed: {}", e))?;

    let results: Vec<Region> = rows.flatten().collect();
    Ok(results)
}

/// List all cities belonging to a region
pub fn cities_by_region(db_path: &Path, region_id: i32) -> Result<Vec<City>, String> {
    let conn = Connection::open(db_path).map_err(|e| format!("Failed to open DB '{}': {}", db_path.display(), e))?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.region_id, r.name, c.name, c.latitude, c.longitude
             FROM cities c
             JOIN regions r ON c.region_id = r.id
             WHERE c.region_id = ?
             ORDER BY c.name ASC",
        )
        .map_err(|e| format!("Failed to prepare cities-by-region query: {}", e))?;

    let rows = stmt
        .query_map(params![region_id], |row| {
            Ok(City {
                id: row.get(0)?,
                region_id: row.get(1)?,
                region_name: row.get(2)?,
                name: row.get(3)?,
                latitude: row.get(4)?,
                longitude: row.get(5)?,
            })
        })
        .map_err(|e| format!("Cities-by-region query failed for region_id={}: {}", region_id, e))?;

    let results: Vec<City> = rows.flatten().collect();
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn get_test_spn_dir() -> PathBuf {
        let mut p = PathBuf::from("placenames");
        if !p.exists() {
            p = PathBuf::from("src-tauri/placenames");
        }
        p
    }

    #[test]
    fn test_spn_parser() {
        let spn_dir = get_test_spn_dir();
        let spn_path = spn_dir.join("Indonesia.spn");
        let regions = parse_spn_file(&spn_path).expect("Failed to parse spn file");
        assert!(!regions.is_empty());
        
        // Check that we got regions and cities
        let first_region = &regions[0];
        assert!(!first_region.name.is_empty());
        assert!(!first_region.cities.is_empty());
        
        let first_city = &first_region.cities[0];
        assert!(!first_city.name.is_empty());
        assert!(first_city.latitude != 0.0);
        assert!(first_city.longitude != 0.0);
    }

    #[test]
    fn test_db_operations() {
        let temp_dir = std::env::temp_dir();
        let db_path = temp_dir.join("shollu_test_cities.db");
        let spn_dir = get_test_spn_dir();

        if db_path.exists() {
            let _ = std::fs::remove_file(&db_path);
        }

        let init_res = init_db(&db_path, &spn_dir);
        assert!(init_res.is_ok(), "DB Init error: {:?}", init_res.err());

        // List regions
        let regions = list_regions(&db_path);
        assert!(regions.is_ok());
        let reg_list = regions.unwrap();
        assert!(!reg_list.is_empty());

        // Search
        let search_res = search_cities(&db_path, "Pekanbaru", 10);
        assert!(search_res.is_ok());
        let search_list = search_res.unwrap();
        assert!(!search_list.is_empty());
        assert!(search_list[0].name.contains("Pekanbaru"));

        let _ = std::fs::remove_file(&db_path);
    }
}
