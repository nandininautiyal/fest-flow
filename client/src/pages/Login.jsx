import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/auth/login`, { email, password })
      login(res.data.user, res.data.token)
      navigate('/events')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page page-enter">
      <div className="auth-box">
        <p className="auth-title">FestFlow</p>
        <p className="auth-sub">Enter your credentials to continue</p>

        <div className="divider">♛</div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-solid" style={{width:'100%'}} disabled={loading}>
            {loading ? 'Entering...' : 'Enter the Realm'}
          </button>
        </form>

        <div className="divider">♛</div>
        <p style={{textAlign:'center', fontSize:'0.9rem', color:'var(--parchment-dim)'}}>
          New here? <Link to="/register">Claim your seat</Link>
        </p>
      </div>
    </div>
  )
}