import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function EventDetail() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regLoading, setRegLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isError, setIsError] = useState(false)

  useEffect(() => { fetchEvent() }, [id])

  async function fetchEvent() {
    try {
      const res = await axios.get(`${API}/api/events/${id}`)
      setEvent(res.data)
    } catch {
      navigate('/events')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    if (!user) return navigate('/login')
    setRegLoading(true)
    setMessage(null)
    try {
      const res = await axios.post(
        `${API}/api/registrations`,
        { event_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.waitlisted) {
        setIsError(false)
        setMessage(`You are on the waitlist — position ${res.data.position}`)
      } else {
        setIsError(false)
        setMessage('Your seat has been confirmed. May you reign supreme.')
      }
      fetchEvent()
    } catch (err) {
      setIsError(true)
      setMessage(err.response?.data?.error || 'Registration failed')
    } finally {
      setRegLoading(false)
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--parchment-dim)' }}>
      <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.2em' }}>Summoning...</p>
    </div>
  )

  if (!event) return null

  const confirmed = parseInt(event.confirmed_count) || 0
  const isFull = confirmed >= event.capacity
  const pct = Math.min((confirmed / event.capacity) * 100, 100)

  return (
    <div className="page-enter">
      <div className="container" style={{ maxWidth: '720px', padding: '3rem 2rem' }}>

        <button
          className="btn"
          style={{ marginBottom: '2rem', fontSize: '0.7rem' }}
          onClick={() => navigate('/events')}
        >
          ← Back to Events
        </button>

        <span className="card-tag">{event.event_type}</span>
        <h1 style={{ margin: '0.75rem 0 0.5rem', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
          {event.name}
        </h1>
        <p style={{ color: 'var(--parchment-dim)', fontSize: '1.05rem', marginBottom: '2rem' }}>
          {event.description}
        </p>

        <div className="divider">♛</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Date</p>
            <p>{formatDate(event.starts_at)}</p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Time</p>
            <p>{formatTime(event.starts_at)} — {formatTime(event.ends_at)}</p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Venue</p>
            <p>{event.venue || 'To be announced'}</p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Fest</p>
            <p>{event.fest_name}</p>
          </div>
        </div>

        <div className="divider">♛</div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>
              Seats Claimed
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: isFull ? 'var(--crimson)' : 'var(--gold)' }}>
              {confirmed} / {event.capacity}
            </span>
          </div>
          <div className="seat-bar">
            <div className="seat-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {message && (
          <div className={isError ? 'error-msg' : 'success-msg'} style={{ marginBottom: '1.5rem' }}>
            {message}
          </div>
        )}

        {user ? (
          <button
            className="btn btn-solid"
            style={{ width: '100%', padding: '1rem' }}
            onClick={handleRegister}
            disabled={regLoading}
          >
            {regLoading ? 'Inscribing your name...' : isFull ? 'Join the Waitlist' : 'Claim Your Seat'}
          </button>
        ) : (
          <button
            className="btn btn-solid"
            style={{ width: '100%', padding: '1rem' }}
            onClick={() => navigate('/login')}
          >
            Enter the Realm to Register
          </button>
        )}
      </div>
    </div>
  )
}