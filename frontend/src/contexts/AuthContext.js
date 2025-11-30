import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const AuthContext = createContext();

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // ✅ Load user from localStorage if available
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

  }, []);
  

  // 🔄 Keep localStorage in sync when user changes
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch {
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrMobile, password) => {
    try {
      // Backend accepts both email and mobile number in the 'email' field
      const res = await axios.post(
        `${API}/auth/login`, 
        { email: emailOrMobile, password }, 
        { withCredentials: true }
      );
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Login successful');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (email, password, name, role, schoolId = null) => {
    try {
      const res = await axios.post(
        `${API}/auth/register`,
        { email, password, name, role, school_id: schoolId },
        { withCredentials: true }
      );
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Registered successfully!');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      localStorage.removeItem('user');
      toast.success('Logged out');
      window.location.href = '/';
    } catch {
      toast.error('Logout failed');
    }
  };

  const googleLogin = (schoolId = null) => {
    if (schoolId) localStorage.setItem('selectedSchoolId', schoolId);
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser, // ✅ expose this so Profile.js can update user info
        loading,
        login,
        register,
        logout,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
