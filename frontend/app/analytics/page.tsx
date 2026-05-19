'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Sparkles,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [injuryAlerts, setInjuryAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'athlete') return;
      setIsLoading(true);
      setError(null);
      try {
        const [analyticsData, alertsData] = await Promise.all([
          api.getPredictiveAnalytics(user.id).catch(() => null),
          api.getInjuryAlerts(user.id).catch(() => []),
        ]);
        setAnalytics(analyticsData);
        setInjuryAlerts(Array.isArray(alertsData) ? alertsData : []);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role === 'coach') {
    router.push('/dashboard');
    return null;
  }

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const trendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-500';
    if (trend === 'declining') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const riskBadge = (level: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-500/10 text-green-500 border-green-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      high: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
      <Badge variant="outline" className={`capitalize ${colors[level] || colors.low}`}>
        {level} risk
      </Badge>
    );
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights into your training performance and health
          </p>
        </div>

        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Analyzing your performance...</span>
          </div>
        ) : !analytics ? (
          <Card className="p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Analytics Available</h3>
            <p className="text-muted-foreground">
              Complete some training sessions to generate performance analytics.
            </p>
          </Card>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Performance Trend */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {trendIcon(analytics.performance_trends?.form?.trend || 'stable')}
                    <span className={`text-2xl font-bold capitalize ${trendColor(analytics.performance_trends?.form?.trend || 'stable')}`}>
                      {analytics.performance_trends?.form?.trend || 'Stable'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on {analytics.total_sessions || 0} sessions
                  </p>
                </CardContent>
              </Card>

              {/* Injury Risk */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Injury Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {riskBadge(analytics.injury_risk?.risk_level || 'low')}
                    <span className="text-2xl font-bold">
                      {analytics.injury_risk?.risk_score || 0}%
                    </span>
                  </div>
                  {analytics.injury_risk?.factors?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {analytics.injury_risk.factors.map((f: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" /> {f}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Improvement Potential */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Improvement Potential
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`capitalize ${
                      analytics.improvement_potential?.potential === 'high'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : analytics.improvement_potential?.potential === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {analytics.improvement_potential?.potential || 'unknown'}
                    </Badge>
                    <span className="text-2xl font-bold">
                      {analytics.improvement_potential?.score || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Future Predictions */}
            {analytics.future_performance?.predictions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" /> 30-Day Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    {analytics.future_performance.predictions.form_score && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Form Score</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">
                            {Math.round(analytics.future_performance.predictions.form_score.predicted)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (currently {analytics.future_performance.predictions.form_score.current})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {trendIcon(analytics.future_performance.predictions.form_score.trend)}
                          <span className={trendColor(analytics.future_performance.predictions.form_score.trend)}>
                            {analytics.future_performance.predictions.form_score.trend}
                          </span>
                        </div>
                      </div>
                    )}
                    {analytics.future_performance.predictions.reps && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Reps</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">
                            {Math.round(analytics.future_performance.predictions.reps.predicted)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (currently {analytics.future_performance.predictions.reps.current})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {trendIcon(analytics.future_performance.predictions.reps.trend)}
                          <span className={trendColor(analytics.future_performance.predictions.reps.trend)}>
                            {analytics.future_performance.predictions.reps.trend}
                          </span>
                        </div>
                      </div>
                    )}
                    {analytics.future_performance.predictions.duration && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Duration (sec)</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">
                            {Math.round(analytics.future_performance.predictions.duration.predicted)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (currently {analytics.future_performance.predictions.duration.current})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {trendIcon(analytics.future_performance.predictions.duration.trend)}
                          <span className={trendColor(analytics.future_performance.predictions.duration.trend)}>
                            {analytics.future_performance.predictions.duration.trend}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Confidence: {Math.round(analytics.future_performance.overall_confidence || 0)}%
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Improvement Suggestions */}
            {analytics.improvement_potential?.suggestions?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" /> AI Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {analytics.improvement_potential.suggestions.map((s: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <div className="h-6 w-0.5 bg-primary/50 shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Active Injury Alerts */}
            {injuryAlerts.length > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" /> Active Injury Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {injuryAlerts.map((alert: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          {riskBadge(alert.severity || 'medium')}
                          <span className="text-xs text-muted-foreground">
                            {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        {alert.risk_factors?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alert.risk_factors.map((f: string, j: number) => (
                              <Badge key={j} variant="secondary" className="text-xs">{f}</Badge>
                            ))}
                          </div>
                        )}
                        {alert.recommendations?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {alert.recommendations.slice(0, 2).map((r: string, j: number) => (
                              <li key={j} className="text-xs text-muted-foreground">• {r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
