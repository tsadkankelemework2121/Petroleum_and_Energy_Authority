import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import truckImage from '../assets/truck.png';
import logo from '../assets/logo.png';

const DemoPage = () => {
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (credentials: {email: string, password: string}) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      
      queryClient.clear();
      
      login(data.user, data.token);
      navigate('/', { replace: true });
    },
    onError: (err: any) => {
      if (err.response && err.response.data && err.response.data.message) {
         setErrorMsg(err.response.data.message);
      } else {
         setErrorMsg('Invalid credentials or server error.');
      }
    }
  });

  const handleDemoLogin = (email: string) => {
    setErrorMsg('');
    // Clear any previous session data BEFORE logging in
    localStorage.clear();
    queryClient.clear();
    // Use the correct password for each demo account
    let password = 'admin123';
    mutation.mutate({ email, password });
  };

  return (
    <div className="relative h-screen overflow-hidden flex items-center justify-center bg-gray-900">
      <div className="absolute inset-0 z-0">
        <img 
          className="absolute inset-0 h-full w-full object-cover blur-[6px] scale-105" 
          src={truckImage} 
          alt="Blue Truck Background" 
        />
        <div className="absolute inset-0 bg-primary/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gray-900/40" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4 lg:max-w-md scale-90 sm:scale-95 lg:scale-100">
        <div className="flex flex-col items-center text-center">
          <div className="bg-white/90 p-3 rounded-2xl shadow-lg mb-5 inline-block">
            <img src={logo} alt="Company Logo" className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">
            Interactive Demo
          </h1>
          <h2 className="mt-3 text-xl font-medium text-gray-200 drop-shadow-sm">
            Select a role to explore the platform
          </h2>
        </div>

        <div className="mt-6 bg-white/95 backdrop-blur-md py-6 px-4 shadow-2xl sm:rounded-2xl sm:px-8 border border-white/20">
          <div className="space-y-4">
            
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => handleDemoLogin('admin@epa.com')}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 transition-all"
            >
              Log in as EPA Admin
            </button>

            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => handleDemoLogin('admin@ola.com')}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f59e0b] transition-all"
            >
              Log in as OLA Admin
            </button>

            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => navigate('/admin-login')}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-[#1c8547] hover:bg-[#15803d] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1c8547] transition-all"
            >
              Log in as Depot Admin
            </button>

            {errorMsg && (
              <div className="text-red-600 text-sm bg-red-50/90 p-3 rounded-lg border border-red-100 mt-4 text-center font-medium">
                {errorMsg}
              </div>
            )}
            
            {mutation.isPending && (
              <div className="text-center text-sm font-medium text-slate-600 mt-4">
                Authenticating...
              </div>
            )}

            <div className="pt-4 text-center">
              <Link to="/admin-login" className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 font-medium">
                System Administrator Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;
