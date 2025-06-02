import jwt from 'jsonwebtoken'
import { query } from '../db.js'

export const verifyToken = async (token) => {
    try {
        // Verify the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production')
        
        // Get user from database
        const userResult = await query(
            'SELECT id, email FROM users WHERE id = $1',
            [decoded.userId]
        )

        if (userResult.rows.length === 0) {
            return null
        }

        return userResult.rows[0]
    } catch (error) {
        console.error('Token verification error:', error)
        return null
    }
} 