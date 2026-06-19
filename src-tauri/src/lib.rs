use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create track table",
            sql: "CREATE TABLE track (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#6c8cff',
                icon TEXT,
                format TEXT NOT NULL DEFAULT 'roadmap',
                settings TEXT NOT NULL DEFAULT '{}',
                goal TEXT,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create sprint table",
            sql: "CREATE TABLE sprint (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                start_date TEXT,
                end_date TEXT,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create topic table",
            sql: "CREATE TABLE topic (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sprint_id INTEGER NOT NULL REFERENCES sprint(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'backlog',
                est_hours REAL NOT NULL DEFAULT 0,
                markdown TEXT NOT NULL DEFAULT '',
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create task table",
            sql: "CREATE TABLE task (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                link TEXT,
                difficulty TEXT,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add sprint description",
            sql: "ALTER TABLE sprint ADD COLUMN description TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add track description",
            sql: "ALTER TABLE track ADD COLUMN description TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add track tags",
            sql: "ALTER TABLE track ADD COLUMN tags TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create problem table",
            sql: "CREATE TABLE problem (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                url TEXT,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                pattern TEXT,
                solved INTEGER NOT NULL DEFAULT 0,
                solved_at TEXT,
                notes TEXT,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "drop problem table",
            sql: "DROP TABLE IF EXISTS problem;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "create branch table",
            sql: "CREATE TABLE branch (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "create branch_item table",
            sql: "CREATE TABLE branch_item (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                branch_id INTEGER NOT NULL REFERENCES branch(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "create cycle_history table",
            sql: "CREATE TABLE cycle_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                idx INTEGER NOT NULL,
                success INTEGER NOT NULL,
                done_count INTEGER NOT NULL,
                total_count INTEGER NOT NULL,
                ended_at TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "create cycle_item table",
            sql: "CREATE TABLE cycle_item (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                target INTEGER NOT NULL DEFAULT 1,
                count INTEGER NOT NULL DEFAULT 0,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "drop branch_item table",
            sql: "DROP TABLE IF EXISTS branch_item;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "drop branch table",
            sql: "DROP TABLE IF EXISTS branch;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "add cycle_item description",
            sql: "ALTER TABLE cycle_item ADD COLUMN description TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "create simple_item table",
            sql: "CREATE TABLE simple_item (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                sort INTEGER NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "create habit_checkin table",
            sql: "CREATE TABLE habit_checkin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                date TEXT NOT NULL,
                UNIQUE(track_id, date)
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "create activity table",
            sql: "CREATE TABLE activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                kind TEXT NOT NULL,
                delta INTEGER NOT NULL DEFAULT 1,
                at TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "add est_days to simple_item",
            sql: "ALTER TABLE simple_item ADD COLUMN est_days INTEGER NOT NULL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "add description to simple_item",
            sql: "ALTER TABLE simple_item ADD COLUMN description TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "create space table",
            sql: "CREATE TABLE space (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, goal TEXT, sort INTEGER NOT NULL DEFAULT 0);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "add space_id to track",
            sql: "ALTER TABLE track ADD COLUMN space_id INTEGER REFERENCES space(id) ON DELETE SET NULL;",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:studyplanner.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
