import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Lock, Mail, ArrowRight, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';

export default function Login() {
  const [email, setEmail] = useState('engineer.waterworks@mcgm.gov.in');
  const [password, setPassword] = useState('Pipeline@2026');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = usePipelines();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide your municipal email address and credentials.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result && result.success) {
        navigate('/dashboard');
      } else {
        setError(result?.error || 'Authentication failed. Please verify your municipal credentials.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Banner / Municipal Header */}
      <div className="max-w-md w-full mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-teal-500 text-white shadow-lg mb-4">
          <Droplets className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          AI Pipeline Risk Assessment
        </h2>
        <p className="mt-1.5 text-sm sm:text-base text-slate-600 font-medium">
          Smart Monitoring of Ageing Water Pipelines
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>Urban Water Infrastructure Risk Assessment System</span>
        </div>
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full mx-auto mt-8 bg-white p-7 sm:p-8 rounded-2xl border border-slate-200 shadow-md">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">
            Municipal Engineer Portal
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Municipal Official Email
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
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Access Password
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
              <span>Remember me on this workstation</span>
            </label>
            <span className="text-slate-400 font-medium">Municipal Auth</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Supabase...</span>
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

      {/* Professional Municipal Footer */}
      <footer className="max-w-md w-full mx-auto text-center mt-8 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">
          AI-Powered Ageing Pipeline Risk Assessment System
        </p>
        <p className="text-[11px] text-slate-400">
          Municipal Water Infrastructure Surveillance Division • Supabase Auth Session
        </p>
      </footer>
    </div>
  );
}
