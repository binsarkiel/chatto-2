import { io } from 'socket.io-client'

let socket = null

export const initSocket = (token) => {
    // If there's an existing socket, disconnect it first
    if (socket?.connected) {
        socket.disconnect()
    }

    // Create new socket connection
    socket = io('/', {
        path: '/socket.io',
        auth: { token }
    })

    socket.on('connect', () => {
        console.debug('[Socket] Connected to server')
        // Join all user's chat rooms
        socket.emit('join_chats')
    })

    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message)
    })

    return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
    if (socket?.connected) {
        socket.disconnect()
        socket = null
    }
} 