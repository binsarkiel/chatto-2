import { Routes, Route, Link } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import Register from "./pages/Register"
import Login from "./pages/Login"
import Chat from "./pages/Chat"
import ProtectedRoute from "./components/ProtectedRoute"

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to <span className="text-blue-600">Chatto</span></h1>
            <h2 className="text-xl text-gray-600 mb-8">Just a simple chatting application.</h2>
            <div className="space-x-4">
              <Link className="text-blue-600 hover:text-blue-500 font-medium" to="/register">Sign up</Link>
              <span className="text-gray-500">or</span>
              <Link className="text-blue-600 hover:text-blue-500 font-medium" to="/login">Login</Link>
            </div>
          </div>
        } />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}