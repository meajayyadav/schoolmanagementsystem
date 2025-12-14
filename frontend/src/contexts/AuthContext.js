// contexts/AuthContext.js
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import api from '@/api'; // Use api instance with X-Tenant interceptor
import { toast } from 'sonner';
import Swal from 'sweetalert2';

const AuthContext = createContext();

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Session expiration time in milliseconds (1 hour)
const SESSION_EXPIRATION_MS = 60 * 60 * 1000;
// Check every 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
// Warning time before expiration (10 minutes)
const WARNING_TIME_MS = 10 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [lastActivity, setLastActivity] = useState(() => {
    const saved = localStorage.getItem('lastActivity');
    return saved ? parseInt(saved) : Date.now();
  });

  const [sessionExpiresAt, setSessionExpiresAt] = useState(() => {
    const saved = localStorage.getItem('sessionExpiresAt');
    return saved ? parseInt(saved) : Date.now() + SESSION_EXPIRATION_MS;
  });

  const [loading, setLoading] = useState(true);
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  
  // Refs to store interval IDs
  const sessionCheckRef = useRef(null);
  const activityMonitorRef = useRef(null);
  const isDialogOpenRef = useRef(false); // Track if confirmation dialog is open

  // Function to set dialog state - can be called from useConfirm
  const setDialogOpen = useCallback((isOpen) => {
    isDialogOpenRef.current = isOpen;
  }, []);

  // Update last activity on user interaction
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem('lastActivity', now.toString());
  }, []);

  // Setup activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => updateActivity();
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // Monitor activity and reset session warning
  useEffect(() => {
    if (activityMonitorRef.current) {
      clearInterval(activityMonitorRef.current);
    }

    activityMonitorRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      // If user is active, reset warning flag
      if (timeSinceLastActivity < WARNING_TIME_MS && sessionWarningShown) {
        setSessionWarningShown(false);
      }
    }, 60000); // Check every minute

    return () => {
      if (activityMonitorRef.current) {
        clearInterval(activityMonitorRef.current);
      }
    };
  }, [lastActivity, sessionWarningShown]);

  // Check session expiration
  const checkSessionExpiration = useCallback(async () => {
    // Skip session check if dialog is open
    if (!user || isDialogOpenRef.current) return;

    try {
      // Check session status with backend
      const response = await api.get(`/auth/check-session`);
      
      if (response.data.valid) {
        // Update session expiration time from backend
        const expiresAt = new Date(response.data.expires_at).getTime();
        setSessionExpiresAt(expiresAt);
        localStorage.setItem('sessionExpiresAt', expiresAt.toString());
        
        // Check if session is about to expire
        const now = Date.now();
        const timeLeft = expiresAt - now;
        
        // Show warning 10 minutes before expiration
        if (timeLeft <= WARNING_TIME_MS && timeLeft > 0 && !sessionWarningShown) {
          showSessionWarning(timeLeft);
        }
        
        // If session expired
        if (timeLeft <= 0) {
          handleSessionExpired();
        }
      } else {
        handleSessionExpired();
      }
    } catch (error) {
      // If check fails, assume session is invalid
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
    }
  }, [user, sessionWarningShown]);

  // Show session warning dialog
  const showSessionWarning = useCallback((timeLeft) => {
    const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
    
    Swal.fire({
      title: 'Session About to Expire',
      html: `
        <div class="text-center">
          <div class="mb-4">
            <svg class="mx-auto text-yellow-500 w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p class="text-lg mb-2">Your session will expire in <strong>${minutesLeft} minutes</strong>.</p>
          <p class="text-gray-600">Would you like to continue your session?</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continue Session',
      cancelButtonText: 'Logout',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showCloseButton: false,
      backdrop: 'rgba(0,0,0,0.7)',
      customClass: {
        popup: 'session-warning-modal'
      },
      willOpen: () => {
        setSessionWarningShown(true);
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        // User wants to continue session
        try {
          const response = await api.post(`/auth/refresh`, {});
          
          if (response.data.session_token) {
            // Update session expiration
            const newExpiresAt = Date.now() + SESSION_EXPIRATION_MS;
            setSessionExpiresAt(newExpiresAt);
            localStorage.setItem('sessionExpiresAt', newExpiresAt.toString());
            
            // Update last activity
            updateActivity();
            
            // Reset warning flag
            setSessionWarningShown(false);
            
            toast.success('Session extended successfully');
          }
        } catch (error) {
          toast.error('Failed to extend session. Please login again.');
          await handleLogout();
        }
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        // User chose to logout
        await handleLogout();
      }
    });
  }, [updateActivity]);

  // Handle session expiration
  const handleSessionExpired = useCallback(async () => {
    if (sessionWarningShown) return; // Prevent multiple dialogs
    
    Swal.fire({
      title: 'Session Expired',
      html: `
        <div class="text-center">
          <div class="mb-4">
            <svg class="mx-auto text-red-500 w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p class="text-lg mb-2">Your session has expired due to inactivity.</p>
          <p class="text-gray-600">Please login again to continue.</p>
        </div>
      `,
      icon: 'error',
      confirmButtonText: 'Login Again',
      confirmButtonColor: '#3085d6',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showCancelButton: false,
      showCloseButton: false,
      backdrop: 'rgba(0,0,0,0.7)'
    }).then(async () => {
      await handleLogout();
    });
  }, [sessionWarningShown]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await api.post(`/auth/logout`, {});
    } catch (error) {
      // Silently fail if logout endpoint fails
    } finally {
      setUser(null);
      setSessionWarningShown(false);
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('sessionExpiresAt');
      
      // Clear intervals
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
      
      if (activityMonitorRef.current) {
        clearInterval(activityMonitorRef.current);
        activityMonitorRef.current = null;
      }
      
      window.location.href = '/login';
    }
  }, []);

  // Setup session check interval
  useEffect(() => {
    if (user) {
      // Initial check
      checkSessionExpiration();
      
      // Set up interval for checking
      sessionCheckRef.current = setInterval(checkSessionExpiration, CHECK_INTERVAL_MS);
      
      // Also check on window focus
      const handleFocus = () => {
        checkSessionExpiration();
        updateActivity();
      };
      
      window.addEventListener('focus', handleFocus);
      
      return () => {
        if (sessionCheckRef.current) {
          clearInterval(sessionCheckRef.current);
        }
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user, checkSessionExpiration, updateActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
      if (activityMonitorRef.current) {
        clearInterval(activityMonitorRef.current);
      }
    };
  }, []);

  // 🔄 Keep localStorage in sync when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set initial session expiration if not set
      if (!localStorage.getItem('sessionExpiresAt')) {
        const expiresAt = Date.now() + SESSION_EXPIRATION_MS;
        setSessionExpiresAt(expiresAt);
        localStorage.setItem('sessionExpiresAt', expiresAt.toString());
      }
      
      // Set initial activity time if not set
      if (!localStorage.getItem('lastActivity')) {
        updateActivity();
      }
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('sessionExpiresAt');
    }
  }, [user, updateActivity]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get(`/auth/me`);
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        
        // Get session info if available
        try {
          const sessionRes = await api.get(`/auth/check-session`);
          if (sessionRes.data.valid && sessionRes.data.expires_at) {
            const expiresAt = new Date(sessionRes.data.expires_at).getTime();
            setSessionExpiresAt(expiresAt);
            localStorage.setItem('sessionExpiresAt', expiresAt.toString());
          }
        } catch (sessionError) {
          // If session check fails, use default expiration
          const expiresAt = Date.now() + SESSION_EXPIRATION_MS;
          setSessionExpiresAt(expiresAt);
          localStorage.setItem('sessionExpiresAt', expiresAt.toString());
        }
        
        updateActivity();
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
  }, [updateActivity]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (emailOrMobile, password) => {
    try {
      const res = await api.post(
        `/auth/login`, 
        { email: emailOrMobile, password }
      );
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Set new session expiration
      const expiresAt = Date.now() + SESSION_EXPIRATION_MS;
      setSessionExpiresAt(expiresAt);
      localStorage.setItem('sessionExpiresAt', expiresAt.toString());
      
      updateActivity();
      setSessionWarningShown(false);
      
      toast.success('Login successful');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (email, password, name, role, schoolId = null) => {
    try {
      const res = await api.post(
        `/auth/register`,
        { email, password, name, role, school_id: schoolId }
      );
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Set new session expiration
      const expiresAt = Date.now() + SESSION_EXPIRATION_MS;
      setSessionExpiresAt(expiresAt);
      localStorage.setItem('sessionExpiresAt', expiresAt.toString());
      
      updateActivity();
      setSessionWarningShown(false);
      
      toast.success('Registered successfully!');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    await handleLogout();
  };

  const googleLogin = (schoolId = null) => {
    if (schoolId) localStorage.setItem('selectedSchoolId', schoolId);
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // Manual session refresh function
  const refreshSession = async () => {
    try {
      const response = await api.post(`/auth/refresh`, {});
      
      if (response.data.session_token) {
        const newExpiresAt = Date.now() + SESSION_EXPIRATION_MS;
        setSessionExpiresAt(newExpiresAt);
        localStorage.setItem('sessionExpiresAt', newExpiresAt.toString());
        updateActivity();
        setSessionWarningShown(false);
        return true;
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        register,
        logout,
        googleLogin,
        refreshSession,
        updateActivity,
        sessionExpiresAt,
        lastActivity,
        setDialogOpen, // Export setDialogOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}