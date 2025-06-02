import { useState, useMemo, useCallback, useEffect } from 'react'
import debounce from 'lodash/debounce'
import chatService from '../../services/chatService'
import { HiUserGroup } from 'react-icons/hi'
import { FaUser, FaSearch, FaTimes } from 'react-icons/fa'
import { BiSearchAlt } from 'react-icons/bi'
import Loading from '../ui/Loading'

export default function ChatList({ chats = [], activeChat, onChatSelect, user }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [messageResults, setMessageResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState('')

    // Highlight matching text in a string
    const highlightMatch = (text, query) => {
        if (!query.trim() || !text) return text

        const regex = new RegExp(`(${query.trim()})`, 'gi')
        const parts = text.split(regex)

        return parts.map((part, i) => 
            regex.test(part) ? (
                <span key={i} className="bg-yellow-200">{part}</span>
            ) : part
        )
    }

    const searchChat = useCallback((chat, term) => {
        const searchTermLower = term.toLowerCase()
        
        // Search in chat name for group chats
        if (chat.is_group && chat.name?.toLowerCase().includes(searchTermLower)) {
            return true
        }

        // Search in participants' emails
        if (chat.participants?.some(p => 
            p?.email?.toLowerCase().includes(searchTermLower) &&
            p?.email !== user?.email
        )) {
            return true
        }

        // Search in last message
        if (chat.lastMessage?.toLowerCase().includes(searchTermLower)) {
            return true
        }

        return false
    }, [user?.email])

    // Search messages when search term changes
    useEffect(() => {
        const searchMessages = async () => {
            if (!searchTerm.trim()) {
                setMessageResults([])
                setError('')
                return
            }

            setIsSearching(true)
            try {
                const results = await chatService.searchMessages(searchTerm)
                setMessageResults(results)
                setError('')
            } catch (error) {
                console.error('Error searching messages:', error)
                setError('Failed to search messages')
                setMessageResults([])
            } finally {
                setIsSearching(false)
            }
        }

        const debounceSearch = debounce(searchMessages, 300)
        debounceSearch()

        return () => {
            debounceSearch.cancel()
        }
    }, [searchTerm])

    const { individualChats, groupChats } = useMemo(() => {
        if (!Array.isArray(chats)) return { individualChats: [], groupChats: [] }

        const filtered = chats.filter(chat => searchChat(chat, searchTerm))

        return {
            individualChats: filtered.filter(chat => !chat?.is_group),
            groupChats: filtered.filter(chat => chat?.is_group)
        }
    }, [chats, searchTerm, searchChat])

    const ChatSection = ({ title, chats }) => {
        if (!chats.length) return null

        return (
            <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {title}
                </h3>
                <div className="space-y-1">
                    {chats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => onChatSelect(chat)}
                            className={`
                                w-full text-left px-3 py-2 rounded-lg transition-colors
                                ${activeChat?.id === chat.id
                                    ? 'bg-blue-50 hover:bg-blue-100'
                                    : 'hover:bg-gray-50'
                                }
                            `}
                        >
                            <div className="flex items-center">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center
                                    ${chat.is_group ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                `}>
                                    {chat.is_group ? (
                                        <HiUserGroup className="w-5 h-5" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {chat.participants?.find(p => p?.email !== user?.email)?.email?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="ml-3 min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {chat.is_group 
                                                ? highlightMatch(chat.name, searchTerm)
                                                : highlightMatch(
                                                    chat.participants?.find(p => p?.email !== user?.email)?.email,
                                                    searchTerm
                                                  )
                                            }
                                        </p>
                                        {chat.last_message?.created_at && (
                                            <span className="text-xs text-gray-500">
                                                {formatMessageTime(chat.last_message.created_at)}
                                            </span>
                                        )}
                                    </div>
                                    {chat.last_message?.content && (
                                        <div className="flex items-center">
                                            {chat.is_group && chat.last_message.sender_email && (
                                                <span className="text-xs font-medium text-gray-600 mr-1">
                                                    {chat.last_message.sender_email === user?.email ? 'You:' : `${chat.last_message.sender_email.split('@')[0]}:`}
                                                </span>
                                            )}
                                            <p className="text-xs text-gray-500 truncate">
                                                {highlightMatch(chat.last_message.content, searchTerm)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </>
        )
    }

    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now - date

        // If less than 24 hours ago, show time
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
        }

        // If this week, show day name
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString('en-US', { weekday: 'short' })
        }

        // Otherwise show date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    const MessageResultSection = ({ messages }) => {
        if (!messages.length) return null

        return (
            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Messages
                </h3>
                <div className="space-y-1">
                    {messages.map(message => {
                        const chat = chats.find(c => c.id === message.chat_id)
                        if (!chat) return null

                        return (
                            <button
                                key={message.id}
                                onClick={() => onChatSelect(chat)}
                                className="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-50"
                            >
                                <div className="flex items-center">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center
                                        ${chat?.is_group ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                    `}>
                                        {chat?.is_group ? (
                                            <HiUserGroup className="w-5 h-5" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">
                                                    {chat?.participants?.find(p => p?.email !== user?.email)?.email?.[0]?.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-3 min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {chat?.is_group 
                                                ? chat.name
                                                : chat?.participants?.find(p => p?.email !== user?.email)?.email
                                            }
                                        </p>
                                        <div className="flex items-baseline space-x-1">
                                            <span className="text-xs text-gray-500">
                                                {message.sender_email === user?.email ? 'You' : message.sender_email.split('@')[0]}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                • {formatMessageTime(message.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {highlightMatch(message.content, searchTerm)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow">
            {/* Search Header */}
            <div className="p-4 border-b">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {isSearching ? (
                            <Loading className="w-5 h-5" />
                        ) : (
                            <FaSearch className="w-5 h-5 text-gray-400" />
                        )}
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search chats and messages..."
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            <FaTimes className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-4">
                {error ? (
                    <div className="text-center text-red-600 mb-4">
                        {error}
                    </div>
                ) : individualChats.length === 0 && groupChats.length === 0 && messageResults.length === 0 ? (
                    searchTerm ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <BiSearchAlt className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 text-center">
                                No results found for "{searchTerm}"
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                            <BiSearchAlt className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500">No chats yet</p>
                        </div>
                    )
                ) : (
                    <div className="space-y-6">
                        <MessageResultSection messages={messageResults} />
                        <ChatSection title="Direct Messages" chats={individualChats} />
                        <ChatSection title="Group Chats" chats={groupChats} />
                    </div>
                )}
            </div>
        </div>
    )
} 