'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Session, DetailedMetrics } from '@/lib/types';
import { 
  ArrowLeft, 
  Trash2, 
  Calendar, 
  Clock, 
  Target, 
  AlertTriangle,
  TrendingUp,
  Loader2,
  CheckCircle,
  Shield,
  Activity,
  Zap,
  Eye,
  Timer,
  MessageSquare
} from 'lucide-react';
import { Textarea } from "@/components/ui/textarea"

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const sessionId = params?.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (session?.coachFeedback) {
      setFeedbackText(session.coachFeedback);
    }
  }, [session]);

  const handleSaveFeedback = async () => {
    if (!sessionId) return;
    setSavingFeedback(true);
    try {
      await api.updateSessionFeedback(sessionId, feedbackText);
      alert('Feedback saved successfully!');
    } catch (err) {
      console.error('Error saving feedback:', err);
      alert('Failed to save feedback.');
    } finally {
      setSavingFeedback(false);
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getSession(sessionId);
        setSession(data);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load session details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handleDelete = async () => {
    if (!session || !confirm('Are you sure you want to delete this session?')) return;
    
    setDeleting(true);
    try {
      await api.deleteSession(session.id || session.sessionId || sessionId);
      router.push('/sessions');
    } catch (err) {
      console.error('Error deleting session:', err);
      setDeleting(false);
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
          <span className="ml-2 text-muted-foreground">Loading session...</span>
        </div>
      </AppLayout>
    );
  }

  if (error || !session) {
    return (
      <AppLayout user={user}>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'This session could not be found.'}</p>
          <Button onClick={() => router.push('/sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </Card>
      </AppLayout>
    );
  }

  const formScore = session.formScore || session.metrics?.formScore || 0;
  const reps = session.reps || session.metrics?.reps || 0;
  const duration = session.durationSec || session.duration || 0;
  const date = session.date || session.timestamp || session.createdAt;
  const riskLevel = session.cheatDetection?.riskLevel;
  const risk = session.risk || (riskLevel ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) : 'Low');
  const cheatDetection = session.cheatDetection;
  const detailedMetrics = session.detailedMetrics as DetailedMetrics | undefined;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      default: return 'text-success';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Back & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Session
          </Button>
        </div>

        {/* Session Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground capitalize">{session.exercise}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              {date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(date).toLocaleDateString()}
                </span>
              )}
              {duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {duration >= 60 ? `${Math.round(duration / 60)} min` : `${Math.round(duration)}s`}
                </span>
              )}
              {session.athleteName && (
                <span>Athlete: {session.athleteName}</span>
              )}
            </div>
          </div>
          <Badge 
            variant={risk === 'High' ? 'destructive' : risk === 'Medium' ? 'secondary' : 'outline'}
            className="text-sm"
          >
            {risk} Risk
          </Badge>
        </div>

        {/* Primary Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Form Score</p>
            <p className="text-4xl font-bold text-foreground">{formScore}%</p>
          </Card>
          <Card className="p-6 text-center">
            <Target className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Reps Completed</p>
            <p className="text-4xl font-bold text-foreground">{reps}</p>
          </Card>
          <Card className="p-6 text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Duration</p>
            <p className="text-4xl font-bold text-foreground">{Math.round(duration)}s</p>
          </Card>
        </div>

        {/* Risk Assessment Card */}
        {cheatDetection && (
          <Card className={`p-6 ${cheatDetection.riskLevel === 'high' ? 'border-destructive/30 bg-destructive/5' : cheatDetection.riskLevel === 'medium' ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5'}`}>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className={`h-5 w-5 ${getRiskColor(cheatDetection.riskLevel)}`} />
              Risk Assessment
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-2xl font-semibold mb-2">{cheatDetection.riskExplanation}</p>
                {cheatDetection.riskFactors && cheatDetection.riskFactors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {cheatDetection.riskFactors.map((factor, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-background rounded-lg border">
                  <Eye className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className={`text-2xl font-bold ${getConfidenceColor(cheatDetection.confidence)}`}>
                    {cheatDetection.confidence}%
                  </p>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
                <div className="p-3 bg-background rounded-lg border">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{cheatDetection.totalFlags}</p>
                  <p className="text-xs text-muted-foreground">Issues Found</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Form Analysis Flags */}
        {cheatDetection?.cheat_flags && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Form Analysis
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="inline-flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> Good</span>
              {" • "}
              <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-warning" /> Needs Attention</span>
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(cheatDetection.cheat_flags).map(([flag, detected]) => {
                // Map flag names to clear descriptions
                const flagDescriptions: Record<string, { good: string; bad: string }> = {
                  too_fast_reps: { good: "Pace is Good", bad: "Reps Too Fast" },
                  inconsistent_form: { good: "Form is Consistent", bad: "Inconsistent Form" },
                  minimal_movement: { good: "Good Range of Motion", bad: "Limited Movement" },
                  suspicious_timing: { good: "Natural Timing", bad: "Suspicious Timing" },
                  form_deterioration: { good: "Form Maintained", bad: "Form Declining" },
                  repetitive_pattern: { good: "Natural Movement", bad: "Repetitive Pattern" }
                };
                const desc = flagDescriptions[flag] || { good: flag.replace(/_/g, ' '), bad: flag.replace(/_/g, ' ') };
                const label = detected ? desc.bad : desc.good;
                
                return (
                  <div 
                    key={flag}
                    className={`p-3 rounded-lg border flex items-center gap-3 ${detected ? 'border-warning/50 bg-warning/10' : 'border-success/50 bg-success/10'}`}
                  >
                    {detected ? (
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    )}
                    <span className="text-sm">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Detailed Metrics */}
        {detailedMetrics && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Detailed Metrics
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              {detailedMetrics.avgAngle !== undefined && (
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-foreground">{detailedMetrics.avgAngle}°</p>
                  <p className="text-xs text-muted-foreground">Avg Angle</p>
                </div>
              )}
              {detailedMetrics.angleRange !== undefined && (
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-foreground">{detailedMetrics.angleRange}°</p>
                  <p className="text-xs text-muted-foreground">Range of Motion</p>
                </div>
              )}
              {detailedMetrics.formConsistency !== undefined && (
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-foreground">{Math.round(detailedMetrics.formConsistency * 100)}%</p>
                  <p className="text-xs text-muted-foreground">Form Consistency</p>
                </div>
              )}
              {detailedMetrics.totalFramesAnalyzed !== undefined && (
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-foreground">{detailedMetrics.totalFramesAnalyzed}</p>
                  <p className="text-xs text-muted-foreground">Frames Analyzed</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Suspicious Patterns */}
        {cheatDetection?.suspiciousPatterns && cheatDetection.suspiciousPatterns.length > 0 && (
          <Card className="p-6 border-warning/30 bg-warning/5">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Timer className="h-5 w-5 text-warning" />
              Detected Patterns
            </h2>
            <ul className="space-y-2">
              {cheatDetection.suspiciousPatterns.map((pattern, idx) => (
                <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-warning mt-0.5">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}



        {/* Coach Feedback Section */}
        {(user.role === 'coach' || session.coachFeedback) && (
          <Card className="p-6 border-primary/20 bg-primary/5">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Coach Feedback
            </h2>
            
            {user.role === 'coach' ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your feedback for this session..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button 
                  onClick={handleSaveFeedback} 
                  disabled={savingFeedback}
                >
                  {savingFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Feedback"
                  )}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-foreground whitespace-pre-wrap">{session.coachFeedback}</p>
                {session.feedbackDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Received on {new Date(session.feedbackDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Injury Flags */}
          {session.injuryFlags && session.injuryFlags.length > 0 && (
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Injury Flags
              </h2>
              <div className="space-y-3">
                {session.injuryFlags.map((flag, i) => (
                  <div key={i} className="p-3 rounded-lg bg-background border border-destructive/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium capitalize">{flag.type}</span>
                      <Badge variant="destructive">{flag.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{flag.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {session.recommendations && session.recommendations.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Recommendations
              </h2>
              <ul className="space-y-2">
                {session.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* AI Analysis */}
          {session.aiAnalysis && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">AI Analysis</h2>
              <p className="text-muted-foreground mb-4">{session.aiAnalysis.feedback}</p>
              {session.aiAnalysis.keyPoints && session.aiAnalysis.keyPoints.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Key Points:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {session.aiAnalysis.keyPoints.map((point, i) => (
                      <li key={i}>• {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Video Player */}
        {session.videoUrl && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Session Video</h2>
            <video 
              src={session.videoUrl} 
              controls 
              className="w-full rounded-lg max-h-[500px]"
            />
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

