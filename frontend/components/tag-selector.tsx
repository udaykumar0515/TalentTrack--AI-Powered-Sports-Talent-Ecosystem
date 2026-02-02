'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Loader2, Target, Activity, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import type { Session, Goal, TrainingPlan } from '@/lib/types';

interface TagSelectorProps {
  userId: string;
  role: 'athlete' | 'coach';
  onSelect: (tag: { type: 'session' | 'goal' | 'plan'; id: string; title: string }) => void;
  partnerId?: string; // For coaches to fetch their athlete's data
}

export function TagSelector({ userId, role, onSelect, partnerId }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const targetAthleteId = role === 'athlete' ? userId : partnerId;
      if (!targetAthleteId) return;

      const [sessionsData, goalsData, aiPlan, coachPlan] = await Promise.all([
        api.getSessions({ athleteId: targetAthleteId, limit: 10 }),
        api.getGoals(targetAthleteId, 'active'),
        api.getTrainingPlan(targetAthleteId, 'ai').catch(() => null),
        api.getTrainingPlan(targetAthleteId, 'coach').catch(() => null)
      ]);

      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      
      const availablePlans: TrainingPlan[] = [];
      if (coachPlan) availablePlans.push(coachPlan);
      if (aiPlan) availablePlans.push(aiPlan);
      
      // Deduplicate by ID just in case
      const uniquePlans = Array.from(new Map(availablePlans.map(p => [p.id, p])).values());
      
      setPlans(uniquePlans); 

    } catch (err) {
      console.error('Failed to fetch tag data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any, type: 'session' | 'goal' | 'plan') => {
    let title = '';
    // Use timestamp as fallback for date AND include TIME
    if (type === 'session') {
        const dateObj = new Date(item.timestamp || item.date);
        title = `${item.exercise} - ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (type === 'goal') {
        // "Title (Type) - Deadline: Date"
        title = `${item.title} (${item.type || 'General'})`;
    }
    if (type === 'plan') {
         title = item.title;
    }

    onSelect({ type, id: item.id, title });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Paperclip className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Attach to Message</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="plans">Plan</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="mt-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {sessions?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent sessions.</p>
                  ) : (
                    sessions.map((session, index) => (
                      <Button
                        key={`${session.id}-${index}`}
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleSelect(session, 'session')}
                      >
                        <Activity className="h-4 w-4 mr-2 text-blue-500" />
                        <div className="flex flex-col items-start truncate">
                          <span className="font-medium capitalize">{session.exercise}</span>
                          <span className="text-xs text-muted-foreground">
                            {session.timestamp || session.date ? new Date(session.timestamp || session.date!).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="goals" className="mt-4">
               <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {goals?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No active goals.</p>
                  ) : (
                    goals.map(goal => (
                      <Button
                        key={goal.id}
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleSelect(goal, 'goal')}
                      >
                        <Target className="h-4 w-4 mr-2 text-green-500" />
                        <div className="flex flex-col items-start truncate">
                          <span className="font-medium">{goal.title}</span>
                          <span className="text-xs text-muted-foreground">Due: {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No Deadline'}</span>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="plans" className="mt-4">
               <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {plans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No active plan.</p>
                  ) : (
                    plans.map(plan => (
                        <Button
                            key={plan.id}
                            variant="outline"
                            className="w-full justify-start h-auto py-3"
                            onClick={() => handleSelect(plan, 'plan')}
                        >
                            <FileText className="h-4 w-4 mr-2 text-purple-500" />
                            <div className="flex flex-col items-start truncate">
                            <span className="font-medium">{plan.title}</span>
                            <span className="text-xs text-muted-foreground">
                                {plan.duration || (plan.weekly_schedule?.length ? `${plan.weekly_schedule.length} Weeks` : 'Duration unknown')}
                            </span>
                            </div>
                        </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
