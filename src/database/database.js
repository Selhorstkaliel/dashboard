const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database.sqlite';

class Database {
    constructor() {
        this.db = null;
    }

    init() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        // Users table with hierarchy
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'representante', 'vendedor', 'cliente')),
                parent_id INTEGER,
                discount_percentage DECIMAL(5,2) DEFAULT 0.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) console.error('Error creating users table:', err.message);
        });

        // Contracts table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS contracts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                seller_id INTEGER NOT NULL,
                representative_id INTEGER NOT NULL,
                contract_value DECIMAL(10,2) NOT NULL,
                discount_applied DECIMAL(5,2) DEFAULT 0.00,
                net_value DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES users(id),
                FOREIGN KEY (seller_id) REFERENCES users(id),
                FOREIGN KEY (representative_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) console.error('Error creating contracts table:', err.message);
        });

        // Support tickets table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                subject VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'open',
                priority VARCHAR(10) DEFAULT 'medium',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) console.error('Error creating tickets table:', err.message);
        });

        // Create default admin user if not exists
        this.createDefaultAdmin();
    }

    createDefaultAdmin() {
        const bcrypt = require('bcryptjs');
        const defaultPassword = 'admin123';
        
        bcrypt.hash(defaultPassword, 10, (err, hash) => {
            if (err) {
                console.error('Error hashing password:', err);
                return;
            }

            this.db.run(`
                INSERT OR IGNORE INTO users (username, email, password_hash, user_type)
                VALUES (?, ?, ?, ?)
            `, ['admin', 'admin@dashboard.com', hash, 'admin'], (err) => {
                if (err) {
                    console.error('Error creating default admin:', err.message);
                } else {
                    console.log('Default admin user created (username: admin, password: admin123)');
                }
            });
        });
    }

    getDb() {
        return this.db;
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = new Database();