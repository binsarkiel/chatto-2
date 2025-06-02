import { query } from '../db.js'
import pool from '../db.js'
import { getIO } from '../socket.js'

export const getChats = async (req, res) => {
    try {
        // Get all chats where the user is a participant
        const result = await query(`
            SELECT c.*, 
                   CASE WHEN c.is_group THEN c.name 
                        ELSE (
                            SELECT u.email 
                            FROM users u 
                            JOIN chat_participants cp ON u.id = cp.user_id 
                            WHERE cp.chat_id = c.id AND u.id != $1 
                            LIMIT 1
                        ) 
                   END as display_name,
                   (
                       SELECT json_build_object(
                           'content', m.content,
                           'created_at', m.created_at,
                           'sender_email', u.email
                       )
                       FROM messages m 
                       JOIN users u ON m.sender_id = u.id
                       WHERE m.chat_id = c.id 
                       ORDER BY m.created_at DESC 
                       LIMIT 1
                   ) as last_message,
                   (
                       SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                       FROM users u
                       JOIN chat_participants cp ON u.id = cp.user_id
                       WHERE cp.chat_id = c.id
                   ) as participants
            FROM chats c
            JOIN chat_participants cp ON c.id = cp.chat_id
            WHERE cp.user_id = $1
            ORDER BY (
                SELECT m.created_at 
                FROM messages m 
                WHERE m.chat_id = c.id 
                ORDER BY m.created_at DESC 
                LIMIT 1
            ) DESC NULLS LAST
        `, [req.user.id])

        res.json(result.rows)
    } catch (error) {
        console.error('Error fetching chats:', error)
        res.status(500).json({ message: 'Failed to fetch chats' })
    }
}

export const getChatById = async (req, res) => {
    try {
        // Verify user is participant of the chat
        const participantCheck = await query(
            'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        )

        if (participantCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized to access this chat' })
        }

        const result = await query(`
            SELECT c.*, 
                   CASE WHEN c.is_group THEN c.name 
                        ELSE (
                            SELECT u.email 
                            FROM users u 
                            JOIN chat_participants cp ON u.id = cp.user_id 
                            WHERE cp.chat_id = c.id AND u.id != $1 
                            LIMIT 1
                        ) 
                   END as display_name,
                   (
                       SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                       FROM users u
                       JOIN chat_participants cp ON u.id = cp.user_id
                       WHERE cp.chat_id = c.id
                   ) as participants
            FROM chats c
            WHERE c.id = $2
        `, [req.user.id, req.params.id])

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Chat not found' })
        }

        res.json(result.rows[0])
    } catch (error) {
        console.error('Error fetching chat:', error)
        res.status(500).json({ message: 'Failed to fetch chat' })
    }
}

export const createDirectMessage = async (req, res) => {
    try {
        const { participantId } = req.body

        // Validate participant ID
        if (!participantId) {
            return res.status(400).json({ message: 'Participant ID is required' })
        }

        // Check if participant exists
        const participantExists = await query('SELECT 1 FROM users WHERE id = $1', [participantId])
        if (participantExists.rows.length === 0) {
            return res.status(404).json({ message: 'Participant not found' })
        }

        // Check if chat already exists using a more efficient query
        const existingChat = await query(`
            SELECT c.*, 
                   CASE WHEN c.is_group THEN c.name 
                        ELSE (
                            SELECT u.email 
                            FROM users u 
                            JOIN chat_participants cp ON u.id = cp.user_id 
                            WHERE cp.chat_id = c.id AND u.id != $1 
                            LIMIT 1
                        ) 
                   END as display_name,
                   (
                       SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                       FROM users u
                       JOIN chat_participants cp ON u.id = cp.user_id
                       WHERE cp.chat_id = c.id
                   ) as participants
            FROM chats c
            WHERE c.id IN (
                SELECT cp1.chat_id
                FROM chat_participants cp1
                JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
                WHERE cp1.user_id = $1 
                AND cp2.user_id = $2
                AND NOT EXISTS (
                    SELECT 1 
                    FROM chat_participants cp3 
                    WHERE cp3.chat_id = cp1.chat_id 
                    AND cp3.user_id NOT IN ($1, $2)
                )
            )
            AND NOT c.is_group
            LIMIT 1
        `, [req.user.id, participantId])

        if (existingChat.rows.length > 0) {
            return res.json(existingChat.rows[0])
        }

        // Start a transaction for creating new chat
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            // Create new chat
            const chatResult = await client.query(
                'INSERT INTO chats (is_group) VALUES (false) RETURNING id',
                []
            )
            const chatId = chatResult.rows[0].id

            // Add participants
            await client.query(
                'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
                [chatId, req.user.id, participantId]
            )

            // Get the complete chat object
            const result = await client.query(`
                SELECT c.*, 
                       CASE WHEN c.is_group THEN c.name 
                            ELSE (
                                SELECT u.email 
                                FROM users u 
                                JOIN chat_participants cp ON u.id = cp.user_id 
                                WHERE cp.chat_id = c.id AND u.id != $1 
                                LIMIT 1
                            ) 
                       END as display_name,
                       (
                           SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                           FROM users u
                           JOIN chat_participants cp ON u.id = cp.user_id
                           WHERE cp.chat_id = c.id
                       ) as participants
                FROM chats c
                WHERE c.id = $2
            `, [req.user.id, chatId])

            await client.query('COMMIT')
            const newChat = result.rows[0]

            // Don't notify other participants yet - wait for first message
            res.json(newChat)
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    } catch (error) {
        console.error('Error creating direct message:', error)
        res.status(500).json({ 
            message: 'Failed to create direct message',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

export const createGroupChat = async (req, res) => {
    try {
        const { name, participantIds } = req.body
        console.debug('[Chat] Creating group chat:', { name, participantIds, user: req.user.id })

        // Validate input
        if (!name || !name.trim()) {
            console.debug('[Chat] Group creation failed: name is required')
            return res.status(400).json({ message: 'Group name is required' })
        }
        if (!Array.isArray(participantIds) || participantIds.length === 0) {
            console.debug('[Chat] Group creation failed: no participants')
            return res.status(400).json({ message: 'At least one participant is required' })
        }

        // Check if all participants exist
        const participantsExist = await query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE id = ANY($1)
        `, [participantIds])

        const foundCount = parseInt(participantsExist.rows[0].count)
        if (foundCount !== participantIds.length) {
            console.debug('[Chat] Group creation failed: some participants not found', {
                expected: participantIds.length,
                found: foundCount
            })
            return res.status(404).json({ message: 'One or more participants not found' })
        }

        // Start a transaction for creating new group chat
        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            console.debug('[Chat] Starting group chat creation transaction')

            // Create new chat
            const chatResult = await client.query(
                'INSERT INTO chats (name, is_group) VALUES ($1, true) RETURNING id',
                [name.trim()]
            )
            const chatId = chatResult.rows[0].id
            console.debug(`[Chat] Created group chat with ID: ${chatId}`)

            // Add participants (including the creator)
            const participants = [req.user.id, ...participantIds]
            const values = participants.map((_, i) => `($1, $${i + 2})`).join(', ')
            const participantsQuery = `INSERT INTO chat_participants (chat_id, user_id) VALUES ${values}`
            await client.query(participantsQuery, [chatId, ...participants])
            console.debug(`[Chat] Added ${participants.length} participants to group chat ${chatId}`)

            // Get the complete chat object
            const result = await client.query(`
                SELECT c.*, 
                       c.name as display_name,
                       (
                           SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                           FROM users u
                           JOIN chat_participants cp ON u.id = cp.user_id
                           WHERE cp.chat_id = c.id
                       ) as participants
                FROM chats c
                WHERE c.id = $1
            `, [chatId])

            await client.query('COMMIT')
            const newChat = result.rows[0]
            console.debug(`[Chat] Successfully created group chat:`, newChat)

            // Don't notify other participants yet - wait for first message
            res.json(newChat)
        } catch (error) {
            await client.query('ROLLBACK')
            console.error('[Chat] Error in group chat creation transaction:', error)
            throw error
        } finally {
            client.release()
        }
    } catch (error) {
        console.error('[Chat] Error creating group chat:', error)
        res.status(500).json({ 
            message: 'Failed to create group chat',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

export const getChatMessages = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query
        const offset = (page - 1) * limit

        // Verify user is participant of the chat
        const participantCheck = await query(
            'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        )

        if (participantCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized to access this chat' })
        }

        const result = await query(`
            SELECT m.*, u.email as sender_email
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.chat_id = $1
            ORDER BY m.created_at ASC
            LIMIT $2 OFFSET $3
        `, [req.params.id, limit, offset])

        res.json({ messages: result.rows })
    } catch (error) {
        console.error('Error fetching messages:', error)
        res.status(500).json({ message: 'Failed to fetch messages' })
    }
}

export const searchMessages = async (req, res) => {
    try {
        const { query: searchQuery } = req.query

        const result = await query(`
            SELECT m.*, c.id as chat_id, u.email as sender_email
            FROM messages m
            JOIN chats c ON m.chat_id = c.id
            JOIN users u ON m.sender_id = u.id
            JOIN chat_participants cp ON c.id = cp.chat_id
            WHERE cp.user_id = $1
            AND m.content ILIKE $2
            ORDER BY m.created_at DESC
            LIMIT 50
        `, [req.user.id, `%${searchQuery}%`])

        res.json(result.rows)
    } catch (error) {
        console.error('Error searching messages:', error)
        res.status(500).json({ message: 'Failed to search messages' })
    }
}

export const searchUsers = async (req, res) => {
    try {
        const { query: searchQuery } = req.query

        const result = await query(`
            SELECT id, email
            FROM users
            WHERE email ILIKE $1
            AND id != $2
            LIMIT 10
        `, [`%${searchQuery}%`, req.user.id])

        res.json(result.rows)
    } catch (error) {
        console.error('Error searching users:', error)
        res.status(500).json({ message: 'Failed to search users' })
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { content } = req.body
        const chatId = req.params.id

        // Verify user is participant of the chat
        const participantCheck = await query(
            'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [chatId, req.user.id]
        )

        if (participantCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized to send message to this chat' })
        }

        // Save message to database
        const result = await query(`
            INSERT INTO messages (chat_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING id, chat_id, sender_id, content, created_at
        `, [chatId, req.user.id, content])

        // Get sender email for the response
        const userResult = await query('SELECT email FROM users WHERE id = $1', [req.user.id])

        const message = {
            ...result.rows[0],
            sender_email: userResult.rows[0].email
        }

        // Get complete chat data for first message notification
        const chatResult = await query(`
            SELECT c.*, 
                   CASE WHEN c.is_group THEN c.name 
                        ELSE (
                            SELECT u.email 
                            FROM users u 
                            JOIN chat_participants cp ON u.id = cp.user_id 
                            WHERE cp.chat_id = c.id AND u.id != $1 
                            LIMIT 1
                        ) 
                   END as display_name,
                   (
                       SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                       FROM users u
                       JOIN chat_participants cp ON u.id = cp.user_id
                       WHERE cp.chat_id = c.id
                   ) as participants,
                   (
                       SELECT json_build_object(
                           'content', m.content,
                           'created_at', m.created_at,
                           'sender_email', u.email
                       )
                       FROM messages m 
                       JOIN users u ON m.sender_id = u.id
                       WHERE m.chat_id = c.id 
                       ORDER BY m.created_at DESC 
                       LIMIT 1
                   ) as last_message
            FROM chats c
            WHERE c.id = $1
        `, [chatId])

        const io = getIO()

        // Check if this is the first message in the chat
        const messageCountResult = await query(
            'SELECT COUNT(*) as count FROM messages WHERE chat_id = $1',
            [chatId]
        )

        const isFirstMessage = parseInt(messageCountResult.rows[0].count) === 1
        console.debug(`[Chat] Message count for chat ${chatId}:`, messageCountResult.rows[0].count, 'isFirstMessage:', isFirstMessage)

        if (isFirstMessage) {
            // Get chat type for logging
            const chatType = chatResult.rows[0].is_group ? 'group' : 'direct'
            console.debug(`[Chat] First message in ${chatType} chat ${chatId}, notifying other participants`)
            
            // If this is the first message, notify other participants about the new chat
            // Include the message in the chat object
            const chatWithMessage = {
                ...chatResult.rows[0],
                last_message: {
                    content: message.content,
                    created_at: message.created_at,
                    sender_email: message.sender_email
                }
            }
            
            // Get all participants except the sender
            const otherParticipants = chatWithMessage.participants.filter(p => p.id !== req.user.id)
            
            // Notify other participants about the new chat with first message
            otherParticipants.forEach(participant => {
                // First send the new chat event so it appears in their list
                console.debug(`[Chat] Sending new_chat to user:${participant.id} for ${chatType} chat ${chatId}`)
                io.to(`user:${participant.id}`).emit('new_chat', chatWithMessage)
                
                // Then make them join the chat room
                console.debug(`[Chat] Sending join_new_chat to user:${participant.id} for ${chatType} chat ${chatId}`)
                io.to(`user:${participant.id}`).emit('join_new_chat', { chat_id: chatId })
            })
        }

        // Broadcast the message to all participants in the chat room
        const chatType = chatResult.rows[0].is_group ? 'group' : 'direct'
        console.debug(`[Chat] Broadcasting message to ${chatType} chat:${chatId}, isFirstMessage: ${isFirstMessage}`)
        io.to(`chat:${chatId}`).emit('new_message', {
            ...message,
            is_first_message: isFirstMessage
        })

        res.json(message)
    } catch (error) {
        console.error('Error sending message:', error)
        res.status(500).json({ message: 'Failed to send message' })
    }
}

export const addGroupMember = async (req, res) => {
    try {
        const { chatId } = req.params
        const { userId } = req.body

        // Verify the chat exists and is a group chat
        const chatCheck = await query(`
            SELECT is_group FROM chats WHERE id = $1
        `, [chatId])

        if (chatCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Chat not found' })
        }

        if (!chatCheck.rows[0].is_group) {
            return res.status(400).json({ message: 'Cannot add members to non-group chat' })
        }

        // Verify the requester is a member of the group
        const memberCheck = await query(`
            SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2
        `, [chatId, req.user.id])

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized to modify this chat' })
        }

        // Check if user exists
        const userCheck = await query('SELECT 1 FROM users WHERE id = $1', [userId])
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' })
        }

        // Check if user is already a member
        const existingMember = await query(`
            SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2
        `, [chatId, userId])

        if (existingMember.rows.length > 0) {
            return res.status(400).json({ message: 'User is already a member' })
        }

        // Add the new member
        await query(
            'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
            [chatId, userId]
        )

        // Get updated chat data
        const result = await query(`
            SELECT c.*, 
                   c.name as display_name,
                   (
                       SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                       FROM users u
                       JOIN chat_participants cp ON u.id = cp.user_id
                       WHERE cp.chat_id = c.id
                   ) as participants
            FROM chats c
            WHERE c.id = $1
        `, [chatId])

        const updatedChat = result.rows[0]

        // Notify all participants about the update
        const io = getIO()
        updatedChat.participants.forEach(participant => {
            io.to(`user:${participant.id}`).emit('chat_updated', updatedChat)
        })

        // Send join chat event to new member
        io.to(`user:${userId}`).emit('new_chat', updatedChat)
        io.to(`user:${userId}`).emit('join_new_chat', { chat_id: chatId })

        res.json(updatedChat)
    } catch (error) {
        console.error('Error adding group member:', error)
        res.status(500).json({ message: 'Failed to add member to group' })
    }
}

export const removeGroupMember = async (req, res) => {
    try {
        const { chatId, userId } = req.params

        // Verify the chat exists and is a group chat
        const chatCheck = await query(`
            SELECT is_group FROM chats WHERE id = $1
        `, [chatId])

        if (chatCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Chat not found' })
        }

        if (!chatCheck.rows[0].is_group) {
            return res.status(400).json({ message: 'Cannot remove members from non-group chat' })
        }

        // Verify the requester is a member of the group
        const memberCheck = await query(`
            SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2
        `, [chatId, req.user.id])

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Not authorized to modify this chat' })
        }

        // Remove the member
        await query(
            'DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        )

        // Get updated chat data
        const result = await query(`
            SELECT c.*, 
                   c.name as display_name,
                   (
                       SELECT json_agg(json_build_object('id', u.id, 'email', u.email))
                       FROM users u
                       JOIN chat_participants cp ON u.id = cp.user_id
                       WHERE cp.chat_id = c.id
                   ) as participants
            FROM chats c
            WHERE c.id = $1
        `, [chatId])

        const updatedChat = result.rows[0]

        // Notify remaining participants about the update
        const io = getIO()
        updatedChat.participants.forEach(participant => {
            io.to(`user:${participant.id}`).emit('chat_updated', updatedChat)
        })

        // Notify removed user
        io.to(`user:${userId}`).emit('removed_from_chat', { chatId })

        res.json(updatedChat)
    } catch (error) {
        console.error('Error removing group member:', error)
        res.status(500).json({ message: 'Failed to remove member from group' })
    }
} 