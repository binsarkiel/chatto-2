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
                const results = await chatService.searchUsers(searchTerm)
                // Filter out the current user from results
                setUsers(results.filter(u => u.email !== user.email))
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

    const handleCreateChat = async (e) => {
        e.preventDefault()
        if (loading) return
        if (!selectedUsers.length) {
            setError('Please select at least one user')
            return
        }

        setLoading(true)
        setError('')
        
        try {
            let newChat
            if (isGroup) {
                if (!groupName.trim()) {
                    setError('Group name is required')
                    setLoading(false)
                    return
                }
                console.debug('[Chat] Creating group chat:', {
                    name: groupName.trim(),
                    participants: selectedUsers.map(u => ({ id: u.id, email: u.email }))
                })
                newChat = await chatService.createGroupChat(
                    groupName.trim(),
                    selectedUsers.map(u => u.id)
                )
                console.debug('[Chat] Group chat created:', newChat)
            } else {
                console.debug('[Chat] Creating direct message:', {
                    participant: selectedUsers[0]
                })
                newChat = await chatService.createDirectMessage(selectedUsers[0].id)
                console.debug('[Chat] Direct message created:', newChat)
            }
            
            onChatCreated(newChat)
            handleClose()
        } catch (error) {
            console.error('[Chat] Error creating chat:', error)
            setError(error.message || 'Failed to create chat')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setSearchTerm('')
        setUsers([])
        setSelectedUsers([])
        setGroupName('')
        setError('')
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
            // Don't automatically create chat for direct messages
            // Let the user confirm with the create button
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        {isGroup ? 'Create Group Chat' : 'New Chat'}
                    </h2>
                    <button
                        onClick={handleClose}
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
                            {isGroup ? 'Add Participants' : 'Select User'}
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search users by email..."
                        />
                    </div>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Selected {isGroup ? 'Participants' : 'User'}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map(user => (
                                    <span
                                        key={user.id}
                                        className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full flex items-center"
                                    >
                                        {user.email}
                                        <button
                                            type="button"
                                            onClick={() => toggleUserSelection(user)}
                                            className="ml-1 text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {searching ? (
                        <div className="flex justify-center py-4">
                            <Loading />
                        </div>
                    ) : users.length > 0 && (
                        <div className="mb-4 max-h-48 overflow-y-auto">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search Results
                            </label>
                            <div className="space-y-1">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => toggleUserSelection(user)}
                                        className={`w-full text-left px-3 py-2 rounded-md transition-colors
                                            ${selectedUsers.some(u => u.id === user.id)
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'hover:bg-gray-100'
                                            }`}
                                    >
                                        {user.email}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedUsers.length || (isGroup && !groupName.trim()) || loading}
                            className={`px-4 py-2 rounded-md ${
                                !selectedUsers.length || (isGroup && !groupName.trim()) || loading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </span>
                            ) : (
                                `Create ${isGroup ? 'Group' : 'Chat'}`
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
} 