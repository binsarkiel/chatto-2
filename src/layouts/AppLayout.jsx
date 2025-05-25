import { useAuth } from '../contexts/AuthContext'

export default function AppLayout({ children }) {
    const { user, logout } = useAuth()

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Hi, <span className="text-blue-600">{user.email}</span>
                        </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium rounded-md"
                            disabled
                        >
                            New Chat
                        </button>
                        <button
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium rounded-md"
                            disabled
                        >
                            New Group
                        </button>
                        <button
                            onClick={logout}
                            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-md"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    )
} 