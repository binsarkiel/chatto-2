import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import chatService from '../../services/chatService'
import { HiUserGroup, HiDotsVertical } from 'react-icons/hi'
import { FaUser } from 'react-icons/fa'
import Loading from '../ui/Loading'

export default function ChatWindow({ chat, messages: initialMessages = [], typingUsers = {}, onUpdateChat }) {
    const { user } = useAuth()
    const { socket } = useSocket()
    const [newMessage, setNewMessage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [messages, setMessages] = useState(initialMessages || [])
    const [showParticipants, setShowParticipants] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const messagesEndRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const [initialLoad, setInitialLoad] = useState(true)

    useEffect(() => {
        setMessages(initialMessages)
        setPage(1)
        setHasMore(true)
        setInitialLoad(true)
        scrollToBottom()
    }, [initialMessages, chat.id])

    const loadMoreMessages = async () => {
        if (loading || !hasMore) return
        
        setLoading(true)
        try {
            const response = await chatService.getChatMessages(chat.id, page + 1)
            if (response.messages.length === 0) {
                setHasMore(false)
            } else {
                // Since messages are now in ascending order, append them at the beginning
                setMessages(prev => [...response.messages, ...prev])
                setPage(prev => prev + 1)
            }
        } catch (error) {
            console.error('Error loading more messages:', error)
            setError('Failed to load more messages')
        } finally {
            setLoading(false)
        }
    }

    const handleScroll = () => {
        const container = messagesContainerRef.current
        if (container.scrollTop === 0 && hasMore && !loading) {
            const oldHeight = container.scrollHeight
            loadMoreMessages().then(() => {
                // After loading more messages, maintain scroll position
                if (container.scrollHeight > oldHeight) {
                    container.scrollTop = container.scrollHeight - oldHeight
                }
            })
        }
    }

    const scrollToBottom = () => {
        if (initialLoad) {
            messagesEndRef.current?.scrollIntoView()
            setInitialLoad(false)
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }

    useEffect(() => {
        const container = messagesContainerRef.current
        if (container) {
            container.addEventListener('scroll', handleScroll)
            return () => container.removeEventListener('scroll', handleScroll)
        }
    }, [hasMore, loading])

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true)
            socket?.emit('typing', { chat_id: chat.id })
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
            socket?.emit('stop_typing', { chat_id: chat.id })
        }, 2000)
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        try {
            const message = await chatService.sendMessage(chat.id, newMessage.trim())
            setMessages(prev => [...prev, message])
            onUpdateChat(chat.id, message.content)
            
            setNewMessage('')
            setIsTyping(false)
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            socket?.emit('stop_typing', { chat_id: chat.id })
            scrollToBottom()
        } catch (error) {
            console.error('Failed to send message:', error)
            setError('Failed to send message')
        }
    }

    const handleRemoveMember = async (memberId) => {
        try {
            await chatService.removeGroupMember(chat.id, memberId)
            // Update the chat participants locally
            onUpdateChat(chat.id, null, {
                ...chat,
                participants: chat.participants.filter(p => p.id !== memberId)
            })
        } catch (error) {
            console.error('Failed to remove member:', error)
            setError('Failed to remove member')
        }
    }

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    const formatDate = (timestamp) => {
        const date = new Date(timestamp)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        if (date.toDateString() === today.toDateString()) {
            return 'Today'
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday'
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            })
        }
    }

    const renderMessageGroup = (message, prevMessage, nextMessage) => {
        const isCurrentUser = message.sender_email === user.email
        const showSender = chat.is_group && !isCurrentUser && 
            (!prevMessage || prevMessage.sender_email !== message.sender_email)
        const showDate = !prevMessage || 
            new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString()
        const showAvatar = !nextMessage || nextMessage.sender_email !== message.sender_email

        return (
            <div key={message.id} className="space-y-1">
                {showDate && (
                    <div className="flex justify-center my-4">
                        <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                            {formatDate(message.created_at)}
                        </span>
                    </div>
                )}
                <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
                    {!isCurrentUser && showAvatar && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs text-white">
                                {message.sender_email[0].toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className={`max-w-[70%] ${!isCurrentUser && !showAvatar ? 'ml-8' : ''}`}>
                        {showSender && (
                            <div className="text-xs text-gray-500 mb-1 ml-1">
                                {message.sender_email}
                            </div>
                        )}
                        <div className={`
                            rounded-lg px-4 py-2
                            ${isCurrentUser
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }
                        `}>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <div className={`
                            text-xs mt-1
                            ${isCurrentUser ? 'text-right text-gray-400' : 'text-gray-400'}
                        `}>
                            {formatTime(message.created_at)}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
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
                            <p className="text-sm text-gray-500">
                                {Object.keys(typingUsers).length > 0
                                    ? `${Object.keys(typingUsers).join(', ')} typing...`
                                    : chat.is_group ? `${chat.participants.length} members` : 'Direct Message'
                                }
                            </p>
                        </div>
                    </div>
                    {chat.is_group && (
                        <div className="relative">
                            <button
                                onClick={() => setShowParticipants(!showParticipants)}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <HiDotsVertical className="w-5 h-5 text-gray-600" />
                            </button>
                            {showParticipants && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-10">
                                    <div className="p-4">
                                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                                            Group Members
                                        </h3>
                                        <div className="space-y-2">
                                            {chat.participants.map(participant => (
                                                <div
                                                    key={participant.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span className="text-sm text-gray-600">
                                                        {participant.email}
                                                    </span>
                                                    {participant.email !== user.email && (
                                                        <button
                                                            onClick={() => handleRemoveMember(participant.id)}
                                                            className="text-xs text-red-600 hover:text-red-800"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
            >
                {loading && (
                    <div className="flex justify-center">
                        <Loading />
                    </div>
                )}
                {error && (
                    <div className="text-center text-red-600 mb-4">
                        {error}
                    </div>
                )}
                {messages.map((message, index) => renderMessageGroup(
                    message,
                    messages[index - 1],
                    messages[index + 1]
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex space-x-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value)
                            handleTyping()
                        }}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`
                            px-6 py-2 rounded-full font-medium
                            ${newMessage.trim()
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }
                        `}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    )
}