'use client';
import { useRouter } from 'next/navigation';
import { Bell, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

interface AppTopBarProps {
  user: User;
}

export function AppTopBar({ user }: AppTopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          Welcome back, {user.name || user.username || 'User'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Messages */}
        <Button variant="ghost" size="icon" onClick={() => router.push('/messages')}>
          <MessageSquare className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            3
          </span>
        </Button>


      </div>
    </header>
  );
}
