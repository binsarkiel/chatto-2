export const mockUsers = [
    { id: 1, email: 'john@mail.com' },
    { id: 2, email: 'shanks@mail.com' },
    { id: 3, email: 'alice@mail.com' },
    { id: 4, email: 'bob@mail.com' }
]

export const mockChats = [
    {
        id: 1,
        name: null,
        is_group: false,
        participants: [
            { id: 1, email: 'john@mail.com' },
            { id: 2, email: 'shanks@mail.com' }
        ],
        lastMessage: "Sure, I can help with the React components. What do you need?"
    },
    {
        id: 2,
        name: "Project Team",
        is_group: true,
        participants: [
            { id: 1, email: 'john@mail.com' },
            { id: 2, email: 'shanks@mail.com' },
            { id: 3, email: 'alice@mail.com' },
            { id: 4, email: 'bob@mail.com' }
        ],
        lastMessage: "The backend API is ready for testing"
    }
]

export const mockMessages = [
    {
        id: 1,
        chat_id: 1,
        sender_email: 'john@mail.com',
        content: 'Hey, how are you?',
        created_at: '2024-03-10T10:00:00Z'
    },
    {
        id: 2,
        chat_id: 1,
        sender_email: 'shanks@mail.com',
        content: 'I\'m good, thanks! Working on the project.',
        created_at: '2024-03-10T10:01:00Z'
    },
    {
        id: 3,
        chat_id: 2,
        sender_email: 'shanks@mail.com',
        content: 'Team meeting tomorrow at 10 AM',
        created_at: '2024-03-10T11:00:00Z'
    },
    {
        id: 4,
        chat_id: 2,
        sender_email: 'alice@mail.com',
        content: 'I\'ll prepare the presentation slides',
        created_at: '2024-03-10T11:05:00Z'
    },
    {
        id: 5,
        chat_id: 1,
        sender_email: 'john@mail.com',
        content: 'Can you help me with the React components?',
        created_at: '2024-03-10T12:00:00Z'
    },
    {
        id: 7,
        chat_id: 2,
        sender_email: 'bob@mail.com',
        content: 'The backend API is ready for testing',
        created_at: '2024-03-10T14:00:00Z'
    },
    {
        id: 8,
        chat_id: 1,
        sender_email: 'shanks@mail.com',
        content: 'Sure, I can help with the React components. What do you need?',
        created_at: '2024-03-10T14:30:00Z'
    }
] 