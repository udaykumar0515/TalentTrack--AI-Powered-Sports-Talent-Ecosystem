'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Session, Athlete, InjuryAlert } from '@/lib/types';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Activity,
  Loader2,
  Trophy
} from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [injuryAlerts, setInjuryAlerts] = useState<InjuryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user?.role !== 'coach') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'coach') return;

      setIsLoading(true);
      setError(null);

      try {
        const [sessionsData, athletesData, alertsData] = await Promise.all([
          api.getSessions({ coachId: user.id }),
          api.getAthletes(),
          api.getCoachInjuryAlerts(user.id).catch(() => []),
        ]);

        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setAthletes(Array.isArray(athletesData) ? athletesData : []);
        setInjuryAlerts(Array.isArray(alertsData) ? alertsData : []);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.role === 'coach') {
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

  // Calculate team analytics
  const avgTeamScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / sessions.length)
    : 0;

  const activeAlerts = injuryAlerts.filter(a => a.status !== 'resolved');

  // Calculate top performers by average form score
  const athleteScores = athletes.map(athlete => {
    const athleteSessions = sessions.filter(s => s.athleteId === athlete.id);
    const avgScore = athleteSessions.length > 0
      ? Math.round(athleteSessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / athleteSessions.length)
      : 0;
    return {
      ...athlete,
      avgScore,
      sessionCount: athleteSessions.length,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  const topPerformers = athleteScores.slice(0, 5);

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your team&apos;s performance and insights
          </p>
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
            <span className="ml-2 text-muted-foreground">Loading analytics...</span>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Team Avg Score"
                value={`${avgTeamScore}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Total Sessions"
                value={sessions.length}
                icon={Activity}
              />
              <StatCard
                title="Active Athletes"
                value={athletes.length}
                icon={Users}
              />
              <StatCard
                title="Active Alerts"
                value={activeAlerts.length}
                icon={AlertTriangle}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Performers */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top Performers
                </h2>
                <div className="space-y-4">
                  {topPerformers.length > 0 ? topPerformers.map((athlete, index) => (
                    <div key={athlete.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {athlete.name || athlete.username || 'Athlete'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {athlete.sessionCount} sessions
                          </p>
                        </div>
                      </div>
                      <Badge variant={athlete.avgScore >= 85 ? 'default' : 'secondary'}>
                        {athlete.avgScore}%
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">No athlete data yet</p>
                  )}
                </div>
              </Card>

              {/* Recent Injury Alerts */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Recent Injury Alerts
                </h2>
                <div className="space-y-4">
                  {activeAlerts.length > 0 ? activeAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{alert.athleteName || 'Athlete'}</span>
                        <Badge 
                          variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'secondary' : 'outline'}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.bodyPart || alert.area}: {alert.description}</p>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">No active injury alerts</p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
