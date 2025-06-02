import { io } from 'socket.io-client'

let socket = null

export const initSocket = (token) => {
    if (socket) {
        socket.disconnect()
    }

    socket = io('http://localhost:5000', {
        auth: { token }
    })

    socket.on('connect', () => {
        console.log('Connected to socket server')
        // Join all user's chat rooms
        socket.emit('join_chats')
    })

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message)
    })

    return socket
}

export const getSocket = () => {
    if (!socket) {
        throw new Error('Socket not initialized. Call initSocket first.')
    }
    return socket
}

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect()
        socket = null
    }
} 