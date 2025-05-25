import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth as authService } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            authService.verify(token)
                .then(data => {
                    if (data.success) {
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
            const data = await authService.login(email, password)
            
            if (data.success) {
                localStorage.setItem('token', data.token)
                setUser(data.user)
                navigate('/chat')
            }
            
            return data
        } catch (error) {
            return { success: false, error: 'An error occurred during login' }
        }
    }

    const register = async (email, password) => {
        try {
            const data = await authService.register(email, password)
            
            if (data.success) {
                navigate('/login')
            }
            
            return data
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