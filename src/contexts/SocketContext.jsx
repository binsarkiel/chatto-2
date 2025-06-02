import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { initSocket, disconnectSocket } from '../services/socket'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
    const { user } = useAuth()
    const [socket, setSocket] = useState(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        let socketInstance = null

        const setupSocket = () => {
            if (!user) return

            const token = localStorage.getItem('token')
            if (!token) {
                console.warn('No token found for socket connection')
                return
            }

            // Only initialize if we don't have a connected socket
            if (!socketInstance || !socketInstance.connected) {
                socketInstance = initSocket(token)

                socketInstance.on('connect', () => {
                    console.debug('Socket connected')
                    setIsConnected(true)
                })

                socketInstance.on('disconnect', () => {
                    console.debug('Socket disconnected')
                    setIsConnected(false)
                })

                socketInstance.on('connect_error', (error) => {
                    console.error('Socket connection error:', error.message)
                })

                setSocket(socketInstance)
            }
        }

        setupSocket()

        // Cleanup function
        return () => {
            if (socketInstance) {
                console.debug('Cleaning up socket connection')
                socketInstance.disconnect()
                setSocket(null)
                setIsConnected(false)
            }
        }
    }, [user]) // Only depend on user changes

    const sendMessage = (chatId, content) => {
        if (!socket) return
        socket.emit('send_message', { chat_id: chatId, content })
    }

    const startTyping = (chatId) => {
        if (!socket) return
        socket.emit('typing_start', { chat_id: chatId })
    }

    const stopTyping = (chatId) => {
        if (!socket) return
        socket.emit('typing_stop', { chat_id: chatId })
    }

    const value = {
        socket,
        isConnected,
        sendMessage,
        startTyping,
        stopTyping
    }

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider')
    }
    return context
} 