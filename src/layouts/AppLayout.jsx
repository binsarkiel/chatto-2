import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import NewChatModal from '../components/chat/NewChatModal'

export default function AppLayout({ children, onChatCreate }) {
    const { user, logout } = useAuth()
    const [modalOpen, setModalOpen] = useState(false)
    const [modalType, setModalType] = useState('individual')

    const handleNewChat = () => {
        setModalType('individual')
        setModalOpen(true)
    }

    const handleNewGroup = () => {
        setModalType('group')
        setModalOpen(true)
    }

    const handleCreateChat = async (data) => {
        try {
            // TODO: Replace with actual API call
            const mockResponse = {
                id: Math.floor(Math.random() * 1000),
                name: data.type === 'group' ? data.name : null,
                is_group: data.type === 'group',
                participants: data.participants
            }
            
            setModalOpen(false)
            onChatCreate?.(mockResponse)
        } catch (error) {
            console.error('Failed to create chat:', error)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Hi, <span className="text-blue-600">{user.email}</span>
                        </h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleNewChat}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            New Chat
                        </button>
                        <button
                            onClick={handleNewGroup}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            New Group
                        </button>
                        <button
                            onClick={logout}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            <NewChatModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                type={modalType}
                onSubmit={handleCreateChat}
            />
        </div>
    )
} 