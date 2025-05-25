export default function Input({
    id,
    name,
    type = 'text',
    placeholder,
    value,
    onChange,
    required = false,
    className = ''
}) {
    return (
        <div>
            <label htmlFor={id} className="sr-only">{placeholder}</label>
            <input
                id={id}
                name={name}
                type={type}
                required={required}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
        </div>
    )
} 