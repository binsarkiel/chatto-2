import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chatto'
})

export const query = async (text, params) => {
    try {
        const result = await pool.query(text, params)
        return result
    } catch (error) {
        console.error('Database query error:', error)
        throw error
    }
}

export const getClient = async () => {
    const client = await pool.connect()
    return client
}

export default {
    query,
    getClient
} 