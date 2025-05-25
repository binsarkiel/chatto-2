import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../layouts/AuthLayout'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'

export default function Register() {
    const { register } = useAuth()
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        try {
            setLoading(true)
            const result = await register(formData.email, formData.password)
            if (!result.success) {
                setError(result.error)
            } else {
                navigate('/login', { 
                    state: { 
                        message: 'Registration successful! Please login with your new account.',
                        type: 'success'
                    }
                })
            }
        } catch (err) {
            setError('Failed to create an account')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout title="Create your account">
            <Alert message={error} />
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="rounded-md shadow-sm space-y-4">
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="Email address"
                        value={formData.email}
                        onChange={handleChange}
                    />
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                    />
                </div>

                <div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Signing up...' : 'Sign up'}
                    </Button>
                </div>
            </form>
            <div className="text-center">
                <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Login here
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
} 