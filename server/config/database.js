const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, '../../data/emergency.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let SQL = null;

// Initialize database
async function initializeDatabase() {
    // Initialize SQL.js
    SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
        console.log('✅ Database loaded from file');
    } else {
        db = new SQL.Database();
        console.log('✅ New database created');

        // Load schema
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');

            // Run the whole schema in one call. Splitting on ';' and skipping
            // chunks that start with a comment dropped every CREATE TABLE.
            db.exec(schema);

            // Save initial database
            saveDatabase();
            console.log('✅ Database schema initialized');
        }
    }
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// Auto-save every 5 seconds
setInterval(() => {
    if (db) {
        saveDatabase();
    }
}, 5000);

// Save on exit
process.on('exit', () => {
    saveDatabase();
});

process.on('SIGINT', () => {
    saveDatabase();
    process.exit(0);
});

// Helper function to convert params
function convertParams(sql, params = {}) {
    let convertedSql = sql;
    const values = [];
    const paramKeys = [];

    // First, find all @param references in order
    const paramRegex = /@(\w+)\b/g;
    let match;
    while ((match = paramRegex.exec(sql)) !== null) {
        const paramName = match[1];
        if (!paramKeys.includes(paramName)) {
            paramKeys.push(paramName);
            values.push(params[paramName]);
        }
    }

    // Replace @param with ?
    convertedSql = sql.replace(/@\w+\b/g, '?');

    // Replace MSSQL-specific functions
    convertedSql = convertedSql
        .replace(/NEWID\(\)/g, "lower(hex(randomblob(16)))")
        .replace(/DATEADD\(HOUR,\s*(-?\d+),\s*GETDATE\(\)\)/g, "datetime('now', '$1 hours')")
        .replace(/DATEADD\(MINUTE,\s*(-?\d+),\s*GETDATE\(\)\)/g, "datetime('now', '$1 minutes')")
        .replace(/DATEADD\(SECOND,\s*(-?\d+),\s*GETDATE\(\)\)/g, "datetime('now', '$1 seconds')")
        .replace(/DATEADD\(DAY,\s*(-?\d+),\s*GETDATE\(\)\)/g, "datetime('now', '$1 days')")
        .replace(/GETDATE\(\)/g, "datetime('now')")
        .replace(/CAST\(([^)]+)\s+as\s+FLOAT\)/gi, 'CAST($1 as REAL)')
        .replace(/DATEDIFF\(SECOND,\s*([^,]+),\s*([^)]+)\)/g, "(strftime('%s', $2) - strftime('%s', $1))")
        .replace(/OUTPUT INSERTED\.\*/gi, '')
        .replace(/SCOPE_IDENTITY\(\)/g, 'last_insert_rowid()')
        .replace(/\[\[/g, '[').replace(/\]\]/g, ']');

    return { sql: convertedSql, values };
}

// Query function compatible with previous MSSQL code
async function query(sql, params = {}) {
    if (!db) {
        await initializeDatabase();
    }

    try {
        const { sql: convertedSql, values } = convertParams(sql, params);

        // Determine query type
        const isSelect = convertedSql.trim().toUpperCase().startsWith('SELECT');
        const isInsert = convertedSql.trim().toUpperCase().startsWith('INSERT');
        const isUpdate = convertedSql.trim().toUpperCase().startsWith('UPDATE');
        const isDelete = convertedSql.trim().toUpperCase().startsWith('DELETE');

        let result;

        if (isSelect) {
            const stmt = db.prepare(convertedSql);
            stmt.bind(values);
            const rows = [];
            while (stmt.step()) {
                rows.push(stmt.getAsObject());
            }
            stmt.free();
            result = { recordset: rows };
        } else if (isInsert) {
            db.run(convertedSql, values);
            const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];

            // Try to get the inserted row
            if (lastId) {
                const tableName = extractTableName(convertedSql);
                if (tableName) {
                    try {
                        const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
                        stmt.bind([lastId]);
                        const row = stmt.step() ? stmt.getAsObject() : { id: lastId };
                        stmt.free();
                        result = { recordset: [row] };
                    } catch (e) {
                        result = { recordset: [{ id: lastId }] };
                    }
                } else {
                    result = { recordset: [{ id: lastId }] };
                }
            } else {
                result = { recordset: [] };
            }
            saveDatabase();
        } else if (isUpdate || isDelete) {
            db.run(convertedSql, values);
            result = { recordset: [], rowsAffected: db.getRowsModified() };
            saveDatabase();
        } else {
            db.run(convertedSql, values);
            result = { recordset: [] };
            saveDatabase();
        }

        return result;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
}

function extractTableName(sql) {
    const match = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    return match ? match[1] : null;
}

// For compatibility
async function getPool() {
    if (!db) {
        await initializeDatabase();
    }
    return db;
}

module.exports = {
    initializeDatabase,
    query,
    getPool,
    saveDatabase
};
