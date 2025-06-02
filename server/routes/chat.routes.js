import { Router } from 'express'
import { 
    getChats,
    getChatById,
    createDirectMessage,
    createGroupChat,
    getChatMessages,
    searchMessages,
    searchUsers,
    sendMessage
} from '../controllers/chat.controller.js'

const router = Router()

// Chat routes
router.get('/', getChats)
router.get('/:id', getChatById)
router.post('/direct', createDirectMessage)
router.post('/group', createGroupChat)
router.get('/:id/messages', getChatMessages)
router.post('/:id/messages', sendMessage)

// Search routes
router.get('/search/messages', searchMessages)
router.get('/search/users', searchUsers)

export default router 