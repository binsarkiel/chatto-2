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
    const { socket } = useSocket()
    const [chats, setChats] = useState([])
    const [activeChat, setActiveChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [typingUsers, setTypingUsers] = useState({})
    const [loading, setLoading] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!socket) return

        // Listen for new messages
        socket.on('new_message', (message) => {
            if (message.chat_id === activeChat?.id) {
                setMessages(prev => [...prev, message])
            }
            // Update last message in chat list
            setChats(prev => prev.map(chat => 
                chat.id === message.chat_id 
                    ? { ...chat, lastMessage: message.content }
                    : chat
            ))
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
            socket.off('new_message')
            socket.off('user_typing')
            socket.off('user_stop_typing')
        }
    }, [socket, activeChat, user])

    // Fetch chats
    useEffect(() => {
        const fetchChats = async () => {
            try {
                const fetchedChats = await chatService.getChats()
                setChats(fetchedChats)
            } catch (err) {
                setError('Failed to load chats')
                console.error('Error fetching chats:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchChats()
    }, [])

    const handleChatSelect = async (chat) => {
        setActiveChat(chat)
        setLoadingMessages(true)
        try {
            const fetchedMessages = await chatService.getChatMessages(chat.id)
            setMessages(fetchedMessages)
        } catch (err) {
            console.error('Error fetching messages:', err)
        } finally {
            setLoadingMessages(false)
        }
    }

    const handleNewChat = (chat) => {
        setChats(prev => [chat, ...prev])
        handleChatSelect(chat)
    }

    const handleUpdateChat = (chatId, lastMessage) => {
        setChats(prev => prev.map(chat => 
            chat.id === chatId 
                ? { ...chat, lastMessage }
                : chat
        ))
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