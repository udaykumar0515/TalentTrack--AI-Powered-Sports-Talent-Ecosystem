'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Goal } from '@/lib/types';
import { 
  Target, 
  Plus, 
  Loader2, 
  CheckCircle, 
  Clock,
  Trash2,
  Edit
} from 'lucide-react';

export default function GoalsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New goal form state
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: 100,
    unit: 'sessions',
    deadline: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getGoals(user.id);
        setGoals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching goals:', err);
        setError('Failed to load goals.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchGoals();
    }
  }, [user]);

  const handleCreateGoal = async () => {
    if (!user || !newGoal.title) return;

    setIsCreating(true);
    try {
      const created = await api.createGoal({
        userId: user.id,
        title: newGoal.title,
        description: newGoal.description,
        target: newGoal.target,
        current: 0,
        unit: newGoal.unit,
        deadline: newGoal.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      setGoals([...goals, created]);
      setDialogOpen(false);
      setNewGoal({ title: '', description: '', target: 100, unit: 'sessions', deadline: '' });
    } catch (err) {
      console.error('Error creating goal:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProgress = async (goal: Goal, newCurrent: number) => {
    if (!user) return;
    
    const goalId = goal.id || goal.goalId;
    if (!goalId) return;

    try {
      const status = newCurrent >= goal.target ? 'completed' : 'active';
      await api.updateGoal(user.id, goalId, { current: newCurrent, status });
      setGoals(goals.map(g => 
        (g.id || g.goalId) === goalId 
          ? { ...g, current: newCurrent, status } 
          : g
      ));
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !confirm('Delete this goal?')) return;

    try {
      await api.deleteGoal(user.id, goalId);
      setGoals(goals.filter(g => (g.id || g.goalId) !== goalId));
    } catch (err) {
      console.error('Error deleting goal:', err);
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

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Goals</h1>
            <p className="text-muted-foreground mt-1">
              Set and track your fitness goals
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Goal Title</Label>
                  <Input
                    id="title"
                    value={newGoal.title}
                    onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="e.g., Complete 50 sessions"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newGoal.description}
                    onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Target</Label>
                    <Input
                      id="target"
                      type="number"
                      value={newGoal.target}
                      onChange={e => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={newGoal.unit}
                      onChange={e => setNewGoal({ ...newGoal, unit: e.target.value })}
                      placeholder="e.g., sessions, reps"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreateGoal}
                  disabled={!newGoal.title || isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Goal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading goals...</span>
          </div>
        ) : (
          <>
            {/* Active Goals */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Active Goals ({activeGoals.length})
              </h2>
              {activeGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeGoals.map((goal) => {
                    const goalId = goal.id || goal.goalId || '';
                    const progress = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;

                    return (
                      <Card key={goalId} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-foreground">{goal.title}</h3>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground">{goal.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGoal(goalId)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{goal.current} / {goal.target} {goal.unit}</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(goal.deadline).toLocaleDateString()}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateProgress(goal, goal.current + 1)}
                          >
                            +1 Progress
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active goals. Create one to get started!</p>
                </Card>
              )}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Completed Goals ({completedGoals.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {completedGoals.map((goal) => {
                    const goalId = goal.id || goal.goalId || '';
                    return (
                      <Card key={goalId} className="p-6 bg-success/5 border-success/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              {goal.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {goal.target} {goal.unit} completed!
                            </p>
                          </div>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
