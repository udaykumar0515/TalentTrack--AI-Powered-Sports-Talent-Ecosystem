'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Athlete, Session, InjuryAlert } from '@/lib/types';
import { Users, TrendingUp, AlertTriangle, Award, Loader2, Search, RefreshCw, Trophy } from 'lucide-react';

interface AthleteWithStats extends Athlete {
  sessionCount: number;
  avgFormScore: number;
  status: 'excellent' | 'good' | 'needs-attention';
}

export default function AthletesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [athletes, setAthletes] = useState<AthleteWithStats[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [injuryAlerts, setInjuryAlerts] = useState<InjuryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user?.role !== 'coach') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch athletes and sessions from API
  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'coach') return;

      setIsLoading(true);
      setError(null);

      try {
        const [athletesData, sessionsData, alertsData] = await Promise.all([
          api.getAthletes(),
          api.getSessions({ coachId: user.id }),
          api.getCoachInjuryAlerts(user.id).catch(() => []),
        ]);

        const sessionsList = Array.isArray(sessionsData) ? sessionsData : [];
        setAllSessions(sessionsList);
        setInjuryAlerts(Array.isArray(alertsData) ? alertsData : []);

        // Calculate stats for each athlete
        const athletesList = Array.isArray(athletesData) ? athletesData : [];
        // Filter to show ONLY athletes assigned to this coach
        const myAthletes = athletesList.filter(athlete => athlete.coachId === user.id);
        
        const athletesWithStats: AthleteWithStats[] = myAthletes.map(athlete => {
          const athleteSessions = sessionsList.filter(s => s.athleteId === athlete.id);
          const avgScore = athleteSessions.length > 0
            ? Math.round(athleteSessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / athleteSessions.length)
            : 0;

          let status: 'excellent' | 'good' | 'needs-attention' = 'good';
          if (avgScore >= 85) status = 'excellent';
          else if (avgScore < 70 || athleteSessions.length < 5) status = 'needs-attention';

          return {
            ...athlete,
            sessionCount: athleteSessions.length,
            avgFormScore: avgScore,
            status,
          };
        });

        setAthletes(athletesWithStats);
      } catch (err) {
        console.error('Error fetching athletes:', err);
        setError('Failed to load athletes. Please check if the backend is running.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.role === 'coach') {
      fetchData();
    }
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [athletesData, sessionsData, alertsData] = await Promise.all([
        api.getAthletes(),
        api.getSessions({ coachId: user.id }),
        api.getCoachInjuryAlerts(user.id).catch(() => []),
      ]);

      const sessionsList = Array.isArray(sessionsData) ? sessionsData : [];
      setAllSessions(sessionsList);
      setInjuryAlerts(Array.isArray(alertsData) ? alertsData : []);

      const athletesList = Array.isArray(athletesData) ? athletesData : [];
      const athletesWithStats: AthleteWithStats[] = athletesList.map(athlete => {
        const athleteSessions = sessionsList.filter(s => s.athleteId === athlete.id);
        const avgScore = athleteSessions.length > 0
          ? Math.round(athleteSessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / athleteSessions.length)
          : 0;

        let status: 'excellent' | 'good' | 'needs-attention' = 'good';
        if (avgScore >= 85) status = 'excellent';
        else if (avgScore < 70 || athleteSessions.length < 5) status = 'needs-attention';

        return {
          ...athlete,
          sessionCount: athleteSessions.length,
          avgFormScore: avgScore,
          status,
        };
      });

      setAthletes(athletesWithStats);
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Badge className="bg-success text-success-foreground">Excellent</Badge>;
      case 'good':
        return <Badge variant="secondary">Good</Badge>;
      case 'needs-attention':
        return <Badge variant="destructive">Needs Attention</Badge>;
      default:
        return <Badge variant="secondary">Active</Badge>;
    }
  };

  const filteredAthletes = athletes.filter(athlete => {
    const name = athlete.name || athlete.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           athlete.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const avgTeamScore = athletes.length > 0
    ? Math.round(athletes.reduce((acc, a) => acc + a.avgFormScore, 0) / athletes.length)
    : 0;
  
  const activeAlerts = injuryAlerts.filter(a => a.status !== 'resolved');
  const needsAttentionCount = athletes.filter(a => a.status === 'needs-attention').length;
  
  // Top Performers Logic
  const topPerformers = [...athletes].sort((a, b) => b.avgFormScore - a.avgFormScore).slice(0, 5);

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Overview</h1>
            <p className="text-muted-foreground mt-1">
              Manage performance, track risks, and guide your athletes
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Athletes"
            value={athletes.length}
            icon={Users}
          />
          <StatCard
            title="Team Avg Score"
            value={`${avgTeamScore}%`}
            icon={TrendingUp}
          />
          <StatCard
            title="Total Sessions"
            value={allSessions.length}
            subtitle="All time"
            icon={Award}
          />
          <StatCard
            title="Active Alerts"
            value={activeAlerts.length}
            subtitle={`${needsAttentionCount} need attention`}
            icon={AlertTriangle}
          />
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
          </div>
        ) : (
          <>
            {/* Insights Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Risk & Alerts */}
              <Card className="p-6 border-warning/20">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Risk & Alerts
                </h2>
                <div className="space-y-4">
                   {/* Injury Alerts */}
                   {activeAlerts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Injury Alerts</p>
                        {activeAlerts.slice(0, 3).map((alert) => (
                          <div key={alert.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-destructive">{alert.athleteName}</p>
                                <p className="text-xs text-muted-foreground">{alert.bodyPart}: {alert.description}</p>
                            </div>
                            <Badge variant="destructive">{alert.severity}</Badge>
                          </div>
                        ))}
                      </div>
                   )}

                   {/* Needs Attention Athletes */}
                   {athletes.filter(a => a.status === 'needs-attention').length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Needs Attention</p>
                         {athletes.filter(a => a.status === 'needs-attention').slice(0, 3).map(athlete => (
                            <div key={athlete.id} className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-warning font-bold text-xs">
                                     {(athlete.name || 'A')[0]}
                                  </div>
                                  <div>
                                     <p className="font-medium text-foreground">{athlete.name || 'Athlete'}</p>
                                     <p className="text-xs text-muted-foreground">Avg: {athlete.avgFormScore}% ({athlete.sessionCount} sessions)</p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => router.push(`/athletes/${athlete.id}`)}>View</Button>
                            </div>
                         ))}
                      </div>
                   )}

                   {activeAlerts.length === 0 && athletes.filter(a => a.status === 'needs-attention').length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No critical issues detected. Good job!</p>
                   )}
                </div>
              </Card>

              {/* Top Performers */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top Performers
                </h2>
                <div className="space-y-4">
                  {topPerformers.length > 0 ? topPerformers.map((athlete, index) => (
                    <div key={athlete.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer" onClick={() => router.push(`/athletes/${athlete.id}`)}>
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' : index === 1 ? 'bg-gray-400/20 text-gray-600' : index === 2 ? 'bg-orange-500/20 text-orange-600' : 'bg-primary/10 text-primary'}`}>
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
                      <Badge variant={athlete.avgFormScore >= 90 ? 'default' : 'secondary'}>
                        {athlete.avgFormScore}%
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">No athlete data yet</p>
                  )}
                </div>
              </Card>
            </div>

            {/* All Athletes */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">My Team</h2>
                    {/* Search */}
                    <div className="relative max-w-sm w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search athletes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                </div>

                {filteredAthletes.length > 0 ? (
                  /* Athletes Grid */
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredAthletes.map((athlete) => {
                      const athleteName = athlete.name || athlete.username || 'Athlete';
                      const initials = athleteName.split(' ').map(n => n[0]).join('').toUpperCase() || 'A';

                      return (
                        <Link key={athlete.id} href={`/athletes/${athlete.id}`}>
                          <Card className="group p-6 border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                                  {initials}
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {athleteName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">{athlete.email}</p>
                                </div>
                              </div>
                              {getStatusBadge(athlete.status)}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Sessions</p>
                                <p className="text-xl font-bold text-foreground">{athlete.sessionCount}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Avg Form</p>
                                <p className="text-xl font-bold text-foreground">{athlete.avgFormScore}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Sport</p>
                                <p className="text-sm font-medium text-muted-foreground truncate">
                                  {athlete.sport || 'General'}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Athletes Found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery 
                        ? 'No athletes match your search criteria.'
                        : 'No athletes have been assigned to you yet.'}
                    </p>
                  </Card>
                )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
