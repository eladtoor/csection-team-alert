const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

async function resetDatabase() {
    console.log('🔄 Resetting database...');

    const dbPath = path.join(__dirname, 'data/emergency.db');
    const schemaPath = path.join(__dirname, 'database/schema.sql');

    // Delete existing database if it exists
    if (fs.existsSync(dbPath)) {
        try {
            fs.unlinkSync(dbPath);
            console.log('✅ Old database deleted');
        } catch (err) {
            console.log('⚠️  Could not delete old database (might be in use)');
            console.log('   Please stop the server first with Ctrl+C');
            process.exit(1);
        }
    }

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize SQL.js
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    console.log('✅ New database created');

    // Load schema
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📋 Loading schema...');

        try {
            // Execute the entire schema at once - sql.js can handle it
            db.exec(schema);
            console.log('✅ Schema executed successfully');

            // Verify tables were created
            const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");

            if (tables.length > 0 && tables[0].values.length > 0) {
                console.log('\n📊 Tables created:');
                tables[0].values.forEach(row => {
                    console.log(`   - ${row[0]}`);
                });
            }

            // Check data counts
            const counts = {
                TeamRoles: db.exec("SELECT COUNT(*) FROM TeamRoles")[0]?.values[0]?.[0] || 0,
                TeamMembers: db.exec("SELECT COUNT(*) FROM TeamMembers")[0]?.values[0]?.[0] || 0,
                CurrentShift: db.exec("SELECT COUNT(*) FROM CurrentShift")[0]?.values[0]?.[0] || 0
            };

            console.log('\n📊 Data inserted:');
            console.log(`   - Team Roles: ${counts.TeamRoles}`);
            console.log(`   - Team Members: ${counts.TeamMembers}`);
            console.log(`   - Active Shift Members: ${counts.CurrentShift}`);

            // Save database to file
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);

            const fileSize = fs.statSync(dbPath).size;
            console.log(`\n✅ Database saved: ${dbPath}`);
            console.log(`   File size: ${(fileSize / 1024).toFixed(2)} KB`);

            console.log('\n🎉 Database reset complete!');
            console.log('\n💡 Now restart your server with: npm run dev');
            console.log('   Or run both: npm run dev:all');

        } catch (err) {
            console.error('❌ Error executing schema:', err.message);
            console.error('\nFull error:', err);
            process.exit(1);
        }

    } else {
        console.error('❌ Schema file not found:', schemaPath);
        process.exit(1);
    }

    db.close();
}

resetDatabase().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
