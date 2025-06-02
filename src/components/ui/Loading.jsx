export default function Loading({ size = 'medium', center = false }) {
    const sizes = {
        small: 'h-4 w-4',
        medium: 'h-8 w-8',
        large: 'h-12 w-12'
    }

    const spinner = (
        <div className={`${sizes[size]} animate-spin rounded-full border-t-2 border-b-2 border-blue-600`} />
    )

    if (center) {
        return (
            <div className="flex items-center justify-center h-full">
                {spinner}
            </div>
        )
    }

    return spinner
} 