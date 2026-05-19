'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  Loader2,
  ClipboardList,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  Pause,
  Edit,
  Trash2,
  User,
  Copy,
} from 'lucide-react';

export default function DevelopmentPlansPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    goals: '',
    duration_weeks: '12',
    phase: 'foundation',
  });
  const [weeklySchedule, setWeeklySchedule] = useState<{ weekNumber: number; focus: string; tasks: string[] }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Auto-update duration if the coach builds more weeks than the specified duration
  useEffect(() => {
    const currentDuration = parseInt(newPlan.duration_weeks, 10) || 0;
    if (weeklySchedule.length > currentDuration) {
      setNewPlan(prev => ({ ...prev, duration_weeks: String(weeklySchedule.length) }));
    }
  }, [weeklySchedule.length, newPlan.duration_weeks]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'coach') return;
      setIsLoading(true);
      setError(null);
      try {
        const [plansData, athletesData] = await Promise.all([
          api.getCoachPlans(user.id).catch(() => []),
          api.getAthletes().catch(() => []),
        ]);
        // Backend wraps in {plans: [...]}, handle both formats
        const plansArray = Array.isArray(plansData) ? plansData : (plansData as any)?.plans || [];
        setPlans(plansArray);
        setAthletes(Array.isArray(athletesData) ? athletesData : []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load development plans.');
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

  if (user.role === 'athlete') {
    router.push('/training-plan');
    return null;
  }

  const resetForm = () => {
    setSelectedAthlete('');
    setEditingPlan(null);
    setNewPlan({ title: '', description: '', goals: '', duration_weeks: '12', phase: 'foundation' });
    setWeeklySchedule([]);
    setError(null);
  };

  const handleCreatePlan = async () => {
    if (!selectedAthlete || !newPlan.title || !newPlan.description) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    try {
      const athlete = athletes.find((a) => a.id === selectedAthlete);
      const requestPayload = {
        coach_id: user.id,
        athlete_id: selectedAthlete,
        athlete_name: athlete?.name || athlete?.username || 'Unknown',
        title: newPlan.title,
        description: newPlan.description,
        objectives: newPlan.goals.split('\n').filter((g) => g.trim()),
        phase: newPlan.phase,
        duration_weeks: parseInt(newPlan.duration_weeks, 10),
        training_schedule: {
          weeks: weeklySchedule.map((w, idx) => ({
            weekNumber: idx + 1,
            focus: w.focus || `Week ${idx + 1}`,
            days: [
              {
                dayName: "Weekly Tasks",
                focus: "Goals",
                exercises: w.tasks.filter(t => t.trim()).map(task => ({
                  name: task
                }))
              }
            ]
          }))
        }
      };

      if (editingPlan) {
        await api.updateLongTermPlan(user.id, editingPlan.id, requestPayload);
      } else {
        await api.createLongTermPlan(requestPayload);
      }

      setIsCreateDialogOpen(false);
      resetForm();

      // Refresh plans
      const updatedPlans = await api.getCoachPlans(user.id);
      const updatedArray = Array.isArray(updatedPlans) ? updatedPlans : (updatedPlans as any)?.plans || [];
      setPlans(updatedArray);
    } catch (err) {
      console.error('Error saving plan:', err);
      setError(editingPlan ? 'Failed to update development plan.' : 'Failed to create development plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      active: 'bg-green-500/10 text-green-500 border-green-500/20',
      paused: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };
    const icons: Record<string, any> = {
      draft: <Edit className="h-3 w-3" />,
      active: <CheckCircle className="h-3 w-3" />,
      paused: <Pause className="h-3 w-3" />,
      completed: <CheckCircle className="h-3 w-3" />,
    };
    return (
      <Badge variant="outline" className={`capitalize flex items-center gap-1 ${colors[status] || colors.draft}`}>
        {icons[status] || icons.draft}
        {status}
      </Badge>
    );
  };

  const phaseBadge = (phase: string) => {
    const colors: Record<string, string> = {
      foundation: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      development: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      advancement: 'bg-green-500/10 text-green-500 border-green-500/20',
      mastery: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      specialization: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
      <Badge variant="outline" className={`capitalize ${colors[phase] || colors.foundation}`}>
        {phase}
      </Badge>
    );
  };

  const stats = {
    total: plans.length,
    active: plans.filter((p) => p.status === 'active').length,
    draft: plans.filter((p) => p.status === 'draft').length,
    completed: plans.filter((p) => p.status === 'completed').length,
  };

  const openEditDialog = (plan: any) => {
    setEditingPlan(plan);
    setSelectedAthlete(plan.athlete_id || plan.athleteId || '');
    setNewPlan({
      title: plan.title || '',
      description: plan.description || '',
      goals: Array.isArray(plan.objectives) ? plan.objectives.join('\n') : (plan.goals || ''),
      duration_weeks: plan.duration_weeks ? String(plan.duration_weeks) : '12',
      phase: plan.phase || 'foundation',
    });
    
    // Parse existing schedule
    let parsedSchedule: any[] = [];
    if (plan.training_schedule && Array.isArray(plan.training_schedule.weeks)) {
       parsedSchedule = plan.training_schedule.weeks.map((w: any) => ({
           weekNumber: w.weekNumber,
           focus: w.focus || '',
           tasks: w.days?.[0]?.exercises?.map((e: any) => e.name) || []
       }));
    }
    setWeeklySchedule(parsedSchedule);
    setIsCreateDialogOpen(true);
  };

  const addWeek = () => {
      setWeeklySchedule([...weeklySchedule, { weekNumber: weeklySchedule.length + 1, focus: '', tasks: [''] }]);
  };

  const duplicateWeek = (index: number) => {
      const weekToDuplicate = weeklySchedule[index];
      const newSchedule = [
          ...weeklySchedule,
          {
              weekNumber: weeklySchedule.length + 1,
              focus: weekToDuplicate.focus,
              tasks: [...weekToDuplicate.tasks]
          }
      ];
      setWeeklySchedule(newSchedule);
  };

  const removeWeek = (index: number) => {
      const newSchedule = [...weeklySchedule];
      newSchedule.splice(index, 1);
      // Reassign week numbers
      newSchedule.forEach((w, i) => w.weekNumber = i + 1);
      setWeeklySchedule(newSchedule);
  };

  const addTask = (weekIndex: number) => {
      const newSchedule = [...weeklySchedule];
      const newTasks = [...newSchedule[weekIndex].tasks, ''];
      newSchedule[weekIndex] = { ...newSchedule[weekIndex], tasks: newTasks };
      setWeeklySchedule(newSchedule);
  };

  const updateTask = (weekIndex: number, taskIndex: number, value: string) => {
      const newSchedule = [...weeklySchedule];
      const newTasks = [...newSchedule[weekIndex].tasks];
      newTasks[taskIndex] = value;
      newSchedule[weekIndex] = { ...newSchedule[weekIndex], tasks: newTasks };
      setWeeklySchedule(newSchedule);
  };

  const removeTask = (weekIndex: number, taskIndex: number) => {
      const newSchedule = [...weeklySchedule];
      const newTasks = [...newSchedule[weekIndex].tasks];
      newTasks.splice(taskIndex, 1);
      newSchedule[weekIndex] = { ...newSchedule[weekIndex], tasks: newTasks };
      setWeeklySchedule(newSchedule);
  };

  const handleDeletePlan = async (plan: any) => {
    if (!plan || !plan.id) return;
    const confirmed = window.confirm(`Delete plan '${plan.title}' for ${plan.athlete_name || plan.athleteName || 'this athlete'}?`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await api.deleteLongTermPlan(user.id, plan.id);
      setPlans((currentPlans) => currentPlans.filter((p) => p.id !== plan.id));
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete development plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Development Plans
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage long-term athlete development plans
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Edit Development Plan' : 'Create Development Plan'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Athlete</label>
                  <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an athlete" />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.name || athlete.username || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newPlan.title}
                    onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                    placeholder="e.g., 12-Week Strength Foundation"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    placeholder="Describe the overall focus of this plan..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Goals (one per line)</label>
                  <Textarea
                    value={newPlan.goals}
                    onChange={(e) => setNewPlan({ ...newPlan, goals: e.target.value })}
                    placeholder="Improve squat form by 10%&#10;Increase upper body strength&#10;Build endurance"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Duration (weeks)</label>
                    <Input
                      type="number"
                      value={newPlan.duration_weeks}
                      onChange={(e) => setNewPlan({ ...newPlan, duration_weeks: e.target.value })}
                      placeholder="12"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                      Total plan length. The schedule built below will repeat to fill this duration.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Starting Phase</label>
                    <Select value={newPlan.phase} onValueChange={(v) => setNewPlan({ ...newPlan, phase: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="foundation">Foundation</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="advancement">Advancement</SelectItem>
                        <SelectItem value="mastery">Mastery</SelectItem>
                        <SelectItem value="specialization">Specialization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Weekly Schedule</h3>
                    <Button type="button" size="sm" onClick={addWeek} variant="outline">
                      <Plus className="h-4 w-4 mr-2" /> Add Week
                    </Button>
                  </div>
                  
                  <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2">
                    {weeklySchedule.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center italic">No weeks added yet. Click "Add Week" to build the schedule.</p>
                    )}
                    {weeklySchedule.map((week, wIdx) => (
                      <Card key={wIdx} className="border-primary/20">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between bg-primary/5">
                          <CardTitle className="text-base flex items-center gap-2">
                            Week {week.weekNumber}
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => removeWeek(wIdx)} className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Remove Week">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <Input 
                                placeholder="Week Focus (e.g., Strength Building)" 
                                value={week.focus}
                                onChange={(e) => {
                                  const newSchedule = [...weeklySchedule];
                                  newSchedule[wIdx].focus = e.target.value;
                                  setWeeklySchedule(newSchedule);
                                }}
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Tasks / Goals</label>
                            {week.tasks.map((task, tIdx) => (
                              <div key={tIdx} className="flex gap-2 items-center">
                                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                <Input 
                                  value={task} 
                                  onChange={(e) => updateTask(wIdx, tIdx, e.target.value)} 
                                  placeholder="e.g. Complete 3 sets of 30 pushups"
                                />
                                <Button variant="ghost" size="sm" onClick={() => removeTask(wIdx, tIdx)} className="shrink-0 h-8 w-8 p-0">
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2 pt-2">
                                <Button type="button" size="sm" variant="secondary" onClick={() => addTask(wIdx)} className="flex-1">
                                  <Plus className="h-4 w-4 mr-2" /> Add Task
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => duplicateWeek(wIdx)} className="flex-1 border-dashed">
                                  <Copy className="h-4 w-4 mr-2" /> Duplicate Week
                                </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePlan} disabled={isSaving}>
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Plans</CardTitle>
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
              <div className="text-2xl font-bold text-green-500">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold mb-2">No Development Plans Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first long-term development plan for an athlete.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {statusBadge(plan.status)}
                        {phaseBadge(plan.phase)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(plan.createdAt || plan.created_at || '').toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">{plan.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{plan.athlete_name || plan.athleteName || 'Unknown Athlete'}</span>
                        {plan.duration_weeks && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{plan.duration_weeks} weeks</span>
                          </>
                        )}
                      </div>

                      {plan.objectives && plan.objectives.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Objectives:</p>
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {plan.objectives.map((obj: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {plan.progress !== undefined && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{Math.round(plan.progress)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${plan.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(plan)} disabled={isSaving}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeletePlan(plan)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
