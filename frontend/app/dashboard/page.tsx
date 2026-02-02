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
import type { Session, Athlete } from '@/lib/types';
import { Play, TrendingUp, Target, Flame, Loader2, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { CoachRequestsList } from '@/components/coach-requests-list';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [coachStats, setCoachStats] = useState<any>(null);
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
          const [sessionsData, streakData] = await Promise.all([
            api.getSessions({ athleteId: user.id }),
            api.getStreak(user.id).catch(() => ({ streak: 0 })),
          ]);
          setSessions(Array.isArray(sessionsData) ? sessionsData : []);
          setStreak(streakData?.streak || 0);

          // If athlete has a coach, fetch coach stats
          const athlete = user as Athlete;
          if (athlete.coachId) {
            try {
              const stats = await api.getCoachStats(athlete.coachId);
              setCoachStats(stats);
            } catch (e) {
              console.error('Failed to load coach stats', e);
            }
          }
        } else {
          // Coach view
          const [sessionsData, athletesData] = await Promise.all([
            api.getSessions({ coachId: user.id }),
            api.getAthletes(),
          ]);

          const safeSessions = Array.isArray(sessionsData) ? sessionsData : [];
          // Filter athletes to show ONLY those assigned to this coach
          const allAthletes = Array.isArray(athletesData) ? athletesData : [];
          const myTeam = allAthletes.filter(athlete => athlete.coachId === user.id);
          
          setSessions(safeSessions);

          // Calculate stats for each athlete
          const enrichedAthletes = myTeam.map(athlete => {
            const athleteSessions = safeSessions.filter(s => s.athleteId === athlete.id);
            const totalSessions = athleteSessions.length;
            const avgScore = totalSessions > 0 
              ? Math.round(athleteSessions.reduce((sum, s) => sum + (s.formScore || 0), 0) / totalSessions)
              : 0;
            
            return {
              ...athlete,
              stats: {
                totalSessions,
                averageFormScore: avgScore,
                streak: 0,
                xp: 0,
                level: 1
              }
            };
          });

          setAthletes(enrichedAthletes);
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
            <div className={`grid gap-6 md:grid-cols-2 ${user.role === 'athlete' ? 'lg:grid-cols-3' : 'lg:grid-cols-3'}`}>
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
                    value={streak}
                    subtitle="days"
                    icon={Flame}
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
                </>
              )}
            </div>

            {/* Coach Stats for Athlete View */}
            {user.role === 'athlete' && coachStats && (
              <div className="mt-8 mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Your Coach's Team Stats</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Team Size"
                    value={coachStats.athleteCount || 0}
                    subtitle="Athletes"
                    icon={Users}
                  />
                  <StatCard
                    title="Sessions"
                    value={coachStats.totalSessionsSupervised || 0}
                    subtitle="Supervised"
                    icon={Target}
                  />
                  <StatCard
                    title="Avg Score"
                    value={coachStats.teamAvgPerformance || 0}
                    subtitle="Team Average"
                    icon={TrendingUp}
                  />
                  <StatCard
                    title="Goals"
                    value={coachStats.goalsAchieved || 0}
                    subtitle="Completed"
                    icon={CheckCircle}
                  />
                </div>
              </div>
            )}

            {/* Coach Requests */}
            {user.role === 'coach' && (
              <div className="mb-6">
                 <h2 className="text-xl font-semibold text-foreground mb-4">Pending Requests</h2>
                 <CoachRequestsList />
              </div>
            )}

            {/* Coach Detailed Stats */}
            {user.role === 'coach' && athletes.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                <StatCard
                  title="Top Performer"
                  value={(() => {
                    const top = athletes.reduce((prev, current) => (prev.stats?.averageFormScore || 0) > (current.stats?.averageFormScore || 0) ? prev : current);
                    if (!top.stats?.averageFormScore) return 'N/A';
                    return top.name || top.username || 'Unknown';
                  })()}
                  subtitle={`Avg Score: ${(() => {
                     const top = athletes.reduce((prev, current) => (prev.stats?.averageFormScore || 0) > (current.stats?.averageFormScore || 0) ? prev : current);
                     return top.stats?.averageFormScore || 0;
                  })()}%`}
                  icon={Flame}
                />
                <StatCard
                  title="Most Active"
                  value={(() => {
                    const active = athletes.reduce((prev, current) => (prev.stats?.totalSessions || 0) > (current.stats?.totalSessions || 0) ? prev : current);
                    if (!active.stats?.totalSessions) return 'N/A';
                    return active.name || active.username || 'Unknown';
                  })()}
                  subtitle={`${(() => {
                    const active = athletes.reduce((prev, current) => (prev.stats?.totalSessions || 0) > (current.stats?.totalSessions || 0) ? prev : current);
                    return active.stats?.totalSessions || 0;
                  })()} Sessions`}
                  icon={Target}
                />
              </div>
            )}

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
                      onDelete={user.role === 'athlete' ? handleDeleteSession : undefined}
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


          </>
        )}
      </div>
    </AppLayout>
  );
}
