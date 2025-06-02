import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import chatService from '../../services/chatService'
import { HiUserGroup } from 'react-icons/hi'
import { FaUser } from 'react-icons/fa'

export default function ChatWindow({ chat, messages: initialMessages, typingUsers, onUpdateChat }) {
    const { user } = useAuth()
    const { socket } = useSocket()
    const [newMessage, setNewMessage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [messages, setMessages] = useState(initialMessages)
    const messagesEndRef = useRef(null)
    const typingTimeoutRef = useRef(null)

    useEffect(() => {
        setMessages(initialMessages)
    }, [initialMessages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true)
            socket?.emit('typing', { chat_id: chat.id })
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
            socket?.emit('stop_typing', { chat_id: chat.id })
        }, 2000)
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        try {
            const message = await chatService.sendMessage(chat.id, newMessage.trim(), user.email)
            // Update local messages state
            setMessages(prev => [...prev, message])
            // Update chat list
            onUpdateChat(chat.id, message.content)
            // Emit socket event
            socket?.emit('new_message', message)
            
            setNewMessage('')
            setIsTyping(false)
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            socket?.emit('stop_typing', { chat_id: chat.id })
        } catch (error) {
            console.error('Failed to send message:', error)
        }
    }

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b">
                <div className="flex items-center">
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${chat.is_group ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                    `}>
                        {chat.is_group ? (
                            <HiUserGroup className="w-6 h-6" />
                        ) : (
                            <FaUser className="w-6 h-6" />
                        )}
                    </div>
                    <div className="ml-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {chat.is_group ? chat.name : chat.participants.find(p => p.email !== user.email)?.email}
                        </h2>
                        {Object.keys(typingUsers).length > 0 && (
                            <p className="text-sm text-gray-500">
                                {Object.keys(typingUsers).join(', ')} typing...
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => {
                    const isCurrentUser = message.sender_email === user.email
                    return (
                        <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[70%] rounded-lg px-4 py-2
                                ${isCurrentUser
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }
                            `}>
                                {(!chat.is_group && !isCurrentUser) && (
                                    <p className="text-xs text-gray-500 mb-1">{message.sender_email}</p>
                                )}
                                <p className="text-sm">{message.content}</p>
                                <p className={`
                                    text-xs mt-1
                                    ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}
                                `}>
                                    {formatTime(message.created_at)}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t">
                <form onSubmit={handleSendMessage} className="flex space-x-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value)
                            handleTyping()
                        }}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    )
}