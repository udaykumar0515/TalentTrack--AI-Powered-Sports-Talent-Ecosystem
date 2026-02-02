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
import type { Athlete, Session, InjuryAlert, PredictiveAnalytics, Goal } from '@/lib/types';
import { 
  ArrowLeft, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  Loader2,
  Target,
  Flame,
  Calendar,
  Ruler,
  Scale,
  Trophy,
  User,
  Zap,
  Award,
  ChevronRight,
  Dumbbell,
  Bot,
  Send,
  Save,
  Edit,
  Plus,
  MessageSquare,
  Trash2,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"

// --- SHARED COMPONENTS ---

function GoalCard({ 
    goal, 
    readOnly = false, 
    onUpdate, 
    onDelete,
    onFeedback
}: { 
    goal: Goal; 
    readOnly?: boolean; 
    onUpdate?: (g: Goal, val: number) => void; 
    onDelete?: (id: string) => void;
    onFeedback?: () => void;
}) {
    const progress = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
    const isCompleted = goal.status === 'completed';
    
    // Priority Colors for dark theme
    const priorityColor = {
        low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        urgent: 'bg-red-500/10 text-red-500 border-red-500/20'
    }[goal.priority || 'medium'];

    return (
        <Card className={`p-5 flex flex-col transition-all duration-300 group ${isCompleted 
            ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_15px_-3px_rgba(34,197,94,0.1)]' 
            : 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                       <Badge variant="outline" className={`capitalize border ${priorityColor}`}>
                           {goal.priority || 'Medium'}
                       </Badge>
                       {isCompleted && (
                           <Badge variant="default" className="bg-green-500 hover:bg-green-600 border-green-600 text-white shadow-sm">
                               <CheckCircle className="h-3 w-3 mr-1" /> Completed
                           </Badge>
                       )}
                   </div>
                   <h3 className={`font-bold text-lg leading-tight ${isCompleted ? 'text-foreground' : ''}`}>{goal.title}</h3>
                </div>
                {!readOnly && onDelete && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(goal.id || goal.goalId || '')}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {goal.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{goal.description}</p>}

            <div className="mt-auto space-y-3">
                <div className="flex justify-between text-sm font-medium">
                    <span className={isCompleted ? "text-green-500" : ""}>{goal.current} / {goal.target} <span className="text-muted-foreground font-normal">{goal.unit}</span></span>
                    <span className={isCompleted ? "text-green-500" : ""}>{progress}%</span>
                </div>
                <Progress 
                    value={progress} 
                    className={`h-2`} 
                    indicatorClassName={isCompleted ? 'bg-green-500' : ''} 
                />
                
                <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground border-t border-border/50">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> due {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                    
                    {!readOnly && onUpdate && !isCompleted && (
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onUpdate(goal, goal.current + 1)}>
                            +1 Log
                        </Button>
                    )}

                    {readOnly && onFeedback && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-primary/5 text-primary" onClick={onFeedback}>
                            <MessageSquare className="h-3 w-3 mr-1" /> Note
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const athleteId = params?.id as string;

  const { toast } = useToast();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [injuryAlerts, setInjuryAlerts] = useState<InjuryAlert[]>([]);
  const [analytics, setAnalytics] = useState<PredictiveAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- PLAN MANAGEMENT STATE ---
  const [activePlanTab, setActivePlanTab] = useState('ai_plan');
  const [planTitle, setPlanTitle] = useState('New Training Block');
  const [planDescription, setPlanDescription] = useState('');
  const [weeks, setWeeks] = useState<any[]>([
    { weekNumber: 1, focus: 'Introduction', days: [
      { dayName: 'Monday', focus: 'Upper Body', exercises: [] }
    ]}
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [assignedPlan, setAssignedPlan] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'read_only'>('read_only');

  // --- GOAL MANAGEMENT STATE ---
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: 100,
    unit: 'sessions',
    deadline: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [feedbackGoal, setFeedbackGoal] = useState<Goal | null>(null);
  const [goalFeedbackText, setGoalFeedbackText] = useState('');
  const [isSendingGoalFeedback, setIsSendingGoalFeedback] = useState(false);

  // --- QUICK MESSAGE STATE ---
  const [quickMsgDialogOpen, setQuickMsgDialogOpen] = useState(false);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [isSendingQuickMsg, setIsSendingQuickMsg] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!athleteId || !user) return;

      setIsLoading(true);
      setError(null);

      try {
        const [athleteData, sessionsData, streakData, injuryData, analyticsData, aiPlanData, plansData, goalsData] = await Promise.all([
          api.getAthlete(athleteId),
          api.getSessions({ athleteId }),
          api.getStreak(athleteId).catch(() => ({ streak: 0 })),
          api.getInjuryAlerts(athleteId).catch(() => []),
          api.getPredictiveAnalytics(athleteId).catch(() => null),
          api.getTrainingPlan(athleteId, 'ai').catch(() => null),
          api.getAthletePlans(athleteId).catch(() => []),
          api.getGoals(athleteId).catch(() => []),
        ]);

        setAthlete(athleteData);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setStreak(streakData?.streak || 0);
        setInjuryAlerts(Array.isArray(injuryData) ? injuryData : []);
        setAnalytics(analyticsData);
        setAiPlan(aiPlanData);
        if (plansData && plansData.length > 0) {
            setAssignedPlan(plansData[0]);
            setViewMode('read_only');
        } else {
            setViewMode('edit');
        }
        setGoals(Array.isArray(goalsData) ? goalsData : []);
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

  // --- GOAL HANDLERS ---
  const handleCreateGoal = async () => {
    if (!newGoal.title || !athleteId || !user) return;
    setIsCreatingGoal(true);
    try {
      const created = await api.createGoal({
        userId: athleteId,
        title: newGoal.title,
        description: newGoal.description,
        target: newGoal.target,
        current: 0,
        unit: newGoal.unit,
        deadline: newGoal.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
        priority: newGoal.priority
      });
      setGoals([...goals, created]);
      setNewGoal({ title: '', description: '', target: 100, unit: 'sessions', deadline: '', priority: 'medium' });
      toast({ title: "Goal Created", description: "The athlete has been assigned a new goal." });
    } catch (err) {
      console.error('Error creating goal:', err);
      toast({ title: "Error", description: "Failed to create goal", variant: "destructive" });
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const handleSendGoalFeedback = async () => {
    if (!feedbackGoal || !goalFeedbackText.trim() || !athleteId || !user) return;
    setIsSendingGoalFeedback(true);
    try {
        await api.sendCoachMessage({
            coachId: user.id,
            athleteId: athleteId,
            message: `Feedback on Goal "${feedbackGoal.title}": ${goalFeedbackText}`,
            coachName: user.name || user.username || 'Coach', 
            athleteName: athlete?.name || athlete?.username || 'Athlete', 
            sessionId: 'goal-feedback', 
            type: 'feedback',
            read: false,
            senderId: user.id,
            timestamp: new Date().toISOString(),
            id: crypto.randomUUID()
        });
        toast({ title: "Feedback Sent", description: "Your feedback has been delivered to the athlete's inbox." });
        setFeedbackGoal(null);
        setGoalFeedbackText("");
    } catch (err) {
        console.error("Failed to send goal feedback", err);
        toast({ title: "Error", description: "Failed to send feedback", variant: "destructive" });
    } finally {
        setIsSendingGoalFeedback(false);
    }
  };

  const handleSendQuickMsg = async () => {
    if (!quickMsgText.trim() || !athleteId || !user) return;
    setIsSendingQuickMsg(true);
    try {
        await api.sendCoachMessage({
            coachId: user.id,
            athleteId: athleteId,
            message: quickMsgText,
            coachName: user.name || user.username || 'Coach', 
            athleteName: athlete?.name || athlete?.username || 'Athlete', 
            sessionId: 'quick-msg', 
            type: 'note',
            read: false,
            senderId: user.id,
            timestamp: new Date().toISOString(),
            id: crypto.randomUUID()
        });
        toast({ title: "Message Sent", description: "Your message has been delivered." });
        setQuickMsgDialogOpen(false);
        setQuickMsgText("");
    } catch (err) {
        console.error("Failed to send quick message", err);
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
        setIsSendingQuickMsg(false);
    }
  };

  // --- PLAN BUILDER HANDLERS ---
  const handleAddWeek = () => {
    const newWeekNum = weeks.length + 1;
    setWeeks([...weeks, { weekNumber: newWeekNum, focus: 'General Conditioning', days: [] }]);
  };

  const handleAddDay = (weekIndex: number) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex].days.push({ dayName: 'New Day', focus: 'General', exercises: [] });
    setWeeks(newWeeks);
  };

  const handleAddExercise = (weekIndex: number, dayIndex: number) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex].days[dayIndex].exercises.push({ name: 'New Exercise', sets: 3, reps: '10', notes: '' });
    setWeeks(newWeeks);
  };

  const updateWeek = (index: number, field: string, value: any) => {
    const newWeeks = [...weeks];
    newWeeks[index][field] = value;
    setWeeks(newWeeks);
  };

  const updateDay = (weekIndex: number, dayIndex: number, field: string, value: any) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex].days[dayIndex][field] = value;
    setWeeks(newWeeks);
  };

  const updateExercise = (wIdx: number, dIdx: number, eIdx: number, field: string, value: any) => {
    const newWeeks = [...weeks];
    newWeeks[wIdx].days[dIdx].exercises[eIdx][field] = value;
    setWeeks(newWeeks);
  };

  const handleSaveAndAssign = async () => {
    if (!athleteId || !user) return;
    setIsSaving(true);
    try {
        const planData = {
            coach_id: user.id,
            athlete_id: athleteId,
            athlete_name: athlete?.name || athlete?.username || 'Athlete',
            title: planTitle,
            description: planDescription,
            duration_weeks: weeks.length,
            training_schedule: { weeks },
            status: 'active' as 'active',
            startDate: assignedPlan ? assignedPlan.startDate : new Date().toISOString()
        };

        if (viewMode === 'edit' && assignedPlan?.id) {
            await api.updateLongTermPlan(user.id, assignedPlan.id, planData);
            toast({ title: "Plan Updated", description: `${planTitle} has been updated.` });
            setAssignedPlan({ ...assignedPlan, ...planData });
        } else {
            const createdPlan = await api.createLongTermPlan(planData);
            if (createdPlan && createdPlan.id) {
                await api.assignPlan(athleteId, createdPlan.id);
                toast({ title: "Plan Assigned!", description: `${planTitle} has been assigned.` });
                setAssignedPlan(createdPlan);
            }
        }
        setViewMode('read_only');
    } catch (error) {
        console.error("Failed to save plan", error);
        toast({ title: "Error", description: "Failed to save plan", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditPlan = () => {
      if (!assignedPlan) return;
      setPlanTitle(assignedPlan.title);
      setPlanDescription(assignedPlan.description || '');
      setWeeks(assignedPlan.training_schedule?.weeks || []);
      setViewMode('edit');
  };

  const handleSendFeedback = async (plan: any, type: 'ai' | 'assigned') => {
      if (!feedbackText.trim() || !athleteId || !user) return;
      setIsSendingFeedback(true);
      try {
          await api.sendPlanFeedback(plan.id || 'ai-plan', {
              coachId: user.id,
              athleteId: athleteId,
              feedback: feedbackText,
              planTitle: plan.title,
              planType: type === 'ai' ? 'AI Generated' : 'Coach Custom Plan'
          });
          toast({ title: "Feedback Sent", description: "The athlete has been notified." });
          setFeedbackText('');
      } catch (error) {
          console.error("Failed to send feedback", error);
          toast({ title: "Error", description: "Failed to send feedback", variant: "destructive" });
      } finally {
          setIsSendingFeedback(false);
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
  
  // High-end Metrics Calculation
  const totalSessions = sessions.length;
  const bestScore = totalSessions > 0 ? Math.max(...sessions.map(s => s.formScore || 0)) : 0;
  
  // Gamification Logic
  const xpPerSession = 150;
  const totalXP = totalSessions * xpPerSession;
  const level = Math.floor(totalSessions / 3) + 1;
  const xpForNextLevel = ((level) * 3) * xpPerSession;
  const xpInCurrentLevel = totalXP % (3 * xpPerSession);
  const xpProgress = (xpInCurrentLevel / (3 * xpPerSession)) * 100;

  return (
    <AppLayout user={user}>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary text-3xl font-bold border-2 border-primary/20 shadow-xl overflow-hidden">
                {athleteName.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
              </div>

            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{athleteName}</h1>

              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> {athlete.email}
              </p>
              

            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="rounded-xl border-primary/20 hover:bg-primary/5 transition-all" onClick={() => router.push('/athletes')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Team Roster
            </Button>
            <Button 
              size="lg" 
              className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all font-bold"
              onClick={() => setQuickMsgDialogOpen(true)}
            >
                <Zap className="h-4 w-4 mr-2" />
                Quick Message
            </Button>
          </div>
        </div>

        {/* Quick Message Dialog */}
        <Dialog open={quickMsgDialogOpen} onOpenChange={setQuickMsgDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        Quick Message
                    </DialogTitle>
                    <DialogDescription>
                        Send a direct note to {athleteName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea 
                        placeholder="Write your message here..."
                        className="min-h-[150px] bg-muted/30 border-primary/10 focus:border-primary/30 transition-all resize-none font-medium"
                        value={quickMsgText}
                        onChange={(e) => setQuickMsgText(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setQuickMsgDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendQuickMsg} disabled={!quickMsgText.trim() || isSendingQuickMsg} className="shadow-lg shadow-primary/20 bg-primary">
                        {isSendingQuickMsg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Message
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 h-12 gap-2">
            <TabsTrigger value="overview" className="rounded-md px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="plan" className="rounded-md px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Training Plan</TabsTrigger>
            <TabsTrigger value="goals" className="rounded-md px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Goals</TabsTrigger>
            <TabsTrigger value="history" className="rounded-md px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Session History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-0 outline-none">
            {/* Physical Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 border-primary/10 bg-card/30 backdrop-blur-md hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                            <Ruler className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Height</span>
                    </div>
                    <p className="text-2xl font-black text-foreground">{athlete.height || '176'} <span className="text-xs font-medium text-muted-foreground">cm</span></p>
                </Card>
                <Card className="p-4 border-primary/10 bg-card/30 backdrop-blur-md hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
                            <Scale className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Weight</span>
                    </div>
                    <p className="text-2xl font-black text-foreground">{athlete.weight || '72'} <span className="text-xs font-medium text-muted-foreground">kg</span></p>
                </Card>
                <Card className="p-4 border-primary/10 bg-card/30 backdrop-blur-md hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Age</span>
                    </div>
                    <p className="text-2xl font-black text-foreground">{athlete.age || '24'} <span className="text-xs font-medium text-muted-foreground">yrs</span></p>
                </Card>
                <Card className="p-4 border-primary/10 bg-card/30 backdrop-blur-md hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500 group-hover:scale-110 transition-transform">
                            <Activity className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gender</span>
                    </div>
                    <p className="text-2xl font-black text-foreground capitalize">{athlete.gender || 'Male'}</p>
                </Card>
            </div>

            {/* Performance Overview */}
            <div className="grid gap-6 md:grid-cols-4">
              <StatCard
                title="Training Volume"
                value={totalSessions}
                subtitle="Total Sessions"
                icon={Activity}
              />
              <StatCard
                title="Form Mastery"
                value={`${avgFormScore}%`}
                subtitle="Avg Form Score"
                icon={TrendingUp}
              />
              <StatCard
                title="Personal Best"
                value={`${bestScore}%`}
                subtitle="Highest Score"
                icon={Trophy}
              />
              <StatCard
                title="Consistency"
                value={streak}
                subtitle="Current Streak"
                icon={Flame}
              />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
                </div>
                <div className="grid gap-4">
                  {sessions.length > 0 ? sessions.slice(0, 3).map((session) => {
                      const score = session.formScore || 0;
                      let statusColor = "text-muted-foreground";
                      let bgColor = "bg-muted/20";
                      let indicatorColor = "bg-muted-foreground";
                      let statusText = "Recorded";

                      if (score >= 85) {
                        statusColor = "text-green-500";
                        bgColor = "bg-green-500/10";
                        indicatorColor = "bg-green-500";
                        statusText = "Excellent";
                      } else if (score >= 70) {
                        statusColor = "text-blue-500";
                        bgColor = "bg-blue-500/10";
                        indicatorColor = "bg-blue-500";
                        statusText = "Solid";
                      } else if (score >= 50) {
                        statusColor = "text-yellow-500";
                        bgColor = "bg-yellow-500/10";
                        indicatorColor = "bg-yellow-500";
                        statusText = "Average";
                      } else {
                        statusColor = "text-orange-500";
                        bgColor = "bg-orange-500/10";
                        indicatorColor = "bg-orange-500";
                        statusText = "Needs Focus";
                      }

                      return (
                        <Link key={session.id || session.sessionId} href={`/sessions/${session.id || session.sessionId}`}>
                            <Card className="p-5 border-none bg-card hover:bg-accent/50 transition-all flex items-center justify-between group cursor-pointer shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-5">
                                <div className={`h-12 w-12 rounded-xl ${bgColor} flex items-center justify-center ${statusColor} shadow-inner group-hover:scale-110 transition-transform`}>
                                    <Zap className="h-6 w-6"/>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-lg block">{session.exercise}</span>
                                        <Badge variant="outline" className={`text-[10px] uppercase font-black px-1.5 py-0 border-0 ${bgColor} ${statusColor}`}>
                                            {statusText}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground font-medium">{new Date(session.date || session.timestamp || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                        <span className="text-xs text-muted-foreground font-medium">{session.durationSec ? `${Math.round(session.durationSec / 60)} min` : 'Session'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className={`text-3xl font-black block tracking-tighter ${statusColor}`}>{score}%</span>
                                    <div className="w-16 h-1 w-full bg-muted/30 rounded-full mt-1 overflow-hidden">
                                        <div className={`h-full ${indicatorColor} transition-all duration-1000`} style={{ width: `${score}%` }} />
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            </Card>
                        </Link>
                      );
                  }) : <p className="text-muted-foreground italic p-8 text-center border-2 border-dashed rounded-xl">No sessions recorded yet.</p>}
                </div>
              </div>


            </div>
          </TabsContent>

          <TabsContent value="plan" className="space-y-6 mt-0 outline-none">
             <div className="flex flex-col gap-6">
                <Tabs value={activePlanTab} onValueChange={setActivePlanTab} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-muted/50">
                            <TabsTrigger value="ai_plan">Athena AI Plan</TabsTrigger>
                            <TabsTrigger value="assigned">Coach Custom Plan</TabsTrigger>
                        </TabsList>
                        {activePlanTab === 'assigned' && assignedPlan && viewMode === 'read_only' && (
                            <Button onClick={() => setViewMode('edit')} variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4" /> Edit Current Plan
                            </Button>
                        )}
                    </div>

                    <TabsContent value="ai_plan" className="space-y-6">
                        {aiPlan ? (
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    <Card className="p-6">
                                        <h3 className="text-xl font-bold mb-4">{aiPlan.title}</h3>
                                        <div className="space-y-4">
                                            {(aiPlan.weekly_schedule || []).map((day: any, i: number) => (
                                                <div key={i} className="border-l-4 border-purple-500/30 bg-purple-500/5 p-4 rounded-r-lg">
                                                    <div className="font-bold flex justify-between">
                                                        <span>{day.day} - {day.focus}</span>
                                                        <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">AI Generated</Badge>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {day.exercises?.map((ex: any, j: number) => (
                                                            <div key={j} className="text-xs bg-background border px-2 py-1 rounded-full uppercase font-black tracking-tighter">
                                                                {ex.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                                <div className="space-y-6">
                                    <Card className="p-6">
                                        <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-muted-foreground">Coach Perspective</h4>
                                        <Textarea 
                                            placeholder="Suggest adjustments or provide motivation for this AI plan..." 
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            className="min-h-[120px] mb-4 bg-muted/20"
                                        />
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleSendFeedback(aiPlan, 'ai')}
                                            disabled={!feedbackText.trim() || isSendingFeedback}
                                        >
                                            {isSendingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            Update Feedback
                                        </Button>
                                    </Card>
                                </div>
                            </div>
                        ) : (
                            <Card className="p-12 text-center border-dashed">
                                <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground">Athlete hasn't generated an AI plan yet.</p>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="assigned" className="space-y-6">
                        {viewMode === 'read_only' && assignedPlan ? (
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    <Card className="p-6 border-primary/20 bg-primary/5">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold">{assignedPlan.title}</h3>
                                                <p className="text-muted-foreground">{assignedPlan.description}</p>
                                            </div>
                                            <Badge className="bg-primary text-primary-foreground">Active Custom Plan</Badge>
                                        </div>
                                        <div className="space-y-6">
                                            {(assignedPlan.training_schedule?.weeks || []).map((week: any, wIdx: number) => (
                                                <div key={wIdx} className="space-y-3">
                                                    <h4 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                                                        <ChevronRight className="h-4 w-4" /> Week {week.weekNumber}: {week.focus}
                                                    </h4>
                                                    <div className="grid gap-3">
                                                        {week.days.map((day: any, dIdx: number) => (
                                                            <div key={dIdx} className="bg-background border rounded-xl p-4 shadow-sm">
                                                                <div className="font-bold text-foreground mb-2">{day.dayName} • {day.focus}</div>
                                                                <div className="grid sm:grid-cols-2 gap-2">
                                                                    {day.exercises.map((ex: any, eIdx: number) => (
                                                                        <div key={eIdx} className="text-sm border-l-2 border-primary/20 pl-3 py-1">
                                                                            <span className="font-bold">{ex.name}</span>
                                                                            <span className="text-muted-foreground ml-2">{ex.sets}x{ex.reps}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                                <div className="space-y-6">
                                    <Card className="p-6">
                                        <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-muted-foreground">Session Feedback</h4>
                                        <Textarea 
                                            placeholder="Leave a note for this specific plan..." 
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            className="min-h-[120px] mb-4 bg-muted/20"
                                        />
                                        <Button 
                                            className="w-full"
                                            onClick={() => handleSendFeedback(assignedPlan, 'assigned')}
                                            disabled={!feedbackText.trim() || isSendingFeedback}
                                        >
                                            {isSendingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            Post Message
                                        </Button>
                                    </Card>
                                    <Button variant="outline" className="w-full border-dashed" onClick={() => {
                                         setPlanTitle('New Training Cycle');
                                         setPlanDescription('');
                                         setWeeks([{ weekNumber: 1, focus: 'Introduction', days: [] }]);
                                         setViewMode('edit');
                                    }}>
                                        Assign New Training Program
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <Card className="p-6 bg-card border-primary/30 shadow-xl">
                                    <div className="flex justify-between items-center mb-6 pb-6 border-b">
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight">Custom Plan Builder</h3>
                                            <p className="text-muted-foreground">Architect a professional-grade program for {athleteName}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {assignedPlan && <Button variant="ghost" onClick={() => setViewMode('read_only')}>Discard Edit</Button>}
                                            <Button size="lg" onClick={handleSaveAndAssign} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Save & Assign 
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest">Plan Heading</Label>
                                            <Input className="text-lg font-bold h-11" value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="e.g. Off-Season Hypertrophy" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest">Primary Objective</Label>
                                            <Input className="text-lg font-bold h-11" value={planDescription} onChange={e => setPlanDescription(e.target.value)} placeholder="e.g. Increase explosive power and leg drive" />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Training Timeline</h4>
                                            <Button onClick={handleAddWeek} size="sm" variant="secondary"><Plus className="h-4 w-4 mr-1" /> Add Phase</Button>
                                        </div>

                                        <Accordion type="multiple" defaultValue={['week-0']} className="space-y-4">
                                            {weeks.map((week, wIdx) => (
                                                <AccordionItem key={wIdx} value={`week-${wIdx}`} className="border rounded-2xl px-4 bg-muted/20">
                                                    <AccordionTrigger className="hover:no-underline py-4">
                                                        <div className="flex gap-4 items-center w-full text-left">
                                                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">{week.weekNumber}</div>
                                                            <Input 
                                                                className="h-9 w-64 bg-background font-bold"
                                                                value={week.focus} 
                                                                onChange={e => updateWeek(wIdx, 'focus', e.target.value)}
                                                                onClick={e => e.stopPropagation()} 
                                                                placeholder="Phase Focus (e.g. Pre-Season Prep)"
                                                            />
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-4 pb-6 space-y-4">
                                                        <div className="grid gap-4">
                                                            {week.days.map((day: any, dIdx: number) => (
                                                                <div key={dIdx} className="bg-background border rounded-xl overflow-hidden shadow-sm">
                                                                    <div className="bg-muted/30 p-3 border-b flex gap-3">
                                                                        <Input 
                                                                            className="w-32 bg-background font-black text-xs uppercase"
                                                                            value={day.dayName}
                                                                            onChange={e => updateDay(wIdx, dIdx, 'dayName', e.target.value)}
                                                                        />
                                                                        <Input 
                                                                            className="flex-1 bg-background font-bold text-sm"
                                                                            value={day.focus}
                                                                            onChange={e => updateDay(wIdx, dIdx, 'focus', e.target.value)}
                                                                            placeholder="Session Objective"
                                                                        />
                                                                    </div>
                                                                    <div className="p-4 space-y-2">
                                                                        {day.exercises.map((ex: any, eIdx: number) => (
                                                                            <div key={eIdx} className="grid grid-cols-12 gap-3 items-center">
                                                                                <Input className="col-span-5 h-9" placeholder="Exercise" value={ex.name} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'name', e.target.value)} />
                                                                                <Input className="col-span-2 h-9" placeholder="Sets" type="number" value={ex.sets} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'sets', parseInt(e.target.value))} />
                                                                                <Input className="col-span-2 h-9" placeholder="Reps" value={ex.reps} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'reps', e.target.value)} />
                                                                                <Input className="col-span-3 h-9" placeholder="Notes" value={ex.notes} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'notes', e.target.value)} />
                                                                            </div>
                                                                        ))}
                                                                        <Button variant="ghost" size="sm" className="w-full mt-2 text-primary hover:bg-primary/5" onClick={() => handleAddExercise(wIdx, dIdx)}>
                                                                            + Add Exercise Item
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <Button variant="outline" className="w-full h-12 border-dashed rounded-xl" onClick={() => handleAddDay(wIdx)}>
                                                            + Schedule Training Session
                                                        </Button>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
             </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6 mt-0 outline-none">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Athlete Goals</h2>
                        <p className="text-muted-foreground">Manage and track performance targets</p>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4"/> Assign New Goal
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Set Goal for {athleteName}</DialogTitle>
                                <DialogDescription>Define a specific, measurable target for this athlete.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Goal Title</Label>
                                    <Input value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g. 50kg Bench Press 1RM" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={newGoal.priority} onValueChange={(v: any) => setNewGoal({...newGoal, priority: v})}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} placeholder="Details on form, conditions, etc." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Target Value</Label>
                                        <Input type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit</Label>
                                        <Input value={newGoal.unit} onChange={e => setNewGoal({...newGoal, unit: e.target.value})} placeholder="kg, reps, score" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Deadline</Label>
                                    <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} />
                                </div>
                                <Button onClick={handleCreateGoal} disabled={isCreatingGoal || !newGoal.title} className="w-full">
                                    {isCreatingGoal ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Send className="h-4 w-4 mr-2"/>} Assign Goal
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {goals.length === 0 ? (
                    <Card className="p-12 text-center border-dashed">
                        <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No active goals found for this athlete.</p>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {goals.map(goal => (
                            <GoalCard 
                                key={goal.id || goal.goalId} 
                                goal={goal} 
                                onFeedback={() => setFeedbackGoal(goal)}
                                readOnly
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Goal Feedback Dialog */}
            <Dialog open={!!feedbackGoal} onOpenChange={(open) => !open && setFeedbackGoal(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Goal Progress Feedback</DialogTitle>
                        <DialogDescription>
                            Send a specific note regarding "{feedbackGoal?.title}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Textarea 
                            placeholder="e.g. Excellent progress on your form! Keep it consistent..." 
                            value={goalFeedbackText}
                            onChange={e => setGoalFeedbackText(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setFeedbackGoal(null)}>Cancel</Button>
                            <Button onClick={handleSendGoalFeedback} disabled={!goalFeedbackText.trim() || isSendingGoalFeedback}>
                                {isSendingGoalFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Send Note
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="history" className="mt-0 outline-none">
            <Card className="p-6 border-none bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="h-6 w-6 text-primary" />
                        Full Training Log
                    </h2>
                    <Badge variant="outline">{sessions.length} Sessions Total</Badge>
                </div>
                <div className="space-y-3">
                    {sessions.map((session, idx) => (
                         <Link key={session.id || session.sessionId} href={`/sessions/${session.id || session.sessionId}`}>
                            <div className="p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                        <Dumbbell className="h-5 w-5"/>
                                    </div>
                                    <div>
                                        <span className="font-bold block">{session.exercise}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(session.date || session.timestamp || '').toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-6">
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Duration</p>
                                        <p className="text-sm font-bold">{session.durationSec || session.duration || '--'}s</p>
                                    </div>
                                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center font-black text-lg ${
                                        (session.formScore || 0) >= 85 ? 'bg-green-500/10 text-green-600' :
                                        (session.formScore || 0) >= 70 ? 'bg-orange-500/10 text-orange-600' :
                                        'bg-red-500/10 text-red-600'
                                    }`}>
                                        {session.formScore || 0}
                                    </div>
                                </div>
                            </div>
                         </Link>
                    ))}
                    {sessions.length === 0 && <p className="text-center py-12 text-muted-foreground">Log is empty.</p>}
                </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

