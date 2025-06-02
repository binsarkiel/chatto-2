import { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import AppLayout from '../layouts/AppLayout'
import ChatList from '../components/chat/ChatList'
import ChatWindow from '../components/chat/ChatWindow'
import Loading from '../components/ui/Loading'
import chatService from '../services/chatService'

export default function Chat() {
    const { user } = useAuth()
    const { socket, isConnected } = useSocket()
    const [chats, setChats] = useState([])
    const [activeChat, setActiveChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [typingUsers, setTypingUsers] = useState({})
    const [loading, setLoading] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [error, setError] = useState('')

    // Set auth token when component mounts
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            chatService.setAuthToken(token)
        }
    }, [])

    // Fetch initial chats
    useEffect(() => {
        const fetchChats = async () => {
            if (!user) return // Only fetch if user is authenticated
            
            try {
                const fetchedChats = await chatService.getChats()
                console.debug('[Chat] Initial chats loaded:', fetchedChats.length)
                setChats(fetchedChats)
            } catch (err) {
                console.error('[Chat] Error fetching chats:', err)
                setError('Failed to load chats')
            } finally {
                setLoading(false)
            }
        }

        fetchChats()
    }, [user]) // Only re-run if user changes

    // Socket event handlers
    useEffect(() => {
        if (!socket || !isConnected) return

        console.debug('[Chat] Setting up socket event handlers')

        // Join all user's chat rooms when socket connects
        socket.emit('join_chats')

        // Listen for new chats
        socket.on('new_chat', (chat) => {
            console.debug('[Chat] Received new_chat event:', chat)
            setChats(prev => {
                // Check if chat already exists
                const exists = prev.some(c => c.id === chat.id)
                if (exists) {
                    console.debug('[Chat] Chat already exists, updating:', chat.id)
                    return prev.map(c => c.id === chat.id ? chat : c)
                }
                // Add the new chat at the top of the list
                console.debug('[Chat] Adding new chat to list:', chat.id)
                return [chat, ...prev]
            })
        })

        // Listen for chat updates (member added/removed)
        socket.on('chat_updated', (updatedChat) => {
            console.debug('[Chat] Received chat_updated event:', updatedChat)
            setChats(prev => prev.map(chat => 
                chat.id === updatedChat.id ? updatedChat : chat
            ))
            // If this is the active chat, update it
            if (activeChat?.id === updatedChat.id) {
                setActiveChat(updatedChat)
            }
        })

        // Listen for being removed from a chat
        socket.on('removed_from_chat', ({ chatId }) => {
            console.debug('[Chat] Removed from chat:', chatId)
            setChats(prev => prev.filter(chat => chat.id !== chatId))
            if (activeChat?.id === chatId) {
                setActiveChat(null)
            }
        })

        // Listen for join_new_chat event
        socket.on('join_new_chat', ({ chat_id }) => {
            console.debug('[Chat] Received join_new_chat event for chat:', chat_id)
            socket.emit('join_chat', { chat_id })
        })

        // Listen for new messages
        socket.on('new_message', (message) => {
            console.debug('[Chat] Received new_message event:', message)
            
            // Update messages if in active chat
            if (message.chat_id === activeChat?.id) {
                setMessages(prev => [...prev, message])
            }
            
            // Update last message in chat list
            setChats(prev => {
                const chatIndex = prev.findIndex(chat => chat.id === message.chat_id)
                if (chatIndex === -1) {
                    console.debug('[Chat] Message for unknown chat:', message.chat_id)
                    return prev
                }

                console.debug('[Chat] Updating last message for chat:', message.chat_id)
                const updatedChats = [...prev]
                updatedChats[chatIndex] = {
                    ...updatedChats[chatIndex],
                    last_message: {
                        content: message.content,
                        created_at: message.created_at,
                        sender_email: message.sender_email
                    }
                }

                // Move the chat to the top if it's not already there
                if (chatIndex > 0) {
                    const [chat] = updatedChats.splice(chatIndex, 1)
                    updatedChats.unshift(chat)
                }

                return updatedChats
            })
        })

        // Listen for typing indicators
        socket.on('user_typing', ({ chat_id, user_email }) => {
            if (chat_id === activeChat?.id && user_email !== user.email) {
                setTypingUsers(prev => ({ ...prev, [user_email]: true }))
            }
        })

        socket.on('user_stop_typing', ({ chat_id, user_email }) => {
            if (chat_id === activeChat?.id && user_email !== user.email) {
                setTypingUsers(prev => {
                    const newState = { ...prev }
                    delete newState[user_email]
                    return newState
                })
            }
        })

        return () => {
            console.debug('[Chat] Cleaning up socket event handlers')
            socket.off('new_chat')
            socket.off('chat_updated')
            socket.off('removed_from_chat')
            socket.off('join_new_chat')
            socket.off('new_message')
            socket.off('user_typing')
            socket.off('user_stop_typing')
        }
    }, [socket, isConnected, activeChat, user])

    const handleChatSelect = async (chat) => {
        setActiveChat(chat)
        setLoadingMessages(true)
        try {
            const { messages: fetchedMessages } = await chatService.getChatMessages(chat.id)
            setMessages(fetchedMessages || [])
        } catch (err) {
            console.error('[Chat] Error fetching messages:', err)
            setMessages([])
        } finally {
            setLoadingMessages(false)
        }
    }

    const handleNewChat = (chat) => {
        setChats(prev => {
            // Check if chat already exists
            const exists = prev.some(c => c.id === chat.id)
            if (exists) {
                // If it exists, move it to the top and update its data
                return [
                    chat,
                    ...prev.filter(c => c.id !== chat.id)
                ]
            }
            // If it's new, add it to the top
            return [chat, ...prev]
        })
        handleChatSelect(chat)
    }

    const handleUpdateChat = (updatedChat) => {
        setChats(prev => prev.map(chat => 
            chat.id === updatedChat.id ? updatedChat : chat
        ))
        if (activeChat?.id === updatedChat.id) {
            setActiveChat(updatedChat)
        }
    }

    if (loading) {
        return (
            <AppLayout onChatCreate={handleNewChat}>
                <div className="h-[calc(97vh-7rem)]">
                    <Loading center size="large" />
                </div>
            </AppLayout>
        )
    }

    if (error) {
        return (
            <AppLayout onChatCreate={handleNewChat}>
                <div className="h-[calc(97vh-7rem)] flex items-center justify-center">
                    <div className="text-center text-red-600">
                        <p className="text-xl font-semibold">{error}</p>
                    </div>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout onChatCreate={handleNewChat}>
            <div className="h-[calc(97vh-7rem)] flex space-x-4">
                {/* Chat List Sidebar - Always visible */}
                <div className="w-1/3">
                    <ChatList
                        chats={chats}
                        activeChat={activeChat}
                        onChatSelect={handleChatSelect}
                        user={user}
                    />
                </div>

                {/* Chat Window or Welcome Screen */}
                <div className="w-2/3">
                    {activeChat ? (
                        loadingMessages ? (
                            <div className="h-full bg-white rounded-lg shadow">
                                <Loading center size="large" />
                            </div>
                        ) : (
                            <ChatWindow
                                chat={activeChat}
                                messages={messages}
                                typingUsers={typingUsers}
                                onUpdateChat={handleUpdateChat}
                            />
                        )
                    ) : (
                        <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
                            <div className="text-center">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Chatto!</h2>
                                <p className="text-gray-600">Select a chat to start messaging or create a new one.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    )
} 