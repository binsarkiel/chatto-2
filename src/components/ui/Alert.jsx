export default function Alert({ type = 'error', message }) {
    if (!message) return null

    const types = {
        error: 'bg-red-50 border-red-200 text-red-600',
        success: 'bg-green-50 border-green-200 text-green-600',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-600',
        info: 'bg-blue-50 border-blue-200 text-blue-600'
    }

    return (
        <div className={`${types[type]} border px-4 py-3 rounded relative`} role="alert">
            <span className="block sm:inline">{message}</span>
        </div>
    )
} 