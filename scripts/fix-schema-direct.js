const mysql = require('mysql2/promise');

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'nextjs_login'
        });

        const tables = ['students', 'teachers', 'subjects', 'departments', 'class_levels', 'users', 'rooms'];

        for (const table of tables) {
            try {
                // Check if column exists first to be safe, or just try ADD
                // Trying ADD catch error is easier
                await connection.execute(`ALTER TABLE ${table} ADD COLUMN updatedAt DATETIME`);
                console.log(`Added updatedAt to ${table}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`${table} already has updatedAt`);
                } else {
                    console.error(`Error altering ${table}:`, e.message);
                }
            }
        }

        // Also add studentId to students if missing? No, user said login logic is top ID.
        // Assuming schema is otherwise correct.

        await connection.end();
    } catch (e) {
        console.error('Connection failed:', e.message);
    }
}

main();
