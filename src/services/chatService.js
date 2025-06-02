import axios from 'axios'

const API_BASE_URL = '/api'

class ChatService {
    constructor() {
        this.api = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json'
            }
        })
    }

    setAuthToken(token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    // Direct Message Methods
    async createDirectMessage(participantId) {
        try {
            const response = await this.api.post('/chats/direct', { participantId })
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    // Group Chat Methods
    async createGroupChat(name, participantIds) {
        try {
            console.debug('[ChatService] Creating group chat:', { name, participantIds })
            const response = await this.api.post('/chats/group', { name, participantIds })
            console.debug('[ChatService] Group chat created:', response.data)
            return response.data
        } catch (error) {
            console.error('[ChatService] Failed to create group chat:', error)
            throw this.handleError(error)
        }
    }

    async updateGroupChat(groupId, data) {
        try {
            const response = await this.api.put(`/chats/group/${groupId}`, data)
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async addGroupMember(chatId, userId) {
        try {
            console.debug('[ChatService] Adding member to group:', { chatId, userId })
            const response = await this.api.post(`/chats/group/${chatId}/members`, { userId })
            console.debug('[ChatService] Member added to group:', response.data)
            return response.data
        } catch (error) {
            console.error('[ChatService] Failed to add group member:', error)
            throw this.handleError(error)
        }
    }

    async removeGroupMember(chatId, userId) {
        try {
            console.debug('[ChatService] Removing member from group:', { chatId, userId })
            const response = await this.api.delete(`/chats/group/${chatId}/members/${userId}`)
            console.debug('[ChatService] Member removed from group:', response.data)
            return response.data
        } catch (error) {
            console.error('[ChatService] Failed to remove group member:', error)
            throw this.handleError(error)
        }
    }

    // Common Chat Methods
    async getChats() {
        try {
            const response = await this.api.get('/chats')
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async getChatById(chatId) {
        try {
            const response = await this.api.get(`/chats/${chatId}`)
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async getChatMessages(chatId, page = 1, limit = 50) {
        try {
            const response = await this.api.get(`/chats/${chatId}/messages`, {
                params: { page, limit }
            })
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    async sendMessage(chatId, content) {
        try {
            const response = await this.api.post(`/chats/${chatId}/messages`, { content })
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    // User Methods
    async searchUsers(query) {
        try {
            const response = await this.api.get('/chats/search/users', {
                params: { query }
            })
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    // Message Search
    async searchMessages(query) {
        try {
            const response = await this.api.get('/messages/search', {
                params: { query }
            })
            return response.data
        } catch (error) {
            throw this.handleError(error)
        }
    }

    // Error Handling
    handleError(error) {
        console.error('[ChatService] API Error:', error.response || error)
        if (error.response) {
            throw new Error(error.response.data.message || 'An error occurred')
        }
        throw error
    }
}

const chatService = new ChatService()
export default chatService 