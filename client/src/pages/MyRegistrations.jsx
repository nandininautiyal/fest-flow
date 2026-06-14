import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

export default function MyRegistrations() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [registrations, setRegistrations] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])

  const [teamName, setTeamName] = useState('')
  const [teamEventId, setTeamEventId] = useState('')
  const [teamMsg, setTeamMsg] = useState(null)
  const [teamError, setTeamError] = useState(null)

  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState(null)
  const [joinError, setJoinError] = useState(null)

  const [cancelMsg, setCancelMsg] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [regRes, teamRes, eventRes] = await Promise.all([
        axios.get(`${API}/api/registrations/my`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/teams/my`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/events`)
      ])
      setRegistrations(regRes.data)
      setTeams(teamRes.data)
      setEvents(eventRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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
      setTeamMsg(`Team "${res.data.name}" created! Share the invite code with your companions.`)
      setTeamName('')
      setTeamEventId('')
      fetchAll()
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
      setJoinMsg(`Joined "${res.data.team.name}" successfully! Await your leader's command.`)
      setJoinCode('')
      fetchAll()
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join team')
    }
  }

  async function handleRegisterTeam(teamId) {
    setTeamMsg(null)
    setTeamError(null)
    try {
      const res = await axios.post(
        `${API}/api/teams/${teamId}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.waitlisted) {
        setTeamMsg(`Your team is on the waitlist — position ${res.data.position}`)
      } else {
        setTeamMsg('Your company has been registered for the trial!')
      }
      fetchAll()
    } catch (err) {
      setTeamError(err.response?.data?.error || 'Registration failed')
    }
  }

  async function handleCancelTeam(teamId) {
    setTeamMsg(null)
    setTeamError(null)
    try {
      await axios.delete(
        `${API}/api/teams/${teamId}/registration`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTeamMsg('Your company has withdrawn from the trial.')
      fetchAll()
    } catch (err) {
      setTeamError(err.response?.data?.error || 'Failed to withdraw')
    }
  }

  async function handleCancel(regId) {
    setCancelMsg(null)
    try {
      await axios.delete(`${API}/api/registrations/${regId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCancelMsg('Registration cancelled.')
      fetchAll()
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

        {/* ── SOLO REGISTRATIONS ── */}
        <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Solo Trials
        </h2>

        {cancelMsg && <div className="success-msg" style={{ marginBottom: '1rem' }}>{cancelMsg}</div>}

        {registrations.filter(r => r.team_id === null).length === 0 ? (
          <p style={{ color: 'var(--parchment-dim)', marginBottom: '1.5rem' }}>
            No solo registrations yet.{' '}
            <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate('/events')}>
              Browse events →
            </span>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {registrations.filter(r => r.team_id === null).map(reg => (
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

        {/* ── TEAMS ── */}
        <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Your Companies
        </h2>

        {teamMsg && <div className="success-msg" style={{ marginBottom: '1rem' }}>{teamMsg}</div>}
        {teamError && <div className="error-msg" style={{ marginBottom: '1rem' }}>{teamError}</div>}

        {teams.length === 0 ? (
          <p style={{ color: 'var(--parchment-dim)', marginBottom: '1.5rem' }}>
            You are not part of any company yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {teams.map(team => (
              <div key={team.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <p className="card-title" style={{ marginBottom: '0.25rem' }}>{team.name}</p>
                    <p className="card-meta">⚔ {team.event_name} · {formatDate(team.starts_at)}</p>
                    <p className="card-meta" style={{ marginTop: '0.25rem' }}>Led by {team.leader_name}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <span className="card-tag" style={{
                      borderColor: team.is_registered ? 'var(--gold)' : 'var(--smoke)',
                      color: team.is_registered ? 'var(--gold)' : 'var(--parchment-dim)'
                    }}>
                      {team.is_registered ? 'Registered' : 'Awaiting Registration'}
                    </span>
                    {team.leader_id === user.id && !team.is_registered && (
                      <button
                        className="btn btn-solid"
                        style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}
                        onClick={() => handleRegisterTeam(team.id)}
                      >
                        Register Company
                      </button>
                    )}
                    {team.leader_id === user.id && team.is_registered && (
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}
                        onClick={() => handleCancelTeam(team.id)}
                      >
                        Withdraw Company
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(201,168,76,0.06)', borderRadius: '2px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--parchment-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Invite Code:{' '}
                  </span>
                  <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', letterSpacing: '0.1em' }}>
                    {team.invite_code}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="divider">♛</div>

        {/* ── FORM & JOIN ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>

          <div className="card">
            <p className="card-title" style={{ marginBottom: '0.25rem' }}>Form a Company</p>
            <p className="card-meta" style={{ marginBottom: '1.25rem' }}>
              Create a team for a team event and receive an invite code.
            </p>
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
                <select value={teamEventId} onChange={e => setTeamEventId(e.target.value)} required>
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
          </div>

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