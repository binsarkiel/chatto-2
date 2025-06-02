import { mockUsers, mockChats, mockMessages } from './mockData'
import axios from 'axios'

let chats = [...mockChats]
let nextChatId = Math.max(...chats.map(c => c.id)) + 1
let nextMessageId = Math.max(...mockMessages.map(m => m.id)) + 1

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getCurrentUser = (email) => {
    let user = mockUsers.find(u => u.email === email)
    if (!user) {
        // If user doesn't exist in mock data, create one
        user = {
            id: mockUsers.length + 1,
            email: email
        }
        mockUsers.push(user)
    }
    return user
}

const getLastMessageForChat = (chatId) => {
    const chatMessages = mockMessages.filter(m => m.chat_id === chatId)
    if (chatMessages.length === 0) return null
    
    // Sort by date and get the latest message
    return chatMessages.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    )[0].content
}

const updateChatLastMessage = (chatId) => {
    const chat = chats.find(c => c.id === chatId)
    if (chat) {
        chat.lastMessage = getLastMessageForChat(chatId)
    }
}

const searchMessages = async (searchTerm) => {
    await delay(300) // Simulate network delay
    
    if (!searchTerm.trim()) return []

    const searchTermLower = searchTerm.toLowerCase()
    return mockMessages.filter(message => 
        message.content.toLowerCase().includes(searchTermLower) ||
        message.sender_email.toLowerCase().includes(searchTermLower)
    )
}

const chatService = {
    // Chat Management
    async createChat(participantId, currentUserEmail) {
        await delay(500)
        const participant = mockUsers.find(u => u.id === participantId)
        if (!participant) throw new Error('User not found')

        const currentUser = getCurrentUser(currentUserEmail)
        const newChat = {
            id: nextChatId++,
            name: null,
            is_group: false,
            participants: [currentUser, participant],
            lastMessage: null
        }
        chats.unshift(newChat)
        return newChat
    },

    async createGroupChat(name, participantIds, currentUserEmail) {
        await delay(500)
        const participants = mockUsers.filter(u => participantIds.includes(u.id))
        if (participants.length !== participantIds.length) throw new Error('Some users not found')

        const currentUser = getCurrentUser(currentUserEmail)
        const newChat = {
            id: nextChatId++,
            name,
            is_group: true,
            participants: [currentUser, ...participants],
            lastMessage: null
        }
        chats.unshift(newChat)
        return newChat
    },

    async getChats() {
        await delay(500)
        // Update all chats' last messages before returning
        chats.forEach(chat => {
            updateChatLastMessage(chat.id)
        })
        return chats
    },

    async getChatMessages(chatId) {
        await delay(500)
        return mockMessages.filter(message => message.chat_id === chatId)
    },

    async sendMessage(chatId, content, currentUserEmail) {
        await delay(200)
        const chat = chats.find(c => c.id === chatId)
        if (!chat) throw new Error('Chat not found')

        const currentUser = getCurrentUser(currentUserEmail)
        const newMessage = {
            id: nextMessageId++,
            chat_id: chatId,
            sender_id: currentUser.id,
            sender_email: currentUser.email,
            content,
            created_at: new Date().toISOString()
        }

        // Add message to the messages array
        mockMessages.push(newMessage)

        // Update last message in chat
        chat.lastMessage = content
        
        return newMessage
    },

    // User Management
    async searchUsers(query, currentUserEmail) {
        await delay(300)
        if (!query.trim()) return []
        
        return mockUsers.filter(user => 
            user.email.toLowerCase().includes(query.toLowerCase()) &&
            user.email !== currentUserEmail
        )
    },

    // Typing Indicators
    async sendTypingIndicator(chatId, isTyping) {
        await delay(100)
        return { success: true }
    },

    searchMessages,
}

export default chatService 