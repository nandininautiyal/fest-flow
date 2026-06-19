import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function OAuthSuccess() {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const name = params.get('name')
    const email = params.get('email')
    const role = params.get('role')
    const id = params.get('id')

    if (token && id) {
      login({ id, name, email, role }, token)
      navigate('/events')
    } else {
      navigate('/login')
    }
  }, [])

  return (
    <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--parchment-dim)' }}>
      <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.2em' }}>
        Recognizing your sigil...
      </p>
    </div>
  )
}