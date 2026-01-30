'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { TrainingPlan } from '@/lib/types';
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  Dumbbell, 
  Target, 
  Trophy,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Circle,
  User as UserIcon,
  Bot
} from 'lucide-react';
import { CoachView } from './coach-view';

type Step = 'loading' | 'dashboard' | 'goal_input' | 'clarification' | 'generating';

export default function TrainingPlanPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState<Step>('loading');
  const [plan, setPlan] = useState<any>(null); // Use 'any' to support both types
  const [goal, setGoal] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [generatingPhase, setGeneratingPhase] = useState<string>('');
  
  // Toggle State
  const [planSource, setPlanSource] = useState<'assigned' | 'ai'>('assigned');
  const [hasAssignedPlan, setHasAssignedPlan] = useState(false);

  // Initial Load
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && step === 'loading' && user.role === 'athlete') {
      fetchPlan();
    }
  }, [user, authLoading, router]);

  const fetchPlan = async (source: string = 'assigned') => {
    if (!user) return;
    try {
      // 1. Try to fetch the requested source
      const data: any = await api.getTrainingPlan(user.id, source === 'ai' ? 'ai' : undefined);
      
      // 2. Check if we actually got what we wanted
      if (data) {
          // If we requested assigned, but got AI back (because no assigned exists), handle that
          if (source === 'assigned' && data.type === 'ai_generated') {
              setHasAssignedPlan(false);
              setPlanSource('ai');
          } else if (source === 'assigned' && data.type === 'coach_assigned') {
              setHasAssignedPlan(true);
              setPlanSource('assigned');
          } else if (source === 'ai') {
              // We explicitly asked for AI
              setPlanSource('ai');
          }
          
          setPlan(data);
          setStep('dashboard');

          // If we fetched AI, assume fallback logic means no assigned plan OR user switched tab
          if (source === 'assigned' && data.type === 'coach_assigned') {
               // We found a coach plan
               setHasAssignedPlan(true);
          }
      } else {
        // No plan at all
        setStep('goal_input');
      }

      // 3. Double Check: If we are in 'ai' mode, check if 'assigned' exists in background to show toggle
      if (source === 'ai') {
          // Verify if assigned plan exists separately to enable toggle button
          try {
             // We can check this by making a raw request for assigned plan
             // If backend returns a coach plan, setHasAssignedPlan(true)
             const check = await api.getTrainingPlan(user.id); // Default call
             if (check && (check as any).type === 'coach_assigned') {
                 setHasAssignedPlan(true);
             }
          } catch(e) {}
      }

    } catch (err) {
      console.log('No existing plan found, starting wizard');
      setStep('goal_input');
    }
  };

  const handleToggleChange = (val: string) => {
      if (val === 'assigned') {
          fetchPlan('assigned');
      } else {
          fetchPlan('ai');
      }
  };

  // --- WIZARD HANDLERS ---
  const handleAnalyzeGoal = async () => {
    if (!goal.trim()) return;
    setStep('generating');
    setGeneratingPhase('Analyzing your physiology and goals...');
    try {
      const response = await api.analyzeGoal(goal);
      if (response && response.questions) {
        setQuestions(response.questions);
        setStep('clarification');
      } else {
        setQuestions([]);
        handleGeneratePlan(); 
      }
    } catch (err) {
      console.error(err);
      setQuestions([
          { id: "days", text: "How many days a week can you train?", type: "select", options: ["3 days", "4 days", "5 days", "6 days"] },
          { id: "experience", text: "What is your experience level?", type: "select", options: ["Beginner", "Intermediate", "Advanced"] }
      ]);
      setStep('clarification');
    }
  };

  const handleGeneratePlan = async () => {
    if (!user) return;
    setStep('generating');
    setGeneratingPhase('Designing your 4-week micro-cycles...');
    try {
      setTimeout(async () => {
        setGeneratingPhase('Finalizing exercises and load...');
        const finalAnswers = { ...answers };
        Object.keys(customAnswers).forEach(key => {
            if (answers[key] === 'Other') finalAnswers[key] = customAnswers[key];
        });
        const newPlan = await api.generateAIPlan(user.id, goal, finalAnswers);
        setPlan(newPlan);
        setStep('dashboard');
        setPlanSource('ai'); 
      }, 1500);
    } catch (err) {
        console.error("Failed to generate plan", err);
        setStep('goal_input');
    }
  };

  const PRO_SUGGESTIONS = [
    { label: "Train like LeBron", icon: "👑", text: "I want to train like LeBron James. Focus on longevity, core stability, and explosive power." },
    { label: "Run a Sub-20 5K", icon: "🏃", text: "I want to run a 5k in under 20 minutes. Current time is 24 mins." },
    { label: "Increase Vertical", icon: "🚀", text: "I want to increase my vertical jump by 5 inches for basketball." },
    { label: "Build Muscle", icon: "💪", text: "I want to build lean muscle mass (hypertrophy) with a 4-day split." },
  ];

  if (authLoading || (!user && step === 'loading')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- COACH VIEW ---
  if (user?.role === 'coach') {
      return (
          <AppLayout user={user}>
              <CoachView userId={user.id} />
          </AppLayout>
      );
  }

  // --- ATHLETE VIEW ---
  return (
    <AppLayout user={user!}>
        
        {/* TOP TOGGLE */}
        {step === 'dashboard' && hasAssignedPlan && (
            <div className="flex justify-center mb-6">
                <Tabs value={planSource} onValueChange={handleToggleChange} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="assigned" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <UserIcon className="w-4 h-4 mr-2" /> 
                            Coach Plan
                        </TabsTrigger>
                        <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                            <Bot className="w-4 h-4 mr-2" />
                            AI Plan
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        )}

        {/* WIZARD VIEWS */}
        {step === 'goal_input' && (
            <div className="max-w-3xl mx-auto py-12 space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">Build Your Legacy</h1>
                    <p className="text-xl text-muted-foreground">
                        Describe your dream outcome. Our AI Coach will build the roadmap.
                    </p>
                </div>
                {/* Same Goal Input UI as before... */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PRO_SUGGESTIONS.map((s, i) => (
                        <button key={i} onClick={() => setGoal(s.text)} className="bg-card hover:bg-accent/50 border rounded-xl p-4 text-left transition-all flex items-start gap-3 group">
                            <span className="text-2xl">{s.icon}</span>
                            <div>
                                <div className="font-semibold group-hover:text-primary transition-colors">{s.label}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-1 opacity-70">{s.text}</div>
                            </div>
                        </button>
                    ))}
                </div>
                <Card className="border-2 border-primary/10 shadow-lg">
                    <CardContent className="pt-6">
                        <Label className="text-lg font-semibold mb-2 block">What is your main goal?</Label>
                        <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. I want to improve my agility for tennis..." className="min-h-[150px] text-lg resize-none p-4" />
                        <div className="mt-4 flex justify-end">
                            <Button size="lg" onClick={handleAnalyzeGoal} disabled={!goal || goal.length < 5} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                                <Sparkles className="mr-2 h-5 w-5" /> Design My Plan
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {step === 'clarification' && (
             <div className="max-w-2xl mx-auto py-12">
                <Card>
                    <CardHeader><CardTitle>Just a few details...</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {questions.map((q, idx) => (
                            <div key={idx} className="space-y-3">
                                <Label className="text-base font-medium flex items-center gap-2">{q.text}</Label>
                                {q.type === 'select' && (
                                    <Select onValueChange={(val) => setAnswers({...answers, [q.id]: val})}>
                                        <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                                        <SelectContent>
                                            {q.options?.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            <SelectItem value="Other">Other (Type below)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                                {(q.type === 'text' || q.type === 'number') && <Input type={q.type} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} />}
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep('goal_input')}>Back</Button>
                        <Button onClick={handleGeneratePlan}>Generate Training Plan <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </CardFooter>
                </Card>
            </div>
        )}

        {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
                <div className="relative"><Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" /></div>
                <h2 className="text-2xl font-bold animate-pulse">{generatingPhase}</h2>
            </div>
        )}

        {step === 'dashboard' && plan && (
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`border-primary/30 ${plan.type === 'coach_assigned' ? 'bg-primary/10 text-primary' : 'bg-purple-100 text-purple-700'}`}>
                                {plan.type === 'coach_assigned' ? 'Coach Assigned' : 'AI Generated'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{plan.duration || plan.duration_weeks + ' weeks'} program</span>
                        </div>
                        <h1 className="text-3xl font-bold">{plan.title || plan.name}</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">{plan.description}</p>
                    </div>
                    {plan.type !== 'coach_assigned' && (
                        <Button variant="outline" onClick={() => { setStep('goal_input'); setPlan(null); }}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Create New AI Plan
                        </Button>
                    )}
                </div>

                {/* Main Content - Adapts based on plan structure */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Focus Areas</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    <Badge>{plan.goal_focus || plan.focus_areas?.[0] || 'General'}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                        {plan.coaching_tips && (
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Coaching Tips</CardTitle></CardHeader>
                                <CardContent>
                                    <ul className="space-y-3">
                                        {plan.coaching_tips?.map((tip: string, i: number) => (
                                            <li key={i} className="flex gap-3 text-sm"><div className="h-6 w-0.5 bg-primary/50 shrink-0 mt-0.5" />{tip}</li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Weekly Schedule */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><CalendarIcon className="h-5 w-5" /> Schedule</h2>
                        
                        <div className="space-y-4">
                            {/* Handle Both AI structure (weekly_schedule) and Coach structure (training_schedule.weeks) */}
                            {(() => {
                                const weeks = plan.weekly_schedule || plan.training_schedule?.weeks || plan.weeks || [];
                                // If it's Coach structure (weeks array), we might need to flatten or just show first week for now
                                // Or if it's AI structure (array of days)
                                
                                if (weeks.length > 0 && weeks[0].days) {
                                    // It's Coach Structure (Weeks -> Days)
                                    // Display All Weeks or Tabs? Let's display Week 1 for now or all
                                    return weeks.map((week: any, wIdx: number) => (
                                        <div key={wIdx} className="space-y-4">
                                            <h3 className="font-bold text-lg text-primary">Week {week.weekNumber}: {week.focus}</h3>
                                            {week.days.map((day: any, dIdx: number) => (
                                                <Card key={dIdx} className="overflow-hidden border-l-4 border-l-primary/40">
                                                    <div className="p-4 flex items-start gap-4">
                                                        <div className="min-w-[4rem] font-bold text-lg text-muted-foreground pt-1">{day.dayName}</div>
                                                        <div className="flex-1 space-y-3">
                                                            <div className="font-semibold text-lg">{day.focus}</div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                                {day.exercises.map((ex: any, eIdx: number) => (
                                                                    <div key={eIdx} className="bg-secondary/20 p-2 rounded text-sm group">
                                                                        <div className="font-medium flex items-center gap-2"><Dumbbell className="h-3 w-3 opacity-50" /> {ex.name}</div>
                                                                        <div className="text-xs text-muted-foreground mt-1">{ex.sets} sets x {ex.reps} reps {ex.weight ? `@ ${ex.weight}` : ''}</div>
                                                                        {ex.notes && <div className="text-xs text-muted-foreground italic mt-1">{ex.notes}</div>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    ));
                                } else {
                                    // AI Structure (Array of Days)
                                    return weeks.map((day: any, i: number) => (
                                        <Card key={i} className="overflow-hidden border-l-4 border-l-primary/40">
                                            <div className="p-4 flex items-start gap-4">
                                                <div className="min-w-[4rem] font-bold text-lg text-muted-foreground uppercase pt-1">{day.day.substring(0, 3)}</div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex justify-between">
                                                        <h3 className="font-semibold text-lg">{day.focus || 'Rest Day'}</h3>
                                                        <Badge variant={day.focus === 'Rest' ? 'secondary' : 'default'} className="uppercase text-[10px]">{day.focus === 'Rest' ? 'Recovery' : 'Workout'}</Badge>
                                                    </div>
                                                    {day.exercises?.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                            {day.exercises.map((ex: any, j: number) => (
                                                                <div key={j} className="bg-secondary/20 p-2 rounded text-sm flex justify-between items-center group">
                                                                    <div className="font-medium flex items-center gap-2"><Dumbbell className="h-3 w-3 opacity-50" /> {ex.name}</div>
                                                                    <div className="text-xs text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded border">{ex.sets}x{ex.reps}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <p className="text-sm text-muted-foreground italic">Active recovery. Stretch, walk, or light yoga.</p>}
                                                </div>
                                            </div>
                                        </Card>
                                    ));
                                }
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </AppLayout>
  );
}
