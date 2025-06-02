import { Server } from 'socket.io'
import { verifyToken } from './utils/auth.js'
import { query } from './db.js'

let io = null

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    })

    // Socket authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token
            if (!token) {
                return next(new Error('Authentication error: Token not provided'))
            }

            const user = await verifyToken(token)
            if (!user) {
                return next(new Error('Authentication error: Invalid token'))
            }

            socket.user = user
            console.log('Socket authenticated for user:', user.email)
            next()
        } catch (error) {
            console.error('Socket authentication error:', error)
            next(new Error('Authentication error'))
        }
    })

    io.on('connection', (socket) => {
        console.debug(`[Socket] User connected: ${socket.user.email} (${socket.id})`)

        // Join user's personal room for direct notifications
        socket.join(`user:${socket.user.id}`)
        console.debug(`[Socket] User ${socket.user.email} joined personal room: user:${socket.user.id}`)

        // Join user to their chat rooms
        socket.on('join_chats', async () => {
            try {
                console.debug(`[Socket] User ${socket.user.email} requesting to join their chat rooms`)
                // Leave all previous chat rooms first
                const rooms = [...socket.rooms]
                rooms.forEach(room => {
                    if (room.startsWith('chat:')) {
                        socket.leave(room)
                        console.debug(`[Socket] User ${socket.user.email} left room: ${room}`)
                    }
                })

                // Get all chats where user is a participant
                const result = await query(
                    'SELECT chat_id FROM chat_participants WHERE user_id = $1',
                    [socket.user.id]
                )

                // Join each chat room
                for (const row of result.rows) {
                    socket.join(`chat:${row.chat_id}`)
                    console.debug(`[Socket] User ${socket.user.email} joined chat room: chat:${row.chat_id}`)
                }
            } catch (error) {
                console.error('[Socket] Error joining chats:', error)
            }
        })

        // Handle new chat room joining
        socket.on('join_chat', ({ chat_id }) => {
            console.debug(`[Socket] User ${socket.user.email} requesting to join chat: ${chat_id}`)
            // Verify if user is participant of the chat before joining
            query(
                'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
                [chat_id, socket.user.id]
            ).then(result => {
                if (result.rows.length > 0) {
                    socket.join(`chat:${chat_id}`)
                    console.debug(`[Socket] User ${socket.user.email} joined chat room: chat:${chat_id}`)
                } else {
                    console.warn(`[Socket] User ${socket.user.email} attempted to join unauthorized chat: ${chat_id}`)
                }
            }).catch(error => {
                console.error('[Socket] Error verifying chat participation:', error)
            })
        })

        // Handle typing indicators
        socket.on('typing', ({ chat_id }) => {
            console.debug(`[Socket] User ${socket.user.email} typing in chat: ${chat_id}`)
            socket.to(`chat:${chat_id}`).emit('user_typing', {
                chat_id,
                user_email: socket.user.email
            })
        })

        socket.on('stop_typing', ({ chat_id }) => {
            console.debug(`[Socket] User ${socket.user.email} stopped typing in chat: ${chat_id}`)
            socket.to(`chat:${chat_id}`).emit('user_stop_typing', {
                chat_id,
                user_email: socket.user.email
            })
        })

        socket.on('disconnect', () => {
            console.debug(`[Socket] User disconnected: ${socket.user.email} (${socket.id})`)
        })
    })

    return io
}

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized')
    }
    return io
} 