import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import chatService from '../../services/chatService'
import { HiUserGroup, HiDotsVertical } from 'react-icons/hi'
import { FaUser, FaUserPlus, FaUserMinus } from 'react-icons/fa'
import Loading from '../ui/Loading'

export default function ChatWindow({ chat, messages: initialMessages = [], typingUsers = {}, onUpdateChat }) {
    const { user } = useAuth()
    const { socket } = useSocket()
    const [newMessage, setNewMessage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [messages, setMessages] = useState(initialMessages || [])
    const [showParticipants, setShowParticipants] = useState(false)
    const [showGroupMenu, setShowGroupMenu] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [showAddMember, setShowAddMember] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const messagesEndRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const [initialLoad, setInitialLoad] = useState(true)
    const menuRef = useRef(null)

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

    const handleAddMember = async (userId) => {
        try {
            setLoading(true)
            const updatedChat = await chatService.addGroupMember(chat.id, userId)
            onUpdateChat(updatedChat)
            setShowAddMember(false)
            setSearchTerm('')
        } catch (error) {
            setError('Failed to add member')
            console.error('Error adding member:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveMember = async (userId) => {
        try {
            setLoading(true)
            const updatedChat = await chatService.removeGroupMember(chat.id, userId)
            onUpdateChat(updatedChat)
        } catch (error) {
            setError('Failed to remove member')
            console.error('Error removing member:', error)
        } finally {
            setLoading(false)
        }
    }

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowGroupMenu(false)
                setShowAddMember(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Search users for adding to group
    useEffect(() => {
        if (!showAddMember || !searchTerm.trim()) {
            setSearchResults([])
            return
        }

        const searchUsers = async () => {
            setSearching(true)
            try {
                const results = await chatService.searchUsers(searchTerm)
                // Filter out current participants
                setSearchResults(results.filter(u => 
                    !chat.participants.some(p => p.id === u.id)
                ))
            } catch (error) {
                console.error('Error searching users:', error)
                setError('Failed to search users')
            } finally {
                setSearching(false)
            }
        }

        const timeoutId = setTimeout(searchUsers, 300)
        return () => clearTimeout(timeoutId)
    }, [searchTerm, showAddMember, chat.participants])

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
            <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center">
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center mr-3
                        ${chat.is_group ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                    `}>
                        {chat.is_group ? (
                            <HiUserGroup className="w-6 h-6" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-white text-lg font-medium">
                                    {chat.display_name?.[0]?.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{chat.display_name}</h2>
                        <p className="text-sm text-gray-500">
                            {chat.is_group ? `${chat.participants?.length} members` : 'Direct Message'}
                        </p>
                    </div>
                </div>
                
                {chat.is_group && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowGroupMenu(!showGroupMenu)}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <HiDotsVertical className="w-5 h-5" />
                        </button>
                        
                        {showGroupMenu && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setShowAddMember(true)
                                            setShowGroupMenu(false)
                                        }}
                                        className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                        <FaUserPlus className="w-4 h-4 mr-2" />
                                        Add Member
                                    </button>
                                    <button
                                        onClick={() => setShowParticipants(!showParticipants)}
                                        className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                        <HiUserGroup className="w-4 h-4 mr-2" />
                                        View Members
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {showAddMember && (
                            <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="p-4">
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search users..."
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {searching ? (
                                            <div className="text-center py-2">
                                                <Loading />
                                            </div>
                                        ) : searchResults.length > 0 ? (
                                            searchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => handleAddMember(user.id)}
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-md flex items-center"
                                                >
                                                    <FaUser className="w-4 h-4 mr-2" />
                                                    {user.email}
                                                </button>
                                            ))
                                        ) : searchTerm ? (
                                            <p className="text-center text-gray-500 py-2">No users found</p>
                                        ) : (
                                            <p className="text-center text-gray-500 py-2">Type to search users</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Participants Sidebar */}
            {showParticipants && chat.is_group && (
                <div className="absolute right-0 top-0 h-full w-64 bg-white border-l shadow-lg">
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Members</h3>
                            <button
                                onClick={() => setShowParticipants(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-2">
                            {chat.participants?.map(participant => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                                            <span className="text-white text-sm">
                                                {participant.email[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-sm">{participant.email}</span>
                                    </div>
                                    {participant.id !== user.id && (
                                        <button
                                            onClick={() => handleRemoveMember(participant.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <FaUserMinus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
                style={{ marginRight: showParticipants ? '16rem' : '0' }}
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