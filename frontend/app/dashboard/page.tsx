'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { SessionCard } from '@/components/session-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Session, GamificationData, Athlete } from '@/lib/types';
import { Play, TrendingUp, Target, Flame, Loader2, Users, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, switchDemoRole } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        if (user.role === 'athlete') {
          const [sessionsData, gamificationData] = await Promise.all([
            api.getSessions({ athleteId: user.id }),
            api.getGamificationData(user.id).catch(() => null),
          ]);
          setSessions(Array.isArray(sessionsData) ? sessionsData : []);
          setGamification(gamificationData);
        } else {
          // Coach view
          const [sessionsData, athletesData] = await Promise.all([
            api.getSessions({ coachId: user.id }),
            api.getAthletes(),
          ]);
          setSessions(Array.isArray(sessionsData) ? sessionsData : []);
          setAthletes(Array.isArray(athletesData) ? athletesData : []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please check if the backend is running.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      setSessions(sessions.filter(s => (s.id || s.sessionId) !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

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

  const recentSessions = sessions.slice(0, 3);
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / sessions.length)
    : 0;

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user.name || user.username || 'User'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {user.role === 'athlete' 
                ? 'Track your progress and improve your form'
                : 'Monitor your athletes and provide guidance'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={switchDemoRole}>
              Switch to {user.role === 'athlete' ? 'Coach' : 'Athlete'} View
            </Button>
            {user.role === 'athlete' && (
              <Link href="/sessions/record">
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Record Session
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {user.role === 'athlete' ? (
                <>
                  <StatCard
                    title="Total Sessions"
                    value={sessions.length}
                    icon={Target}
                  />
                  <StatCard
                    title="Average Score"
                    value={`${avgScore}%`}
                    icon={TrendingUp}
                  />
                  <StatCard
                    title="Current Streak"
                    value={gamification?.streak || 0}
                    subtitle="days"
                    icon={Flame}
                  />
                  <StatCard
                    title="Level"
                    value={gamification?.level || 1}
                    subtitle={`${gamification?.xp || 0} XP`}
                    icon={Target}
                  />
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Athletes"
                    value={athletes.length}
                    icon={Users}
                  />
                  <StatCard
                    title="Total Sessions"
                    value={sessions.length}
                    icon={Target}
                  />
                  <StatCard
                    title="Team Avg Score"
                    value={`${avgScore}%`}
                    icon={TrendingUp}
                  />
                  <StatCard
                    title="Active Alerts"
                    value={0}
                    icon={AlertTriangle}
                  />
                </>
              )}
            </div>

            {/* Recent Sessions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Recent Sessions</h2>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              {recentSessions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recentSessions.map((session) => (
                    <SessionCard
                      key={session.id || session.sessionId}
                      session={session}
                      onDelete={handleDeleteSession}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start recording your training sessions to track your progress.
                  </p>
                  {user.role === 'athlete' && (
                    <Link href="/sessions/record">
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        Record Your First Session
                      </Button>
                    </Link>
                  )}
                </Card>
              )}
            </div>

            {/* Quick Actions for Athletes */}
            {user.role === 'athlete' && gamification && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Your Achievements</h2>
                <div className="flex flex-wrap gap-3">
                  {gamification.badges && gamification.badges.length > 0 ? (
                    gamification.badges.slice(0, 5).map((badge, i) => (
                      <Badge key={badge.id || i} variant="secondary" className="px-3 py-1">
                        {badge.icon || '🏆'} {badge.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Complete sessions to earn badges!</p>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
