'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, LayoutDashboard, Trophy, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import clsx from 'clsx';

const NAV = [
  { href: '/map',         icon: Map,             label: 'Map' },
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Stats' },
  { href: '/leaderboard', icon: Trophy,           label: 'Ranks' },
  { href: '/profile',     icon: User,             label: 'Profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-turf-card border-t border-turf-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all',
                active
                  ? 'text-turf-accent'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={clsx(active && 'drop-shadow-[0_0_6px_rgba(0,212,255,0.8)]')}
              />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
