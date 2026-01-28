'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { TrainingPlan } from '@/lib/types';
import { 
  Calendar, 
  Loader2, 
  RefreshCw,
  Dumbbell,
  CheckCircle,
  Circle,
  Target
} from 'lucide-react';

export default function TrainingPlanPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getTrainingPlan(user.id);
        setPlan(data);
      } catch (err) {
        console.error('Error fetching training plan:', err);
        // Not an error if no plan exists
        setPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPlan();
    }
  }, [user]);

  const handleGeneratePlan = async () => {
    if (!user) return;

    setGenerating(true);
    setError(null);

    try {
      const newPlan = await api.generateTrainingPlan(user.id);
      setPlan(newPlan);
    } catch (err) {
      console.error('Error generating plan:', err);
      setError('Failed to generate training plan. Please try again.');
    } finally {
      setGenerating(false);
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

  // Calculate overall completion
  const totalWorkouts = plan?.weeks?.reduce((acc, week) => acc + (week.workouts?.length || 0), 0) || 0;
  const completedWorkouts = plan?.weeks?.reduce((acc, week) => 
    acc + (week.workouts?.filter(w => w.completed)?.length || 0), 0) || 0;
  const overallProgress = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Training Plan</h1>
            <p className="text-muted-foreground mt-1">
              Your personalized workout schedule
            </p>
          </div>
          <Button 
            onClick={handleGeneratePlan} 
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {plan ? 'Regenerate Plan' : 'Generate Plan'}
              </>
            )}
          </Button>
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
            <span className="ml-2 text-muted-foreground">Loading training plan...</span>
          </div>
        ) : plan ? (
          <>
            {/* Plan Overview */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                  {plan.status}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{plan.weeks?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Weeks</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Dumbbell className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{totalWorkouts}</p>
                  <p className="text-sm text-muted-foreground">Workouts</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{overallProgress}%</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
            </Card>

            {/* Weekly Schedule */}
            {plan.weeks && plan.weeks.map((week, weekIndex) => (
              <Card key={weekIndex} className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Week {week.weekNumber}
                  {week.focus && (
                    <Badge variant="outline" className="ml-2">{week.focus}</Badge>
                  )}
                </h3>
                <div className="space-y-4">
                  {week.workouts && week.workouts.map((workout, workoutIndex) => (
                    <div 
                      key={workout.id || workoutIndex}
                      className={`p-4 rounded-lg border ${workout.completed ? 'bg-success/5 border-success/30' : 'bg-muted/50 border-border'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {workout.completed ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{workout.day}</span>
                        </div>
                        {workout.notes && (
                          <span className="text-sm text-muted-foreground">{workout.notes}</span>
                        )}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {workout.exercises && workout.exercises.map((exercise, exIndex) => (
                          <div 
                            key={exIndex}
                            className="p-3 rounded-md bg-background border border-border/50"
                          >
                            <p className="font-medium text-foreground capitalize">
                              {exercise.name.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {exercise.sets} sets × {exercise.reps} reps
                              {exercise.weight && ` @ ${exercise.weight}kg`}
                            </p>
                            {exercise.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        ) : (
          <Card className="p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Training Plan</h3>
            <p className="text-muted-foreground mb-4">
              Generate a personalized training plan based on your performance data.
            </p>
            <Button onClick={handleGeneratePlan} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Training Plan'
              )}
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
