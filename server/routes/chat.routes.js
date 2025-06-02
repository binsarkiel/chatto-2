import { Router } from 'express'
import { 
    getChats,
    getChatById,
    createDirectMessage,
    createGroupChat,
    getChatMessages,
    searchMessages,
    searchUsers,
    sendMessage,
    addGroupMember,
    removeGroupMember
} from '../controllers/chat.controller.js'

const router = Router()

// Chat routes
router.get('/', getChats)
router.get('/:id', getChatById)
router.post('/direct', createDirectMessage)
router.post('/group', createGroupChat)
router.get('/:id/messages', getChatMessages)
router.post('/:id/messages', sendMessage)

// Group member management
router.post('/group/:chatId/members', addGroupMember)
router.delete('/group/:chatId/members/:userId', removeGroupMember)

// Search routes
router.get('/search/messages', searchMessages)
router.get('/search/users', searchUsers)

export default router 