import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Loading from '../ui/Loading'
import chatService from '../../services/chatService'

export default function NewChatModal({ isOpen, onClose, onChatCreated, isGroup = false }) {
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [users, setUsers] = useState([])
    const [selectedUsers, setSelectedUsers] = useState([])
    const [groupName, setGroupName] = useState('')
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!searchTerm.trim()) {
            setUsers([])
            return
        }

        const searchUsers = async () => {
            setSearching(true)
            setError('')
            try {
                const results = await chatService.searchUsers(searchTerm, user.email)
                setUsers(results)
            } catch (error) {
                setError('Failed to search users')
                console.error('Error searching users:', error)
            } finally {
                setSearching(false)
            }
        }

        const timeoutId = setTimeout(searchUsers, 300)
        return () => clearTimeout(timeoutId)
    }, [searchTerm, user.email])

    const handleCreateChat = async () => {
        if (loading) return
        if (!selectedUsers.length) return

        setLoading(true)
        setError('')
        try {
            let newChat
            if (isGroup) {
                if (!groupName.trim()) {
                    setError('Group name is required')
                    return
                }
                newChat = await chatService.createGroupChat(
                    groupName,
                    selectedUsers.map(u => u.id),
                    user.email
                )
            } else {
                newChat = await chatService.createChat(selectedUsers[0].id, user.email)
            }
            onChatCreated(newChat)
            handleClose()
        } catch (error) {
            setError('Failed to create chat')
            console.error('Error creating chat:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setSearchTerm('')
        setUsers([])
        setSelectedUsers([])
        setGroupName('')
        onClose()
    }

    const toggleUserSelection = (user) => {
        if (isGroup) {
            setSelectedUsers(prev => 
                prev.some(u => u.id === user.id)
                    ? prev.filter(u => u.id !== user.id)
                    : [...prev, user]
            )
        } else {
            setSelectedUsers([user])
            handleCreateChat()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        {isGroup ? 'Create Group Chat' : 'New Chat'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-2 bg-red-50 text-red-600 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreateChat}>
                    {isGroup && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Group Name
                            </label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter group name"
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isGroup ? 'Add Participants' : 'User Email'}
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search users..."
                        />
                    </div>

                    {selectedUsers.length > 0 && isGroup && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {selectedUsers.map(user => (
                                <span
                                    key={user.id}
                                    className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full flex items-center"
                                >
                                    {user.email}
                                    <button
                                        onClick={() => toggleUserSelection(user)}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto">
                        {searching ? (
                            <div className="text-center py-4 text-gray-500">
                                Searching...
                            </div>
                        ) : users.length > 0 ? (
                            <div className="space-y-2">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => toggleUserSelection(user)}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                            selectedUsers.some(u => u.id === user.id)
                                                ? 'bg-blue-100 text-blue-900'
                                                : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {user.email}
                                    </button>
                                ))}
                            </div>
                        ) : searchTerm ? (
                            <div className="text-center py-4 text-gray-500">
                                No users found
                            </div>
                        ) : null}
                    </div>

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedUsers.length || !groupName.trim() || loading}
                            className={`px-4 py-2 rounded-md ${
                                !selectedUsers.length || !groupName.trim() || loading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {loading ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
} 