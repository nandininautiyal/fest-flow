import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL

const eventImages = {
  'The Sovereign\'s Dance': 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=600&q=80',
  'Voice of the Oracle': 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80',
  'The Codex Trial': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
  'Council of Strategists': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
  'Masks of the Fallen Court': 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&q=80',
  'Threads of the Crowned': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'The Great Proclamation': 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=600&q=80',
  'The Iron Forge': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80',
  'Eye of the Realm': 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80',
  'Hackathon 2026': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80',
  'The Treasury of Minds': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
  'The Royal Banquet': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
}

export default function BrowseEvents() {
  const [events, setEvents] = useState([])
  const [fests, setFests] = useState([])
  const [activeFestId, setActiveFestId] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAll()
    const socket = io(API)
    socket.on('seat_update', ({ event_id, confirmed_count, capacity }) => {
      setEvents(prev => prev.map(e =>
        e.id === event_id ? { ...e, confirmed_count: String(confirmed_count), capacity } : e
      ))
    })
    return () => socket.disconnect()
  }, [])

  async function fetchAll() {
    try {
      const [eventsRes, festsRes] = await Promise.all([
        axios.get(`${API}/api/events`),
        axios.get(`${API}/api/events/fests/all`)
      ])
      setEvents(eventsRes.data)
      setFests(festsRes.data)
      if (festsRes.data.length > 0) {
        setActiveFestId(festsRes.data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  function seatsFraction(event) {
    const confirmed = parseInt(event.confirmed_count) || 0
    const capacity = parseInt(event.capacity) || 1
    return Math.min((confirmed / capacity) * 100, 100)
  }

  function seatsLeft(event) {
    const left = event.capacity - (parseInt(event.confirmed_count) || 0)
    if (left <= 0) return 'Full — Waitlist open'
    if (left <= 5) return `${left} seats remaining`
    return `${left} of ${event.capacity} seats open`
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--parchment-dim)' }}>
      <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.2em' }}>
        Summoning events...
      </p>
    </div>
  )

  const activeFest = fests.find(f => f.id === activeFestId)
  const filteredEvents = activeFestId
    ? events.filter(e => e.fest_id === activeFestId)
    : events

  return (
    <div className="page-enter">
      <div className="hero">
        <p className="hero-eyebrow">{activeFest ? activeFest.name : 'FestFlow'}</p>
        <h1 className="hero-title">Choose Your Trial</h1>
        <p className="hero-sub">
          Every event is a test of a different craft. Register before the gates close.
        </p>
      </div>

      <div className="container">

        {/* FEST DROPDOWN */}
        {fests.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
            <select
              value={activeFestId || ''}
              onChange={(e) => setActiveFestId(e.target.value)}
              style={{
                background: 'var(--navy)',
                border: '1px solid var(--gold-dim)',
                color: 'var(--gold)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.85rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '0.75rem 1.5rem',
                borderRadius: '2px',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '280px',
                textAlign: 'center',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              {fests.map(fest => (
                <option key={fest.id} value={fest.id} style={{ background: 'var(--navy)', color: 'var(--parchment)' }}>
                  {fest.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="divider">♛</div>

        {filteredEvents.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--parchment-dim)', padding: '3rem' }}>
            No events have been proclaimed yet for this fest.
          </p>
        ) : (
          <div className="events-grid">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="card"
                onClick={() => navigate(`/events/${event.id}`)}
                style={{ padding: 0, overflow: 'hidden' }}
              >
                <img
                  src={eventImages[event.name] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'}
                  alt={event.name}
                  className="card-image"
                />
                <div style={{ padding: '1.25rem 1.75rem 1.75rem' }}>
                  <span className="card-tag">{event.event_type}</span>
                  <p className="card-title">{event.name}</p>
                  <p className="card-meta">{event.description}</p>
                  <p className="card-meta" style={{ marginTop: '0.75rem' }}>
                    ⚔ {formatDate(event.starts_at)} &nbsp;·&nbsp; {event.venue}
                  </p>
                  <div className="seat-bar">
                    <div
                      className="seat-bar-fill"
                      style={{ width: `${seatsFraction(event)}%` }}
                    />
                  </div>
                  <p style={{
                    fontSize: '0.8rem',
                    color: parseInt(event.confirmed_count) >= event.capacity
                      ? 'var(--crimson)' : 'var(--parchment-dim)',
                    marginTop: '0.4rem',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.05em'
                  }}>
                    {seatsLeft(event)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: '4rem' }} />
      </div>
    </div>
  )
}