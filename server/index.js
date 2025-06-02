import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import authRoutes from './routes/auth.routes.js'
import { initSocket } from './socket.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Middleware
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)

// Initialize Socket.IO
initSocket(httpServer)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
}) 