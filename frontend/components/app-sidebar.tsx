'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Calendar,
  Target,
  BarChart3,
  Users,
  MessageSquare,
  User,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { User as UserType } from '@/lib/types';

interface SidebarProps {
  user: UserType;
}

export function AppSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const userRole = user.role;

  const athleteItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/sessions', label: 'Sessions', icon: Activity },
    { href: '/training-plan', label: 'Training Plan', icon: Calendar },
    { href: '/goals', label: 'Goals', icon: Target },
    { href: '/coaches', label: 'Find Coach', icon: Users },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const coachItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/sessions', label: 'Sessions', icon: Activity },
    { href: '/training-plan', label: 'Training Plan', icon: Calendar },
    { href: '/goals', label: 'Goals', icon: Target },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/athletes', label: 'Athletes', icon: Users },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const items = userRole === 'coach' ? coachItems : athleteItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">
            TalentTrack
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info at bottom */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground font-semibold">
              {(user.name || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.name || user.username || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {userRole}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
