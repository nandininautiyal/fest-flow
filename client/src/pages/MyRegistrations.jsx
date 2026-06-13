import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

export default function MyRegistrations() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)

  // team creation state
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamEventId, setTeamEventId] = useState('')
  const [events, setEvents] = useState([])
  const [teamMsg, setTeamMsg] = useState(null)
  const [teamError, setTeamError] = useState(null)
  const [createdTeam, setCreatedTeam] = useState(null)

  // join team state
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState(null)
  const [joinError, setJoinError] = useState(null)

  // cancel state
  const [cancelMsg, setCancelMsg] = useState(null)

  useEffect(() => {
    fetchRegistrations()
    fetchEvents()
  }, [])

  async function fetchRegistrations() {
    try {
      const res = await axios.get(`${API}/api/registrations/my`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRegistrations(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEvents() {
    try {
      const res = await axios.get(`${API}/api/events`)
      setEvents(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateTeam(e) {
    e.preventDefault()
    setTeamMsg(null)
    setTeamError(null)
    try {
      const res = await axios.post(
        `${API}/api/teams`,
        { name: teamName, event_id: teamEventId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCreatedTeam(res.data)
      setTeamMsg(`Team "${res.data.name}" created! Invite code: ${res.data.invite_code}`)
      setTeamName('')
      setTeamEventId('')
    } catch (err) {
      setTeamError(err.response?.data?.error || 'Failed to create team')
    }
  }

  async function handleJoinTeam(e) {
    e.preventDefault()
    setJoinMsg(null)
    setJoinError(null)
    try {
      const res = await axios.post(
        `${API}/api/teams/join`,
        { invite_code: joinCode },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setJoinMsg(`Joined "${res.data.team.name}" successfully!`)
      setJoinCode('')
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join team')
    }
  }

  async function handleRegisterTeam() {
    if (!createdTeam) return
    try {
      const res = await axios.post(
        `${API}/api/teams/${createdTeam.id}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.waitlisted) {
        setTeamMsg(`Your team is on the waitlist — position ${res.data.position}`)
      } else {
        setTeamMsg('Your team has been registered successfully!')
        fetchRegistrations()
      }
    } catch (err) {
      setTeamError(err.response?.data?.error || 'Registration failed')
    }
  }

  async function handleCancel(regId) {
    setCancelMsg(null)
    try {
      await axios.delete(`${API}/api/registrations/${regId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCancelMsg('Registration cancelled.')
      fetchRegistrations()
    } catch (err) {
      setCancelMsg(err.response?.data?.error || 'Failed to cancel')
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--parchment-dim)' }}>
      <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.2em' }}>
        Consulting the scrolls...
      </p>
    </div>
  )

  return (
    <div className="page-enter">
      <div className="container" style={{ padding: '3rem 2rem' }}>

        <p className="hero-eyebrow">Your Chronicle</p>
        <h1 style={{ marginBottom: '0.5rem' }}>My Registrations</h1>
        <p style={{ color: 'var(--parchment-dim)', marginBottom: '2rem' }}>
          Every trial you have entered is recorded here.
        </p>

        <div className="divider">♛</div>

        {/* REGISTRATIONS LIST */}
        {registrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--parchment-dim)' }}>
            <p style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>
              You have not entered any trials yet.
            </p>
            <button className="btn btn-solid" onClick={() => navigate('/events')}>
              Browse Events
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {cancelMsg && <div className="success-msg">{cancelMsg}</div>}
            {registrations.map(reg => (
              <div key={reg.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="card-title" style={{ marginBottom: '0.25rem' }}>{reg.event_name}</p>
                  <p className="card-meta">⚔ {formatDate(reg.starts_at)} · {reg.venue}</p>
                  <span className="card-tag" style={{
                    marginTop: '0.5rem',
                    borderColor: reg.status === 'confirmed' ? 'var(--gold)' : 'var(--smoke)',
                    color: reg.status === 'confirmed' ? 'var(--gold)' : 'var(--parchment-dim)'
                  }}>
                    {reg.status}
                  </span>
                </div>
                {reg.status === 'confirmed' && (
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: '0.7rem' }}
                    onClick={() => handleCancel(reg.id)}
                  >
                    Withdraw
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="divider">♛</div>

        {/* TEAM SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>

          {/* CREATE TEAM */}
          <div className="card">
            <p className="card-title" style={{ marginBottom: '0.25rem' }}>Form a Company</p>
            <p className="card-meta" style={{ marginBottom: '1.25rem' }}>
              Create a team for a team event and receive an invite code for your companions.
            </p>

            {teamMsg && <div className="success-msg" style={{ marginBottom: '1rem' }}>{teamMsg}</div>}
            {teamError && <div className="error-msg" style={{ marginBottom: '1rem' }}>{teamError}</div>}

            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Team Name</label>
                <input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. The Iron Legion"
                  required
                />
              </div>
              <div className="form-group">
                <label>Event</label>
                <select
                  value={teamEventId}
                  onChange={e => setTeamEventId(e.target.value)}
                  required
                >
                  <option value="">Select an event</option>
                  {events.filter(ev => ev.event_type === 'team').map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-solid" style={{ width: '100%' }}>
                Form the Company
              </button>
            </form>

            {createdTeam && (
              <div style={{ marginTop: '1.25rem' }}>
                <div className="success-msg" style={{ marginBottom: '1rem', letterSpacing: '0.05em' }}>
                  Invite code: <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
                    {createdTeam.invite_code}
                  </strong>
                </div>
                <button className="btn" style={{ width: '100%' }} onClick={handleRegisterTeam}>
                  Register This Team
                </button>
              </div>
            )}
          </div>

          {/* JOIN TEAM */}
          <div className="card">
            <p className="card-title" style={{ marginBottom: '0.25rem' }}>Join a Company</p>
            <p className="card-meta" style={{ marginBottom: '1.25rem' }}>
              Enter an invite code from your team leader to join their ranks.
            </p>

            {joinMsg && <div className="success-msg" style={{ marginBottom: '1rem' }}>{joinMsg}</div>}
            {joinError && <div className="error-msg" style={{ marginBottom: '1rem' }}>{joinError}</div>}

            <form onSubmit={handleJoinTeam}>
              <div className="form-group">
                <label>Invite Code</label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="e.g. abc12345"
                  required
                />
              </div>
              <button className="btn btn-solid" style={{ width: '100%' }}>
                Join the Company
              </button>
            </form>
          </div>
        </div>

        <div style={{ height: '4rem' }} />
      </div>
    </div>
  )
}