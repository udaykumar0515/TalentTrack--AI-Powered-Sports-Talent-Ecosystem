import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { User, CoachMessage } from '@/lib/types';

interface AppTopBarProps {
  user: User;
}

export function AppTopBar({ user }: AppTopBarProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Poll for unread messages
    const fetchUnread = async () => {
      try {
        let messages: CoachMessage[] = [];
        if (user.role === 'athlete') {
            messages = await api.getAthleteMessages(user.id);
        } else {
            messages = await api.getCoachMessages(user.id);
        }
        
        // Count unread messages where the RECEIVER is the current user.
        // Since we don't have explicit receiverId, we infer:
        // If I am athlete, I count messages from coach (senderId != myId) that are !read
        // If I am coach, I count messages from athletes (senderId != myId) that are !read
        
        const unread = messages.filter(m => 
            !m.read && 
            (m.senderId ? m.senderId !== user.id : true) // Fallback: assume incoming if senderId missing
        ).length;
        
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          Welcome back, {user.name || user.username || 'User'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Messages with Badge */}
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/messages')}>
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
