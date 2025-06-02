import { useState, useMemo, useCallback, useEffect } from 'react'
import debounce from 'lodash/debounce'
import chatService from '../../services/chatService'
import { HiUserGroup } from 'react-icons/hi'
import { FaUser, FaSearch, FaTimes } from 'react-icons/fa'
import { BiSearchAlt } from 'react-icons/bi'

export default function ChatList({ chats = [], activeChat, onChatSelect, user }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [messageResults, setMessageResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)

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
        
        // Search in chat name
        if (chat.name?.toLowerCase().includes(searchTermLower)) {
            return true
        }

        // Search in participants' emails
        if (chat.participants?.some(p => 
            p?.email?.toLowerCase().includes(searchTermLower)
        )) {
            return true
        }

        return false
    }, [])

    // Search messages when search term changes
    useEffect(() => {
        const searchMessages = async () => {
            if (!searchTerm.trim()) {
                setMessageResults([])
                return
            }

            setIsSearching(true)
            try {
                const results = await chatService.searchMessages(searchTerm)
                setMessageResults(results)
            } catch (error) {
                console.error('Error searching messages:', error)
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

    const ChatSection = ({ title, chats }) => (
        <div>
            {chats.length > 0 && (
                <>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {title}
                    </h3>
                    <div className="space-y-1">
                        {chats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => onChatSelect(chat)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                    activeChat?.id === chat.id
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center
                                        ${chat.is_group ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                    `}>
                                        {chat.is_group ? (
                                            <HiUserGroup className="w-4 h-4" />
                                        ) : (
                                            <FaUser className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="ml-3 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {chat.is_group 
                                                ? highlightMatch(chat.name, searchTerm)
                                                : highlightMatch(
                                                    chat.participants?.find(p => p?.email !== user?.email)?.email,
                                                    searchTerm
                                                  )
                                            }
                                        </p>
                                        {chat.lastMessage && (
                                            <p className="text-xs text-gray-500 truncate">
                                                {highlightMatch(chat.lastMessage, searchTerm)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )

    const MessageResultSection = ({ messages }) => (
        <div>
            {messages.length > 0 && (
                <>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Messages
                    </h3>
                    <div className="space-y-1">
                        {messages.map(message => {
                            const chat = chats.find(c => c.id === message.chat_id)
                            return (
                                <button
                                    key={message.id}
                                    onClick={() => onChatSelect(chat)}
                                    className="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
                                >
                                    <div className="flex items-center">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center
                                            ${chat?.is_group ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                        `}>
                                            {chat?.is_group ? (
                                                <HiUserGroup className="w-4 h-4" />
                                            ) : (
                                                <FaUser className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="ml-3 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {chat?.is_group 
                                                    ? chat.name
                                                    : chat?.participants?.find(p => p?.email !== user?.email)?.email
                                                }
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {message.sender_email} • {new Date(message.created_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {highlightMatch(message.content, searchTerm)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )

    const NoResults = () => (
        <div className="flex flex-col items-center justify-center py-8">
            <BiSearchAlt className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
                No results found {searchTerm && (
                    <>
                        for "<span className="font-medium">{searchTerm}</span>"
                    </>
                )}
            </p>
            {searchTerm && (
                <button
                    onClick={() => {
                        setSearchTerm('')
                        setMessageResults([])
                        const searchInput = document.querySelector('input[type="text"]')
                        if (searchInput) searchInput.value = ''
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                    Clear search
                </button>
            )}
        </div>
    )

    const hasResults = individualChats.length > 0 || groupChats.length > 0 || messageResults.length > 0

    return (
        <div className="h-full bg-white rounded-lg shadow overflow-hidden flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b">
                <div className="relative">
                    <input
                        type="text"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search chats, messages, or users..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FaSearch className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    {searchTerm && (
                        <button
                            onClick={() => {
                                setSearchTerm('')
                                setMessageResults([])
                                const searchInput = document.querySelector('input[type="text"]')
                                if (searchInput) searchInput.value = ''
                            }}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Lists */}
            <div className="flex-1 overflow-y-auto p-4">
                {isSearching ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : hasResults ? (
                    <div className="space-y-6">
                        <MessageResultSection messages={messageResults} />
                        <ChatSection title="Direct Messages" chats={individualChats} />
                        <ChatSection title="Group Chats" chats={groupChats} />
                    </div>
                ) : (
                    <NoResults />
                )}
            </div>
        </div>
    )
} 