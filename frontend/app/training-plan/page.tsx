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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { TrainingPlan } from '@/lib/types';
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  Dumbbell, 
  Target, 
  Zap, 
  Clock, 
  Trophy,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'loading' | 'dashboard' | 'goal_input' | 'clarification' | 'generating';

export default function TrainingPlanPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState<Step>('loading');
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [goal, setGoal] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [generatingPhase, setGeneratingPhase] = useState<string>(''); // For loading text

  // Initial Load
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && step === 'loading') {
      fetchPlan();
    }
  }, [user, authLoading, router]);

  const fetchPlan = async () => {
    if (!user) return;
    try {
      const data = await api.getTrainingPlan(user.id);
      if (data && data.weeks && data.weeks.length > 0) {
        setPlan(data);
        setStep('dashboard');
      } else {
        // Check for AI plan fields if standard fields empty
        if (data && data.weekly_schedule) {
            setPlan(data);
            setStep('dashboard');
        } else {
            setStep('goal_input');
        }
      }
    } catch (err) {
      console.log('No existing plan found, starting wizard');
      setStep('goal_input');
    }
  };

  // --- Step 1: Goal Analysis ---
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
        // Fallback if no questions
        setQuestions([]);
        handleGeneratePlan(); // Skip to generation
      }
    } catch (err) {
      console.error(err);
      // Determine Questions manually if API fails (fallback)
      setQuestions([
          {
              id: "days",
              text: "How many days a week can you train?",
              type: "select",
              options: ["3 days", "4 days", "5 days", "6 days"]
          },
          {
              id: "experience",
              text: "What is your experience level?",
              type: "select",
              options: ["Beginner", "Intermediate", "Advanced"]
          }
      ]);
      setStep('clarification');
    }
  };

  // --- Step 2: Plan Generation ---
  const handleGeneratePlan = async () => {
    if (!user) return;
    setStep('generating');
    setGeneratingPhase('Designing your 4-week micro-cycles...');
    
    try {
      // Small delay to show phase
      setTimeout(async () => {
        setGeneratingPhase('Finalizing exercises and load...');
        const newPlan = await api.generateAIPlan(user.id, goal, answers);
        setPlan(newPlan);
        setStep('dashboard');
      }, 1500);
      
    } catch (err) {
        console.error("Failed to generate plan", err);
        setStep('goal_input'); // Reset on error
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

  return (
    <AppLayout user={user!}>
        {/* WIZARD VIEWS */}
        
        {step === 'goal_input' && (
            <div className="max-w-3xl mx-auto py-12 space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">Build Your Legacy</h1>
                    <p className="text-xl text-muted-foreground">
                        Describe your dream outcome. Our AI Coach will build the roadmap.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PRO_SUGGESTIONS.map((s, i) => (
                        <button 
                            key={i}
                            onClick={() => setGoal(s.text)}
                            className="bg-card hover:bg-accent/50 border rounded-xl p-4 text-left transition-all flex items-start gap-3 group"
                        >
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
                        <Textarea 
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="e.g. I want to improve my agility for tennis and prevent knee injuries..."
                            className="min-h-[150px] text-lg resize-none p-4"
                        />
                        <div className="mt-4 flex justify-end">
                            <Button 
                                size="lg" 
                                onClick={handleAnalyzeGoal}
                                disabled={!goal || goal.length < 5}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                            >
                                <Sparkles className="mr-2 h-5 w-5" />
                                Design My Plan
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {step === 'clarification' && (
            <div className="max-w-2xl mx-auto py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Just a few details...</CardTitle>
                        <CardDescription>Coach AI needs this to tailor the intensity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {questions.map((q, idx) => (
                            <div key={idx} className="space-y-3">
                                <Label className="text-base font-medium flex items-center gap-2">
                                    {q.text}
                                    {q.why && (
                                        <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                            Why? {q.why}
                                        </span>
                                    )}
                                </Label>
                                
                                {q.type === 'select' && (
                                    <Select 
                                        onValueChange={(val) => setAnswers({...answers, [q.id]: val})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {q.options?.map((opt: string) => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                
                                {(q.type === 'text' || q.type === 'number') && (
                                    <Input 
                                        type={q.type}
                                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                                        placeholder="Your answer..."
                                    />
                                )}

                                {q.type === 'multiselect' && (
                                    <div className="block text-sm text-yellow-600">
                                        Multi-select not supported in mock, please type.
                                        <Input onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep('goal_input')}>Back</Button>
                        <Button onClick={handleGeneratePlan} className="bg-primary">
                            Generate Training Plan
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )}

        {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                </div>
                <h2 className="text-2xl font-bold animate-pulse">{generatingPhase}</h2>
                <div className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Goal Analyzed
                    <span className="opacity-30">|</span>
                    <Circle className="h-4 w-4" /> Physiology Check
                </div>
            </div>
        )}

        {step === 'dashboard' && plan && (
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                                AI Generated
                            </Badge>
                            <span className="text-sm text-muted-foreground">{plan.duration} program</span>
                        </div>
                        <h1 className="text-3xl font-bold">{plan.title || plan.name}</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">{plan.description}</p>
                    </div>
                    <Button variant="outline" onClick={() => { setStep('goal_input'); setPlan(null); }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Create New Plan
                    </Button>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Target className="h-4 w-4 text-primary" />
                                    Focus Areas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    <Badge>{plan.goal_focus || plan.focus_areas?.[0] || 'General'}</Badge>
                                    {plan.focus_areas?.slice(1).map(f => (
                                        <Badge key={f} variant="secondary">{f}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-primary" />
                                    Coaching Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {plan.coaching_tips?.map((tip, i) => (
                                        <li key={i} className="flex gap-3 text-sm">
                                            <div className="h-6 w-0.5 bg-primary/50 shrink-0 mt-0.5" />
                                            {tip}
                                        </li>
                                    )) || (
                                        <li className="text-sm text-muted-foreground">Follow the plan consistently for results.</li>
                                    )}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Weekly Schedule */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            Weekly Micro-Cycle
                        </h2>
                        
                        <div className="space-y-4">
                            {plan.weekly_schedule?.map((day: any, i: number) => (
                                <Card key={i} className="overflow-hidden border-l-4 border-l-primary/40 hover:border-l-primary transition-colors">
                                    <div className="p-4 flex items-start gap-4">
                                        <div className="min-w-[4rem] font-bold text-lg text-muted-foreground uppercase pt-1">
                                            {day.day.substring(0, 3)}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between">
                                                <h3 className="font-semibold text-lg">{day.focus || 'Rest Day'}</h3>
                                                <Badge variant={day.focus === 'Rest' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                                                    {day.focus === 'Rest' ? 'Recovery' : 'Workout'}
                                                </Badge>
                                            </div>
                                            
                                            {day.exercises?.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                    {day.exercises.map((ex: any, j: number) => (
                                                        <div key={j} className="bg-secondary/20 p-2 rounded text-sm flex justify-between items-center group">
                                                            <div className="font-medium flex items-center gap-2">
                                                                <Dumbbell className="h-3 w-3 text-primary opacity-50" />
                                                                {ex.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded border">
                                                                {ex.sets}x{ex.reps}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">
                                                    Active recovery. Stretch, walk, or light yoga.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Progression */}
                        <div className="mt-8 pt-8 border-t">
                            <h2 className="text-xl font-semibold mb-4">4-Week Progression</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                {(Array.isArray(plan.progression_plan) ? plan.progression_plan : (plan.progression_plan as any)?.weeks || []).map((week: any, k: number) => (
                                    <div key={k} className="bg-card border p-3 rounded-lg text-center space-y-2">
                                        <div className="text-xs uppercase font-bold text-muted-foreground">Week {week.week}</div>
                                        <div className="font-semibold text-primary">{week.focus}</div>
                                        <div className="text-xs leading-relaxed opacity-80">{week.instruction}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </AppLayout>
  );
}
