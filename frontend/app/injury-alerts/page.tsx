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
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Activity,
  RefreshCw,
  Filter,
} from 'lucide-react';

export default function InjuryAlertsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user || user.role !== 'coach') return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getCoachInjuryAlerts(user.id);
        setAlerts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching injury alerts:', err);
        setError('Failed to load injury alerts.');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchAlerts();
  }, [user]);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter((alert) => alert.status === filter));
    }
  }, [alerts, filter]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role === 'athlete') {
    router.push('/analytics');
    return null;
  }

  const severityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      high: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
      <Badge variant="outline" className={`capitalize ${colors[severity] || colors.low}`}>
        {severity}
      </Badge>
    );
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-red-500/10 text-red-500 border-red-500/20',
      acknowledged: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
    };
    const icons: Record<string, any> = {
      active: <AlertTriangle className="h-3 w-3" />,
      acknowledged: <Clock className="h-3 w-3" />,
      resolved: <CheckCircle className="h-3 w-3" />,
    };
    return (
      <Badge variant="outline" className={`capitalize flex items-center gap-1 ${colors[status] || colors.active}`}>
        {icons[status] || icons.active}
        {status}
      </Badge>
    );
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeInjuryAlert(alertId, user.id);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged', acknowledgedBy: user.id, acknowledgedAt: new Date().toISOString() } : a)));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await api.resolveInjuryAlert(alertId, user.id);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'resolved', resolvedBy: user.id, resolvedAt: new Date().toISOString() } : a)));
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const stats = {
    total: alerts.length,
    active: alerts.filter((a) => a.status === 'active').length,
    acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            Injury Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor injury risks across your team
          </p>
        </div>

        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Acknowledged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.acknowledged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-2">
            {(['all', 'active', 'acknowledged', 'resolved'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading alerts...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card className="p-12 text-center">
            <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold mb-2">No Alerts Found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' ? 'No injury alerts for your team yet.' : `No ${filter} alerts found.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${
                alert.severity === 'high' ? 'border-l-red-500' :
                alert.severity === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {severityBadge(alert.severity)}
                        {statusBadge(alert.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(alert.detectedAt || alert.createdAt || '').toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{alert.athleteName || 'Unknown Athlete'}</span>
                        {alert.bodyPart && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{alert.bodyPart}</span>
                          </>
                        )}
                      </div>

                      <p className="text-sm">{alert.description}</p>

                      {alert.recommendations && alert.recommendations.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Recommendations:</p>
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {alert.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {alert.contributing_factors && alert.contributing_factors.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Contributing Factors:</p>
                          <div className="flex flex-wrap gap-2">
                            {alert.contributing_factors.map((factor: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {alert.status === 'active' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                          >
                            Resolve
                          </Button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
