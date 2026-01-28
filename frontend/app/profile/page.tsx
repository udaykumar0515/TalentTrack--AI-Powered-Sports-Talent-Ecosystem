'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';
import { 
  Mail, 
  Flame, 
  Target,
  Loader2,
  TrendingUp,
  LogOut
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const [sessionsData, activityData] = await Promise.all([
          api.getSessions({ athleteId: user.id }).catch(() => []),
          api.getActivity(user.id).catch(() => ({ activity: {}, totalSessions: 0, streak: 0 })),
        ]);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setActivity(activityData?.activity || {});
        setStreak(activityData?.streak || 0);
      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-lg text-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / sessions.length)
    : 0;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-1">
              View your profile and activity
            </p>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {(user.name || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {user.name || user.username || 'User'}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              <Badge className="mt-2 capitalize">{user.role}</Badge>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading stats...</span>
          </div>
        ) : (
          <>
            {/* Stats - Simplified (no Level/XP) */}
            {user.role === 'athlete' && (
              <div className="grid gap-6 md:grid-cols-3">
                <StatCard
                  title="Total Sessions"
                  value={sessions.length}
                  icon={Target}
                />
                <StatCard
                  title="Avg Form Score"
                  value={`${avgScore}%`}
                  icon={TrendingUp}
                />
                <StatCard
                  title="Current Streak"
                  value={streak}
                  subtitle="days"
                  icon={Flame}
                />
              </div>
            )}

            {/* Activity Heatmap - GitHub/LeetCode style */}
            {user.role === 'athlete' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Session Activity</h2>
                <ActivityHeatmap 
                  activity={activity}
                  totalSessions={sessions.length}
                  streak={streak}
                />
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
