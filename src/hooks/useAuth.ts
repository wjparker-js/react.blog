import { useState, useEffect, createContext, useContext } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MODERATOR' | 'EDITOR' | 'VIEWER'
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    // Return mock implementation for now
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      // Check for existing token in localStorage
      const token = localStorage.getItem('adminToken')
      if (token) {
        // Simulate token validation
        setUser({
          id: '1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN'
        })
      }
      setLoading(false)
    }, [])

    const login = async (email: string, password: string) => {
      setLoading(true)
      try {
        const response = await fetch(`${process.env.GATSBY_API_URL || 'http://localhost:5000'}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          throw new Error('Invalid credentials')
        }

        const data = await response.json()
        localStorage.setItem('adminToken', data.data.accessToken)
        localStorage.setItem('adminRefreshToken', data.data.refreshToken)
        
        setUser(data.data.user)
      } catch (error) {
        throw error
      } finally {
        setLoading(false)
      }
    }

    const logout = () => {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminRefreshToken')
      setUser(null)
    }

    const refreshToken = async () => {
      const token = localStorage.getItem('adminRefreshToken')
      if (!token) return

      try {
        const response = await fetch(`${process.env.GATSBY_API_URL || 'http://localhost:5000'}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          localStorage.setItem('adminToken', data.data.accessToken)
        } else {
          logout()
        }
      } catch (error) {
        logout()
      }
    }

    return {
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      refreshToken,
    }
  }
  return context
} 