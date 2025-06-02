import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { initSocket, disconnectSocket } from '../services/socket'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
    const { user } = useAuth()
    const [socket, setSocket] = useState(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('token')
            const socketInstance = initSocket(token)
            
            socketInstance.on('connect', () => {
                setIsConnected(true)
            })

            socketInstance.on('disconnect', () => {
                setIsConnected(false)
            })

            setSocket(socketInstance)

            return () => {
                disconnectSocket()
            }
        } else {
            if (socket) {
                disconnectSocket()
                setSocket(null)
                setIsConnected(false)
            }
        }
    }, [user])

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

    return (
        <SocketContext.Provider 
            value={{ 
                socket,
                isConnected,
                sendMessage,
                startTyping,
                stopTyping
            }}
        >
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