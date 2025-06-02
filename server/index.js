import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import authRoutes from './routes/auth.routes.js'
import chatRoutes from './routes/chat.routes.js'
import { initSocket } from './socket.js'

dotenv.config()

const app = express()
const server = createServer(app)

// Middleware
app.use(cors())

// Enhanced Morgan logging
morgan.token('user-id', (req) => req.user ? req.user.id : 'anonymous')
morgan.token('body', (req) => JSON.stringify(req.body))
app.use(morgan(':method :url :status :response-time ms - :user-id :body'))

app.use(express.json())

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'No token provided' })
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production'
        )
        req.user = { id: decoded.userId }
        next()
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' })
    }
}

// Routes
app.use('/auth', authRoutes)
app.use('/chats', authenticateToken, chatRoutes)

// Initialize socket.io
initSocket(server)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.debug('[Server] Routes mounted:')
    console.debug('[Server]   - /auth')
    console.debug('[Server]   - /chats')
    console.log(`Server running on port ${PORT}`)
}) 