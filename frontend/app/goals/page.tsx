'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Goal, Athlete } from '@/lib/types';
import { 
  Target, 
  Plus, 
  Loader2, 
  CheckCircle, 
  Clock,
  Trash2,
  Edit,
  User as UserIcon,
  MessageSquare,
  Send,
  Users
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function GoalsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- COACH REDIRECT ---
  if (user?.role === 'coach') {
      router.push('/athletes');
      return null;
  }

  return (
    <AppLayout user={user}>
      <AthleteGoalsManager userId={user.id} />
    </AppLayout>
  );
}

// ==========================================
// ATHLETE VIEW
// ==========================================
function AthleteGoalsManager({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: 100,
    unit: 'sessions',
    deadline: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const getLocalISOString = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000; // offset in ms
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
    return localISOTime;
  };

  useEffect(() => {
    fetchGoals();
  }, [userId]);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGoals(userId);
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching goals:', err);
      toast({ title: "Error", description: "Failed to load goals", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title) return;
    setIsCreating(true);
    try {
      const created = await api.createGoal({
        userId,
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
      setDialogOpen(false);
      setNewGoal({ title: '', description: '', target: 100, unit: 'sessions', deadline: '', priority: 'medium' });
      toast({ title: "Goal Created", description: "Your new goal has been set!" });
    } catch (err) {
      console.error('Error creating goal:', err);
      toast({ title: "Error", description: "Failed to create goal", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProgress = async (goal: Goal, newCurrent: number) => {
    const goalId = goal.id || goal.goalId;
    if (!goalId) return;

    try {
      const status = newCurrent >= goal.target ? 'completed' : 'active';
      await api.updateGoal(userId, goalId, { current: newCurrent, status });
      
      setGoals(goals.map(g => (g.id || g.goalId) === goalId ? { ...g, current: newCurrent, status } : g));
      
      if (status === 'completed' && goal.status !== 'completed') {
        toast({ title: "Goal Completed!", description: `Congratulations on completing ${goal.title}!` });
      }
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.deleteGoal(userId, goalId);
      setGoals(goals.filter(g => (g.id || g.goalId) !== goalId));
      toast({ title: "Goal Deleted" });
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Goals</h1>
          <p className="text-muted-foreground">Track your progress and achievements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Set New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set New Goal</DialogTitle>
              <DialogDescription>Define what you want to achieve.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g. Run 5k" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} placeholder="Optional details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Target Value</Label>
                    <Input type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input value={newGoal.unit} onChange={e => setNewGoal({...newGoal, unit: e.target.value})} placeholder="km, reps, etc" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newGoal.priority} onValueChange={(v: any) => setNewGoal({...newGoal, priority: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
              </div>
              <Button onClick={handleCreateGoal} disabled={isCreating || !newGoal.title} className="w-full">
                  {isCreating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>} Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground"/></div>
      ) : goals.length === 0 ? (
        <div className="text-center p-12 border rounded-lg bg-muted/10">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No goals set</h3>
            <p className="text-muted-foreground">Start by creating your first goal!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map(goal => (
                <GoalCard 
                    key={goal.id || goal.goalId} 
                    goal={goal} 
                    onUpdate={handleUpdateProgress}
                    onDelete={handleDeleteGoal}
                />
            ))}
            {completedGoals.length > 0 && (
                <div className="col-span-full mt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500"/> Completed</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {completedGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} readOnly />
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COACH VIEW
// ==========================================
function CoachGoalsManager({ coachId, coachName }: { coachId: string; coachName: string }) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: 100,
    unit: 'sessions',
    deadline: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Feedback State
  const [feedbackGoal, setFeedbackGoal] = useState<Goal | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const getLocalISOString = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
  };

  useEffect(() => {
    // Fetch athletes assigned to coach (or all for demo)
    api.getAthletes().then(data => {
       // Filter if needed, for now use all
       setAthletes(data);
    });
  }, [coachId]);

  useEffect(() => {
    if (selectedAthleteId) {
        setIsLoading(true);
        api.getGoals(selectedAthleteId)
           .then(data => setGoals(Array.isArray(data) ? data : []))
           .catch(console.error)
           .finally(() => setIsLoading(false));
    } else {
        setGoals([]);
    }
  }, [selectedAthleteId]);

  const handleCreateGoals = async () => {
    if (selectedAthleteIds.length === 0 || !newGoal.title) return;
    setIsCreating(true);

    try {
        // Create goal for EACH selected athlete
        const promises = selectedAthleteIds.map(async (athleteId) => {
            await api.createGoal({
                userId: athleteId,
                title: newGoal.title,
                description: newGoal.description,
                target: newGoal.target,
                current: 0,
                unit: newGoal.unit,
                deadline: newGoal.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                priority: newGoal.priority,
                createdAt: getLocalISOString(),
            });

            // Send notification
            const athlete = athletes.find(a => a.id === athleteId);
            // Format goal details for notification
            const goalDate = newGoal.deadline ? new Date(newGoal.deadline).toLocaleDateString() : 'N/A';
            const msgContent = `New Goal Assigned 🎯

Title: ${newGoal.title}
Target: ${newGoal.target} ${newGoal.unit}
Priority: ${newGoal.priority.charAt(0).toUpperCase() + newGoal.priority.slice(1)}
Deadline: ${goalDate}

Description:
${newGoal.description || 'No additional details provided.'}`;

            await api.sendCoachMessage({
                coachId,
                athleteId,
                message: msgContent,
                coachName: coachName, 
                athleteName: athlete?.name || athlete?.username || 'Athlete', 
                sessionId: 'goal-assignment', 
                type: 'note',
                read: false,
                senderId: coachId,
                timestamp: getLocalISOString(),
                id: crypto.randomUUID()
            });
        });

        await Promise.all(promises);
        
        toast({ 
            title: "Goals Assigned & Notified", 
            description: `Assigned to ${selectedAthleteIds.length} athlete(s).` 
        });
        
        setCreateDialogOpen(false);
        setNewGoal({ title: '', description: '', target: 100, unit: 'sessions', deadline: '', priority: 'medium' });
        setSelectedAthleteIds([]);
        
        // Refresh if viewing one of the affected athletes
        if (selectedAthleteId && selectedAthleteIds.includes(selectedAthleteId)) {
            const data = await api.getGoals(selectedAthleteId);
            setGoals(Array.isArray(data) ? data : []);
        }

    } catch (err) {
        console.error("Failed to assign goals", err);
        toast({ title: "Error", description: "Failed to assign goals", variant: "destructive" });
    } finally {
        setIsCreating(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedbackGoal || !feedbackText.trim() || !selectedAthleteId) return;
    
    setIsSendingFeedback(true);
    const athlete = athletes.find(a => a.id === selectedAthleteId);
    
    try {
        await api.sendCoachMessage({
            coachId,
            athleteId: selectedAthleteId,
            message: `Feedback on Goal "${feedbackGoal.title}": ${feedbackText}`,
            coachName: coachName, 
            athleteName: athlete?.name || athlete?.username || 'Athlete', 
            sessionId: 'goal-feedback', 
            type: 'feedback',
            read: false,
            senderId: coachId,
            timestamp: getLocalISOString(),
            id: crypto.randomUUID()
        });
        toast({ title: "Feedback Sent" });
        setFeedbackGoal(null);
        setFeedbackText("");
    } catch (err) {
        console.error("Failed to send feedback", err);
        toast({ title: "Error", description: "Failed to send feedback" });
    } finally {
        setIsSendingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Athlete Goals</h1>
            <p className="text-muted-foreground">Manage and track goals for your athletes</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4"/> Assign Goal
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Assign Goal to Athletes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    {/* Athlete Selection */}
                    <div className="space-y-2">
                        <Label>Select Athletes</Label>
                        <div className="border rounded-md p-2 h-32 overflow-y-auto space-y-2">
                            {athletes.map(athlete => (
                                <div key={athlete.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`athlete-${athlete.id}`}
                                        checked={selectedAthleteIds.includes(athlete.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setSelectedAthleteIds([...selectedAthleteIds, athlete.id]);
                                            else setSelectedAthleteIds(selectedAthleteIds.filter(id => id !== athlete.id));
                                        }}
                                    />
                                    <label htmlFor={`athlete-${athlete.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                        {athlete.name || athlete.username || 'Athlete'}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{selectedAthleteIds.length} athletes selected</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Goal Title</Label>
                            <Input value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g. Improve Squat Form" />
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
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Target</Label>
                            <Input type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input value={newGoal.unit} onChange={e => setNewGoal({...newGoal, unit: e.target.value})} placeholder="reps, score" />
                        </div>
                        <div className="space-y-2">
                            <Label>Deadline</Label>
                            <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} />
                        </div>
                    </div>

                    <Button onClick={handleCreateGoals} disabled={isCreating || selectedAthleteIds.length === 0 || !newGoal.title} className="w-full">
                        {isCreating ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Send className="h-4 w-4 mr-2"/>} Assign Goals
                    </Button>
                </div>
            </DialogContent>
          </Dialog>
       </div>

       {/* Athlete Picker for Viewing */}
       <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-lg">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
              <Label className="mb-1 block text-xs uppercase text-muted-foreground">Viewing Goals For</Label>
              <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
                  <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select an athlete..." />
                  </SelectTrigger>
                  <SelectContent>
                      {athletes.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name || a.username}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
       </div>

       {/* Content Area */}
       {!selectedAthleteId ? (
          <div className="flex flex-col items-center justify-center p-12 border rounded-lg border-dashed">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Select an Athlete</h3>
              <p className="text-muted-foreground">Choose an athlete above to view and manage their goals.</p>
          </div>
       ) : isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
       ) : goals.length === 0 ? (
          <div className="text-center p-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground">This athlete has no active goals.</p>
          </div>
       ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {goals.map(goal => (
                  <GoalCard 
                    key={goal.id || goal.goalId} 
                    goal={goal} 
                    readOnly 
                    onFeedback={() => setFeedbackGoal(goal)}
                  />
              ))}
          </div>
       )}

       {/* Feedback Dialog */}
       <Dialog open={!!feedbackGoal} onOpenChange={(open) => !open && setFeedbackGoal(null)}>
           <DialogContent>
               <DialogHeader>
                   <DialogTitle>Send Goal Feedback</DialogTitle>
                   <DialogDescription>
                       Send a message to the athlete regarding "{feedbackGoal?.title}".
                   </DialogDescription>
               </DialogHeader>
               <div className="space-y-4 pt-2">
                   <Textarea 
                        placeholder="e.g. Great progress! Focus on keeping your form steady..." 
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        className="min-h-[100px]"
                   />
                   <DialogFooter>
                       <Button variant="outline" onClick={() => setFeedbackGoal(null)}>Cancel</Button>
                       <Button onClick={sendFeedback} disabled={!feedbackText.trim() || isSendingFeedback}>
                           {isSendingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Send Feedback
                       </Button>
                   </DialogFooter>
               </div>
           </DialogContent>
       </Dialog>
    </div>
  );
}

// ==========================================
// SHARED COMPONENTS
// ==========================================

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
    
    // Priority Colors
    const priorityColor = {
        low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        urgent: 'bg-red-500/10 text-red-500 border-red-500/20'
    }[goal.priority || 'medium'];

    return (
        <Card className={`p-5 flex flex-col transition-all duration-300 ${isCompleted 
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(goal.id || goal.goalId!)}>
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

                    {/* Coach Actions */}
                    {readOnly && onFeedback && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onFeedback}>
                            <MessageSquare className="h-3 w-3 mr-1" /> Feedback
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
