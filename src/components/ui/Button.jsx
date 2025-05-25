export default function Button({ 
    children, 
    type = 'button',
    variant = 'primary',
    disabled = false,
    className = '',
    onClick
}) {
    const baseStyles = 'px-4 py-2 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    const variants = {
        primary: `text-white ${disabled ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:ring-blue-500`,
        secondary: `text-gray-600 ${disabled ? 'cursor-not-allowed' : 'hover:text-gray-900'}`,
    }

    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    )
} 