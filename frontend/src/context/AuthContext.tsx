import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import type { User, UserRole } from '../data/types';
import api from '../api/axios';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (backendUser: any, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get initial state from localStorage
const getInitialAuthState = () => {
  const token = localStorage.getItem('authToken');
  const storedAuth = localStorage.getItem('isAuthenticated');
  if (storedAuth === 'true' && token) {
    const email = localStorage.getItem('userEmail') || '';
    const role = (localStorage.getItem('userRole') as UserRole) || 'EPA_ADMIN';
    const companyId = localStorage.getItem('userCompanyId') || undefined;
    const depotId = localStorage.getItem('userDepotId') || undefined;
    const vehiclePlateNumber = localStorage.getItem('userVehiclePlateNumber') || undefined;
    const phoneNumber = localStorage.getItem('userPhoneNumber') || undefined;
    const transporterName = localStorage.getItem('userTransporterName') || undefined;
    const name = localStorage.getItem('userName') || undefined;
    return { isAuthenticated: true, user: { email, role, companyId, depotId, vehiclePlateNumber, phoneNumber, transporterName, name } as User };
  }
  return { isAuthenticated: false, user: null };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState(getInitialAuthState());

  useEffect(() => {
    // Verify token on mount if we think we're authenticated
    if (authState.isAuthenticated) {
      api.get('/auth/me')
        .then(response => {
          // Token is valid, update user info just in case
          const backendUser = response.data;
          const rawRole = (backendUser.role || '').toUpperCase();
          const role: UserRole = rawRole.includes('DRIVER') 
            ? 'DRIVER' 
            : rawRole.includes('DEPOT') 
            ? 'DEPOT_ADMIN' 
            : rawRole.includes('EPA') 
            ? 'EPA_ADMIN' 
            : 'OIL_COMPANY_ADMIN';
          const companyId = backendUser.company_id ? backendUser.company_id.toString() : undefined;
          const depotId = backendUser.depot_id ? backendUser.depot_id.toString() : undefined;
          const vehiclePlateNumber = backendUser.vehicle_plate_number || undefined;
          const phoneNumber = backendUser.phone_number || undefined;
          const transporterName = backendUser.transporter_name || undefined;
          const name = backendUser.name || undefined;
          setAuthState({
            isAuthenticated: true,
            user: { email: backendUser.email, role, companyId, depotId, vehiclePlateNumber, phoneNumber, transporterName, name }
          });
        })
        .catch(() => {
          // Token is invalid or expired
          logout();
        });
    }
  }, []);

  const login = (backendUser: any, token: string) => {
    // Map backend roles to frontend types
    const rawRole = (backendUser.role || '').toUpperCase();
    const role: UserRole = rawRole.includes('DRIVER')
      ? 'DRIVER'
      : rawRole.includes('DEPOT') 
      ? 'DEPOT_ADMIN' 
      : rawRole.includes('EPA') 
      ? 'EPA_ADMIN' 
      : 'OIL_COMPANY_ADMIN';
    const companyId = backendUser.company_id ? backendUser.company_id.toString() : undefined;
    const depotId = backendUser.depot_id ? backendUser.depot_id.toString() : undefined;
    const vehiclePlateNumber = backendUser.vehicle_plate_number || undefined;
    const phoneNumber = backendUser.phone_number || undefined;
    const transporterName = backendUser.transporter_name || undefined;
    const name = backendUser.name || undefined;
    const email = backendUser.email;

    const newUser: User = { email, role, companyId, depotId, vehiclePlateNumber, phoneNumber, transporterName, name };

    localStorage.setItem('authToken', token);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userRole', role);
    if (companyId) {
      localStorage.setItem('userCompanyId', companyId);
    } else {
      localStorage.removeItem('userCompanyId');
    }
    if (depotId) {
      localStorage.setItem('userDepotId', depotId);
    } else {
      localStorage.removeItem('userDepotId');
    }
    if (vehiclePlateNumber) {
      localStorage.setItem('userVehiclePlateNumber', vehiclePlateNumber);
    } else {
      localStorage.removeItem('userVehiclePlateNumber');
    }
    if (phoneNumber) {
      localStorage.setItem('userPhoneNumber', phoneNumber);
    } else {
      localStorage.removeItem('userPhoneNumber');
    }
    if (transporterName) {
      localStorage.setItem('userTransporterName', transporterName);
    } else {
      localStorage.removeItem('userTransporterName');
    }
    if (name) {
      localStorage.setItem('userName', name);
    } else {
      localStorage.removeItem('userName');
    }

    setAuthState({ isAuthenticated: true, user: newUser });
  };

  const logout = () => {
    // Fire-and-forget backend logout using fetch() to bypass the axios 401 interceptor
    const token = localStorage.getItem('authToken');
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const baseUrl = isLocal ? 'http://localhost:8000/api' : `http://${hostname}/pea/backend/public/api`;
    fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    }).catch(() => {});

    // Clear state and storage first, then redirect
    setAuthState({ isAuthenticated: false, user: null });
    localStorage.clear();
    window.location.href = isLocal ? '/pea/login' : '/pea/admin-login';
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: authState.isAuthenticated,
      user: authState.user,
      login: login as any,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
