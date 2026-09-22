import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import truckImage from '../assets/truck.png';
import logo from '../assets/logo.png';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async (credentials: {email: string, password: string}) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      // data contains { token, user: {id, name, email, role, company_id} }
      login(data.user, data.token);
      navigate('/', { replace: true });
    },
    onError: (err: any) => {
      if (err.response && err.response.data && err.response.data.message) {
         setErrorMsg(err.response.data.message);
      } else {
         setErrorMsg('Invalid email or password');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    mutation.mutate({ email, password });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      {/* Left side – hero image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={truckImage}
          alt="Fuel truck"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-primary/40 to-gray-900/80" />

        {/* Branding on the image side */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="bg-white/90 p-3 rounded-2xl shadow-lg mb-6 inline-block w-fit">
            <img src={logo} alt="Company Logo" className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight drop-shadow-lg">
            Petroleum &<br />Energy Authority
          </h1>
          <p className="mt-4 text-lg text-gray-200/90 max-w-md leading-relaxed drop-shadow-sm">
            Fuel dispatch management, monitoring, and reporting — all in one platform.
          </p>
        </div>
      </div>

      {/* Right side – login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 sm:px-12 lg:w-1/2 relative">
        {/* Mobile-only background image */}
        <div className="lg:hidden absolute inset-0 z-0">
          <img
            className="absolute inset-0 h-full w-full object-cover blur-[6px] scale-105"
            src={truckImage}
            alt="Background"
          />
          <div className="absolute inset-0 bg-primary/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gray-900/50" />
        </div>

        <div className="relative z-10 w-full max-w-sm lg:max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <div className="bg-white/90 p-3 rounded-2xl shadow-lg mb-4 inline-block">
              <img src={logo} alt="Company Logo" className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white drop-shadow-md">
              Petroleum & Energy Authority
            </h1>
          </div>

          {/* Form card */}
          <div className="bg-white/95 lg:bg-white backdrop-blur-md lg:backdrop-blur-none rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/20 lg:border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Sign in to your account to continue
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  disabled={mutation.isPending}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    disabled={mutation.isPending}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-strong disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-[0.98]"
                >
                  {mutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
