import { useState, useEffect } from 'react';
import './App.css';

// Use relative paths - Vite proxy will forward to backend
const API_URL = '';

interface User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage apiUrl={API_URL} />;
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Welcome to OpenSocial</h1>
        <div className="user-info">
          {user.avatar && <img src={user.avatar} alt="Avatar" className="avatar" />}
          <div>
            <h2>{user.displayName || user.handle}</h2>
            <p className="handle">@{user.handle}</p>
            {user.description && <p className="description">{user.description}</p>}
            <p className="did">DID: {user.did}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}

function LoginPage({ apiUrl }: { apiUrl: string }) {
  const [handle, setHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Create a form to submit to the API
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${apiUrl}/login`;
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'input';
      input.value = handle;
      
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>OpenSocial</h1>
        <p className="subtitle">Community management for ATProto apps</p>
        
        <form onSubmit={handleLogin} className="login-form">
          <h2>Login with ATProtocol</h2>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="your-handle.bsky.social"
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            disabled={isLoading || !handle}
            className="login-button"
          >
            {isLoading ? 'Redirecting...' : 'Login'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default App;
