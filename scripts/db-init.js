import { query } from '../server/db.js'

const createTables = async () => {
    await query(`
        -- Create updated_at trigger function
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Users table
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
            password VARCHAR(255) NOT NULL CHECK (length(password) >= 60), -- For bcrypt hashed passwords
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX users_email_idx ON users(email);
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Sessions table
        CREATE TABLE sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            CONSTRAINT valid_expiry CHECK (expires_at > created_at)
        );

        CREATE INDEX sessions_user_id_idx ON sessions(user_id);
        CREATE INDEX sessions_token_idx ON sessions(token);
        CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

        -- Chats table
        CREATE TABLE chats (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            is_group BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT valid_group_name CHECK (
                (is_group AND name IS NOT NULL AND length(trim(name)) > 0) OR
                (NOT is_group)
            )
        );

        CREATE INDEX chats_is_group_idx ON chats(is_group);
        CREATE TRIGGER update_chats_updated_at
            BEFORE UPDATE ON chats
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Chat participants table
        CREATE TABLE chat_participants (
            id SERIAL PRIMARY KEY,
            chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(chat_id, user_id)
        );

        CREATE INDEX chat_participants_chat_id_idx ON chat_participants(chat_id);
        CREATE INDEX chat_participants_user_id_idx ON chat_participants(user_id);
        CREATE INDEX chat_participants_chat_user_idx ON chat_participants(chat_id, user_id);

        -- Messages table
        CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL CHECK (length(trim(content)) > 0),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX messages_chat_id_idx ON messages(chat_id);
        CREATE INDEX messages_sender_id_idx ON messages(sender_id);
        CREATE INDEX messages_created_at_idx ON messages(created_at DESC);
        CREATE TRIGGER update_messages_updated_at
            BEFORE UPDATE ON messages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Create view for last messages
        CREATE OR REPLACE VIEW chat_last_messages AS
        SELECT DISTINCT ON (chat_id)
            chat_id,
            id as message_id,
            content,
            sender_id,
            created_at
        FROM messages
        ORDER BY chat_id, created_at DESC;
    `)
}

const dropTables = async () => {
    await query(`
        DROP VIEW IF EXISTS chat_last_messages CASCADE;
        DROP TABLE IF EXISTS messages CASCADE;
        DROP TABLE IF EXISTS chat_participants CASCADE;
        DROP TABLE IF EXISTS chats CASCADE;
        DROP TABLE IF EXISTS sessions CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
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