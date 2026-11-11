import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = usePipelines();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result && result.success) {
        navigate('/dashboard');
      } else {
        setError(result?.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-md w-full text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-teal-500 text-white shadow-lg mb-4">
          <Droplets className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          AI Pipeline Risk Assessment
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Municipal Water Infrastructure Management System
        </p>
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-md p-8">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Municipal Engineer Portal</h2>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@waterworks.gov.in"
                autoComplete="email"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Remember me</span>
            </label>
            <span className="text-slate-400 font-medium">Municipal Auth</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>AI-Powered Ageing Pipeline Risk Assessment System</p>
        <p className="text-[11px] mt-0.5">Municipal Water Infrastructure Surveillance Division</p>
      </footer>
    </div>
  );
}
