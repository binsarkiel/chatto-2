import { query } from '../server/db.js'

const createTables = async () => {
    await query(`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        );

        CREATE TABLE chats (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            is_group BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE chat_participants (
            id SERIAL PRIMARY KEY,
            chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(chat_id, user_id)
        );

        CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `)
}

const dropTables = async () => {
    await query(`
        DROP TABLE IF EXISTS messages CASCADE;
        DROP TABLE IF EXISTS chat_participants CASCADE;
        DROP TABLE IF EXISTS chats CASCADE;
        DROP TABLE IF EXISTS sessions CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
    `)
}

const initDatabase = async () => {
    try {
        const shouldRefresh = process.argv.includes('--refresh')
        
        if (shouldRefresh) {
            console.log('Refreshing database...')
            await dropTables()
        }

        console.log('Creating tables...')
        await createTables()

        console.log('Database initialization completed successfully!')
        process.exit(0)
    } catch (error) {
        console.error('Error initializing database:', error)
        process.exit(1)
    }
}

initDatabase() 