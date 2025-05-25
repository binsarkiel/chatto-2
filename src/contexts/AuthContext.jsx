import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token')
        if (token) {
            // Verify token and set user
            fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setUser(data.user)
                } else {
                    localStorage.removeItem('token')
                }
            })
            .catch(() => {
                localStorage.removeItem('token')
            })
            .finally(() => {
                setLoading(false)
            })
        } else {
            setLoading(false)
        }
    }, [])

    const login = async (email, password) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            
            if (data.token) {
                localStorage.setItem('token', data.token)
                setUser(data.user)
                navigate('/chat')
                return { success: true }
            } else {
                return { success: false, error: data.message }
            }
        } catch (error) {
            return { success: false, error: 'An error occurred during login' }
        }
    }

    const register = async (email, password) => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            
            if (data.success) {
                navigate('/login')
                return { success: true }
            } else {
                return { success: false, error: data.message }
            }
        } catch (error) {
            return { success: false, error: 'An error occurred during registration' }
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        setUser(null)
        navigate('/')
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
} 