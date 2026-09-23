import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('STAFF');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('biomed_auth_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setAuthSession(parsed);
          return;
        }
      } catch (e) {
        sessionStorage.removeItem('biomed_auth_session');
      }
    }
    setShowLoginModal(true);
  }, []);

  const setAuthSession = (userObj) => {
    setCurrentUser(userObj);
    const roleStr = (userObj.role || '').toLowerCase();
    const privStr = (userObj.privileges || '').toLowerCase();

    let role = 'STAFF';
    if (roleStr.includes('admin') || privStr.includes('admin')) {
      role = 'ADMIN';
    } else if (roleStr.includes('hod') || privStr.includes('hod') || privStr.includes('approval')) {
      role = 'HOD';
    }
    setCurrentRole(role);
    sessionStorage.setItem('biomed_auth_session', JSON.stringify(userObj));
    setShowLoginModal(false);
  };

  const loginWithCredentials = async (loginId, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthSession(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (e) {
      // Fallback local resolution if API is offline
      let fallbackUser = null;
      if (loginId.toLowerCase() === 'admin' && password === 'admin123') {
        fallbackUser = { id: 'STF-100', loginId: 'admin', name: 'System Admin (Superuser)', role: 'System Admin' };
      } else if (loginId.toLowerCase() === 'hod' && password === 'hod123') {
        fallbackUser = { id: 'STF-101', loginId: 'hod', name: 'Dr. Alok Verma', role: 'Biomedical HOD' };
      } else if (loginId.toLowerCase() === 'staff' && password === 'staff123') {
        fallbackUser = { id: 'STF-102', loginId: 'staff', name: 'Eng. Rajesh Sharma', role: 'Senior BioMed Engineer' };
      }

      if (fallbackUser) {
        setAuthSession(fallbackUser);
        return { success: true };
      }
      return { success: false, error: 'Connection error or invalid credentials' };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('biomed_auth_session');
    setCurrentUser(null);
    setCurrentRole('STAFF');
    setShowLoginModal(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        showLoginModal,
        setShowLoginModal,
        loginWithCredentials,
        logout,
        setAuthSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
