'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Athlete, Session, InjuryAlert, PredictiveAnalytics } from '@/lib/types';
import { 
  ArrowLeft, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  Loader2,
  Target,
  Flame,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const athleteId = params?.id as string;

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [injuryAlerts, setInjuryAlerts] = useState<InjuryAlert[]>([]);
  const [analytics, setAnalytics] = useState<PredictiveAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // Assign Plan State
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assigningPlan, setAssigningPlan] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    // Fetch plans for coach
    if (user?.role === 'coach') {
        api.getCoachPlans(user.id).then(plans => setAvailablePlans(plans)).catch(console.error);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!athleteId || !user) return;

      setIsLoading(true);
      setError(null);

      try {
        const [athleteData, sessionsData, streakData, injuryData, analyticsData] = await Promise.all([
          api.getAthlete(athleteId),
          api.getSessions({ athleteId }),
          api.getStreak(athleteId).catch(() => ({ streak: 0 })),
          api.getInjuryAlerts(athleteId).catch(() => []),
          api.getPredictiveAnalytics(athleteId).catch(() => null),
        ]);

        setAthlete(athleteData);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setStreak(streakData?.streak || 0);
        setInjuryAlerts(Array.isArray(injuryData) ? injuryData : []);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error fetching athlete data:', err);
        setError('Failed to load athlete details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (athleteId && user) {
      fetchData();
    }
  }, [athleteId, user]);

  const handleGeneratePlan = async () => {
    if (!athleteId) return;

    setGeneratingPlan(true);
    try {
      await api.generateTrainingPlan(athleteId);
      alert('Training plan generated successfully!');
    } catch (err) {
      console.error('Error generating plan:', err);
      alert('Failed to generate training plan.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlanId || !athleteId) return;
    setAssigningPlan(true);
    try {
      await api.assignPlan(athleteId, selectedPlanId);
      setAssignDialogOpen(false);
      alert('Plan assigned successfully!');
    } catch (err) {
      console.error('Error assigning plan:', err);
      alert('Failed to assign plan.');
    } finally {
      setAssigningPlan(false);
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

  if (isLoading) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading athlete details...</span>
        </div>
      </AppLayout>
    );
  }

  if (error || !athlete) {
    return (
      <AppLayout user={user}>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Athlete Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'The requested athlete could not be found.'}</p>
          <Button onClick={() => router.push('/athletes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Athletes
          </Button>
        </Card>
      </AppLayout>
    );
  }

  const athleteName = athlete.name || athlete.username || 'Athlete';
  const avgFormScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / sessions.length)
    : 0;
  const activeAlerts = injuryAlerts.filter(a => a.status !== 'resolved');

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => router.push('/athletes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Athletes
        </Button>

        {/* Athlete Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
              {athleteName.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{athleteName}</h1>
              <p className="text-muted-foreground">{athlete.email}</p>
              {athlete.sport && (
                <Badge variant="secondary" className="mt-1">{athlete.sport}</Badge>
              )}
            </div>
          </div>
          {user.role === 'coach' && (
            <div className="flex gap-2">
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Assign Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Training Plan</DialogTitle>
                    <DialogDescription>
                      Select an existing plan to assign to this athlete. This will override their current active plan.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="plan" className="text-right">Plan</Label>
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlans.length > 0 ? availablePlans.map((plan: any) => (
                              <SelectItem key={plan.id} value={plan.id}>{plan.title}</SelectItem>
                          )) : (
                              <SelectItem value="none" disabled>No long-term plans found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAssignPlan} disabled={assigningPlan || !selectedPlanId}>
                      {assigningPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : "Assign Plan"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button 
                onClick={handleGeneratePlan} 
                disabled={generatingPlan}
              >
                {generatingPlan ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Generate Training Plan
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Sessions"
            value={sessions.length}
            icon={Activity}
          />
          <StatCard
            title="Avg Form Score"
            value={`${avgFormScore}%`}
            icon={TrendingUp}
          />
          <StatCard
            title="Current Streak"
            value={streak}
            subtitle="days"
            icon={Flame}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Active Injury Alerts
              </h2>
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 rounded-lg bg-background border border-destructive/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{alert.bodyPart || alert.area}</span>
                      <Badge variant="destructive">{alert.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Predictive Analytics */}
          {analytics && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Insights
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trend</span>
                  <Badge variant={analytics.performanceTrend === 'improving' ? 'default' : 'secondary'}>
                    {analytics.performanceTrend}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Predicted Score</span>
                  <span className="font-semibold">{analytics.predictedScore}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-semibold">{analytics.confidence}%</span>
                </div>
                {analytics.insights && analytics.insights.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Insights</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {analytics.insights.slice(0, 3).map((insight, i) => (
                        <li key={i}>• {insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Recent Sessions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Sessions
            </h2>
            <div className="space-y-3">
              {sessions.length > 0 ? sessions.slice(0, 5).map((session) => {
                const sessionId = session.id || session.sessionId;
                const score = session.formScore || session.metrics?.formScore || 0;
                const date = session.date || session.timestamp || session.createdAt;

                return (
                  <Link key={sessionId} href={`/sessions/${sessionId}`}>
                    <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{session.exercise}</span>
                        <Badge variant={score >= 85 ? 'default' : score >= 70 ? 'secondary' : 'outline'}>
                          {score}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {date ? new Date(date).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                  </Link>
                );
              }) : (
                <p className="text-muted-foreground text-center py-4">No sessions yet</p>
              )}
            </div>
          </Card>


        </div>
      </div>
    </AppLayout>
  );
}
