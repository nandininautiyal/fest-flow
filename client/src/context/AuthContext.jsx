import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ff_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('ff_token') || null)

  function login(userData, jwt) {
    setUser(userData)
    setToken(jwt)
    localStorage.setItem('ff_user', JSON.stringify(userData))
    localStorage.setItem('ff_token', jwt)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('ff_user')
    localStorage.removeItem('ff_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}