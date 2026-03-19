'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Zap } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.register(form.username, form.email, form.password);
      setAuth(token, user);
      router.replace('/map');
    } catch (err: any) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs.map((e: any) => e.msg).join(', ') : (err.response?.data?.error || 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-turf-bg px-6">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-turf-accent/15 border border-turf-accent/30 mb-4">
          <Zap size={32} className="text-turf-accent" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-black text-white">Join TurfRush</h1>
        <p className="text-slate-400 mt-1 text-sm">Stake your claim on the city</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {(['username', 'email', 'password'] as const).map(field => (
          <div key={field}>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">
              {field === 'username' ? 'Username' : field === 'email' ? 'Email' : 'Password'}
            </label>
            <input
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              value={form[field]}
              onChange={set(field)}
              required
              minLength={field === 'username' ? 3 : field === 'password' ? 6 : 0}
              placeholder={field === 'username' ? 'coolrunner' : field === 'email' ? 'you@example.com' : '••••••••'}
              className="w-full bg-turf-card border border-turf-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-turf-accent/70 transition-colors"
            />
          </div>
        ))}

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-turf-accent text-turf-bg font-bold text-base shadow-[0_0_24px_rgba(0,212,255,0.35)] hover:shadow-[0_0_32px_rgba(0,212,255,0.5)] transition-all disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already playing?{' '}
          <Link href="/login" className="text-turf-accent hover:text-white transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
