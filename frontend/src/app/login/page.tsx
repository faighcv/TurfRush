'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setAuth(token, user);
      router.replace('/map');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('faig@demo.com');
    setPassword('demo1234');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-turf-bg px-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-turf-accent/15 border border-turf-accent/30 mb-4">
          <Zap size={32} className="text-turf-accent" fill="currentColor" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white">TurfRush</h1>
        <p className="text-slate-400 mt-1 text-sm">Own your city, block by block</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full bg-turf-card border border-turf-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-turf-accent/70 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full bg-turf-card border border-turf-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-turf-accent/70 transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-turf-accent text-turf-bg font-bold text-base shadow-[0_0_24px_rgba(0,212,255,0.35)] hover:shadow-[0_0_32px_rgba(0,212,255,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {/* Demo button */}
        <button
          type="button"
          onClick={fillDemo}
          className="w-full py-3 rounded-xl border border-turf-border text-slate-400 text-sm hover:text-white hover:border-slate-500 transition-colors"
        >
          Use Demo Account
        </button>

        <p className="text-center text-sm text-slate-500">
          No account?{' '}
          <Link href="/signup" className="text-turf-accent hover:text-white transition-colors font-medium">
            Sign up free
          </Link>
        </p>
      </form>
    </div>
  );
}
