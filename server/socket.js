import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { query } from './db.js'

let io

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173", // Vite's default port
            methods: ["GET", "POST"]
        }
    })

    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token
            if (!token) {
                return next(new Error('Authentication error'))
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production'
            )

            const result = await query('SELECT id, email FROM users WHERE id = $1', [decoded.userId])
            if (result.rows.length === 0) {
                return next(new Error('User not found'))
            }

            socket.user = result.rows[0]
            next()
        } catch (error) {
            next(new Error('Authentication error'))
        }
    })

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.email}`)

        // Join user to their chat rooms
        socket.on('join_chats', async () => {
            try {
                const result = await query(
                    'SELECT chat_id FROM chat_participants WHERE user_id = $1',
                    [socket.user.id]
                )
                result.rows.forEach(row => {
                    socket.join(`chat:${row.chat_id}`)
                })
            } catch (error) {
                console.error('Error joining chats:', error)
            }
        })

        // Handle new message
        socket.on('send_message', async (data) => {
            try {
                const { chat_id, content } = data
                
                // Verify user is participant of the chat
                const participantCheck = await query(
                    'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
                    [chat_id, socket.user.id]
                )
                
                if (participantCheck.rows.length === 0) {
                    socket.emit('error', { message: 'Not authorized to send message to this chat' })
                    return
                }

                // Save message to database
                const result = await query(
                    'INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
                    [chat_id, socket.user.id, content]
                )

                const messageData = {
                    id: result.rows[0].id,
                    chat_id,
                    sender_id: socket.user.id,
                    sender_email: socket.user.email,
                    content,
                    created_at: result.rows[0].created_at
                }

                // Broadcast message to all participants in the chat
                io.to(`chat:${chat_id}`).emit('new_message', messageData)
            } catch (error) {
                console.error('Error sending message:', error)
                socket.emit('error', { message: 'Failed to send message' })
            }
        })

        // Handle typing status
        socket.on('typing_start', (data) => {
            socket.to(`chat:${data.chat_id}`).emit('user_typing', {
                chat_id: data.chat_id,
                user_email: socket.user.email
            })
        })

        socket.on('typing_stop', (data) => {
            socket.to(`chat:${data.chat_id}`).emit('user_stop_typing', {
                chat_id: data.chat_id,
                user_email: socket.user.email
            })
        })

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.email}`)
        })
    })
}

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized')
    }
    return io
} 