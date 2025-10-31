import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const AuthContext = createContext();

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    // Check for session_id in URL hash
    const hash = window.location.hash;
    if (hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1].split('&')[0];
      handleGoogleAuth(sessionId);
      window.location.hash = ''; // Clean URL
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (sessionId) => {
    try {
      setLoading(true);
      const schoolId = localStorage.getItem('selectedSchoolId');
      const response = await axios.post(`${API}/auth/google`, 
        { session_id: sessionId, school_id: schoolId },
        { withCredentials: true }
      );
      setUser(response.data.user);
      localStorage.removeItem('selectedSchoolId');
      toast.success('Logged in successfully!');
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error('Authentication failed');
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, 
        { email, password },
        { withCredentials: true }
      );
      setUser(response.data.user);
      toast.success('Logged in successfully!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (email, password, name, role, schoolId = null) => {
    try {
      const response = await axios.post(`${API}/auth/register`, 
        { email, password, name, role, school_id: schoolId },
        { withCredentials: true }
      );
      setUser(response.data.user);
      toast.success('Registered successfully!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      toast.success('Logged out successfully');
      window.location.href = '/';
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const googleLogin = (schoolId = null) => {
    if (schoolId) {
      localStorage.setItem('selectedSchoolId', schoolId);
    }
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}