import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'

export const register = async (req, res) => {
    try {
        const { email, password } = req.body

        const existingUser = await query('SELECT * FROM users WHERE email = $1', [email])
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        await query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hashedPassword])

        res.json({ success: true, message: 'Registration successful' })
    } catch (error) {
        console.error('Registration error:', error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        const result = await query('SELECT * FROM users WHERE email = $1', [email])
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' })
        }

        const user = result.rows[0]
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' })
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production',
            { expiresIn: '1d' }
        )

        await query(
            'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 day\')',
            [user.id, token]
        )

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
}

export const verify = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' })
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production'
        )

        const session = await query(
            'SELECT * FROM sessions WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
            [decoded.userId, token]
        )

        if (session.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid or expired session' })
        }

        const user = await query('SELECT id, email FROM users WHERE id = $1', [decoded.userId])
        if (user.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        res.json({ success: true, user: user.rows[0] })
    } catch (error) {
        console.error('Token verification error:', error)
        res.status(401).json({ success: false, message: 'Invalid token' })
    }
} 