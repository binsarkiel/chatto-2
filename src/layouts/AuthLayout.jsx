import { Link } from 'react-router-dom'

export default function AuthLayout({ children, title }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <Link to="/">
                    <h2 className="mt-6 text-center text-4xl font-extrabold text-blue-600">
                        Chatto
                    </h2>
                </Link>
                <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                    {title}
                </h2>
                {children}
            </div>
        </div>
    )
} 