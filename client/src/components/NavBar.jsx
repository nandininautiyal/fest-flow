import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/events" className="navbar-brand">♛ FestFlow</Link>
      <ul className="navbar-links">
        <li><Link to="/events">Events</Link></li>
        {user && <li><Link to="/my-registrations">My Registrations</Link></li>}
        {user
          ? <li><button className="btn" onClick={handleLogout}>Depart</button></li>
          : <>
              <li><Link to="/login">Enter</Link></li>
              <li><Link to="/register">Join</Link></li>
            </>
        }
      </ul>
    </nav>
  )
}