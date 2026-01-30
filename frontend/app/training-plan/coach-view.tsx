'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Save, User as UserIcon, Calendar, Dumbbell, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface CoachViewProps {
  userId: string;
}

export function CoachView({ userId }: CoachViewProps) {
  const { toast } = useToast();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ai_plan');
  
  // Custom Plan Builder State
  const [planTitle, setPlanTitle] = useState('New Training Block');
  const [planDescription, setPlanDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [weeks, setWeeks] = useState<any[]>([
    { weekNumber: 1, focus: 'Introduction', days: [
      { dayName: 'Monday', focus: 'Upper Body', exercises: [] }
    ]}
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Existing Plans
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [assignedPlan, setAssignedPlan] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'read_only'>('edit');

  useEffect(() => {
     if (assignedPlan) {
         setViewMode('read_only');
     } else {
         setViewMode('edit');
     }
  }, [assignedPlan]);

  useEffect(() => {
    fetchAthletes();
  }, [userId]);

  useEffect(() => {
    if (selectedAthleteId) {
      fetchAthletePlans(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  const fetchAthletes = async () => {
    try {
      const data = await api.getAthletes();
      setAthletes(data || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch athletes', err);
      setLoading(false);
    }
  };

  const fetchAthletePlans = async (athleteId: string) => {
    try {
        setAiPlan(null);
        setAssignedPlan(null);
        
        // 1. Get AI Plan
        const aiData = await api.getTrainingPlan(athleteId);
        if (aiData) setAiPlan(aiData);

        // 2. Get Assigned Plan (via LongTermPlans)
        // Ideally we check athletes.json -> currentPlanId, but let's list all plans for this athlete
        // and pick the active one.
        const plansData = await api.getAthletePlans(athleteId);
        if (plansData && plansData.length > 0) {
            // Find most recent or active
            setAssignedPlan(plansData[0]); // fallback logical
        }

    } catch (err) {
        console.error("Error fetching plans", err);
    }
  };

  const handleAddWeek = () => {
    setWeeks([...weeks, { 
      weekNumber: weeks.length + 1, 
      focus: 'Progression', 
      days: [] 
    }]);
  };

  const handleAddDay = (weekIndex: number) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex].days.push({
      dayName: 'New Day',
      focus: 'General',
      exercises: []
    });
    setWeeks(newWeeks);
  };

  const handleAddExercise = (weekIndex: number, dayIndex: number) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex].days[dayIndex].exercises.push({
      name: 'New Exercise',
      sets: 3,
      reps: '10',
      notes: ''
    });
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
    if (!selectedAthleteId) return;
    setIsSaving(true);

    try {
        const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
        
        // 1. Create Plan Record
        const planData = {
            coach_id: userId,
            athlete_id: selectedAthleteId,
            athlete_name: selectedAthlete?.name || selectedAthlete?.username || 'Athlete',
            title: planTitle,
            description: planDescription,
            duration_weeks: durationWeeks,
            training_schedule: { weeks }, // Store our structure inside training_schedule
            status: 'active' as 'active',
            startDate: new Date().toISOString()
        };

        const createdPlan = await api.createLongTermPlan(planData);

        if (createdPlan && createdPlan.id) {
            // 2. Assign to Athlete
            await api.assignPlan(selectedAthleteId, createdPlan.id);
            
            toast({
                title: "Plan Assigned!",
                description: `${planTitle} has been assigned to ${planData.athlete_name}.`
            });
            
            setAssignedPlan(createdPlan);
            setActiveTab('assigned');
        }

    } catch (err) {
        console.error("Error creating plan", err);
        toast({
            title: "Error",
            description: "Failed to create plan.",
            variant: "destructive"
        });
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // --- VIEW: SELECT ATHLETE ---
  if (!selectedAthleteId) {
    return (
      <div className="space-y-6">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Athlete Management</h2>
           <p className="text-muted-foreground">Select an athlete to manage their training program.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map(athlete => (
            <Card 
                key={athlete.id} 
                className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
                onClick={() => setSelectedAthleteId(athlete.id)}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                 <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-primary" />
                 </div>
                 <div>
                    <CardTitle>{athlete.name || athlete.username}</CardTitle>
                    <CardDescription>{athlete.sport || 'General Fitness'}</CardDescription>
                 </div>
              </CardHeader>
              <CardFooter className="bg-muted/50 p-3 px-6">
                <div className="flex justify-between w-full text-sm">
                    <span>Last Session: {athlete.stats?.lastSession ? new Date(athlete.stats.lastSession).toLocaleDateString() : 'None'}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardFooter>
            </Card>
          ))}
          {athletes.length === 0 && <p className="text-muted-foreground">No athletes found.</p>}
        </div>
      </div>
    );
  }

  // --- VIEW: PLAN EDITOR / MANAGER ---
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
           <Button variant="outline" size="sm" onClick={() => setSelectedAthleteId(null)}>
              ← Back to Athletes
           </Button>
           <h2 className="text-2xl font-bold">{selectedAthlete?.name || 'Athlete'}</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai_plan">Athena AI Plan</TabsTrigger>
                <TabsTrigger value="assigned">Coach Custom Plan</TabsTrigger>
            </TabsList>

            <TabsContent value="ai_plan" className="space-y-4">
                {aiPlan ? (
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between">
                                <div>
                                    <CardTitle>Current AI Plan: {aiPlan.title}</CardTitle>
                                    <CardDescription>{aiPlan.description}</CardDescription>
                                </div>
                                <Badge variant="secondary">Read Only</Badge>
                             </div>
                        </CardHeader>
                        <CardContent>
                             {/* Minimal View of AI Plan */}
                             <div className="space-y-4">
                                {(aiPlan.weekly_schedule || []).map((day: any, i: number) => (
                                    <div key={i} className="border p-3 rounded-md">
                                        <div className="font-semibold">{day.day} - {day.focus}</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {day.exercises?.length} exercises
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="text-center p-12 border rounded-lg bg-muted/10">
                        <p className="text-muted-foreground">No AI Plan generated yet.</p>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="assigned" className="space-y-6">
                {assignedPlan && viewMode === 'read_only' ? (
                    <Card className="border-primary/20 bg-card">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="default">Active Plan</Badge>
                                        <span className="text-sm text-muted-foreground ml-2">Assigned on {new Date(assignedPlan.created_at || assignedPlan.startDate || new Date()).toLocaleDateString()}</span>
                                    </div>
                                    <CardTitle className="text-2xl">{assignedPlan.title}</CardTitle>
                                    <CardDescription className="text-base mt-2">{assignedPlan.description}</CardDescription>
                                </div>
                                <Button onClick={() => {
                                    setPlanTitle('New Training Block');
                                    setPlanDescription('');
                                    setWeeks([{ weekNumber: 1, focus: 'Introduction', days: [] }]);
                                    setViewMode('edit'); 
                                }} variant="outline">
                                    <Plus className="mr-2 h-4 w-4" /> Assign New Plan
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-6">
                                {(assignedPlan.training_schedule?.weeks || []).map((week: any, wIdx: number) => (
                                    <div key={wIdx} className="border rounded-lg p-4 bg-muted/10">
                                        <h4 className="font-semibold text-lg mb-3">Week {week.weekNumber}: {week.focus}</h4>
                                        <div className="space-y-3">
                                            {week.days.map((day: any, dIdx: number) => (
                                                <div key={dIdx} className="bg-background border rounded-md p-3">
                                                    <div className="font-medium text-primary mb-2">{day.dayName} - {day.focus}</div>
                                                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                                                        {day.exercises.map((ex: any, eIdx: number) => (
                                                            <li key={eIdx}>
                                                                {ex.name} ({ex.sets} x {ex.reps}) 
                                                                {ex.notes && <span className="italic ml-2">- {ex.notes}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                       <div className="flex justify-between items-center mb-2">
                           <div>
                               <h3 className="text-lg font-semibold">New Training Block</h3>
                               <p className="text-sm text-muted-foreground">Design a custom plan for {selectedAthlete?.name}</p>
                           </div>
                           {assignedPlan && (
                               <Button variant="ghost" size="sm" onClick={() => setViewMode('read_only')}>
                                   Cancel & View Active Plan
                               </Button>
                           )}
                       </div>

                       <Card className="border-primary/20 bg-card">
                          <CardHeader>
                             <CardTitle>Plan Design</CardTitle>
                             <CardDescription>Create a custom block for this athlete.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                      <Label>Plan Title</Label>
                                      <Input value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="e.g. Strength Block A" />
                                   </div>
                                   <div className="space-y-2">
                                      <Label>Duration (Weeks)</Label>
                                      <Select value={durationWeeks.toString()} onValueChange={v => setDurationWeeks(parseInt(v))}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                              {[2,4,6,8,12].map(w => <SelectItem key={w} value={w.toString()}>{w} Weeks</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                   </div>
                              </div>
                              <div className="space-y-2">
                                  <Label>Description / Notes</Label>
                                  <Textarea value={planDescription} onChange={e => setPlanDescription(e.target.value)} placeholder="Main focus for this block..." />
                              </div>
                          </CardContent>
                       </Card>

                       <div className="space-y-4">
                           <div className="flex justify-between items-center">
                               <h3 className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" /> Schedule Builder</h3>
                               <Button onClick={handleAddWeek} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Week</Button>
                           </div>
    
                           <Accordion type="multiple" className="space-y-4">
                               {weeks.map((week, wIdx) => (
                                   <AccordionItem key={wIdx} value={`week-${wIdx}`} className="border rounded-lg px-4 bg-background">
                                       <AccordionTrigger className="hover:no-underline">
                                           <div className="flex gap-4 items-center w-full text-left">
                                               <span className="font-bold">Week {week.weekNumber}</span>
                                               <Input 
                                                   className="h-8 w-48"
                                                   value={week.focus} 
                                                   onChange={e => updateWeek(wIdx, 'focus', e.target.value)}
                                                   onClick={e => e.stopPropagation()} 
                                               />
                                           </div>
                                       </AccordionTrigger>
                                       <AccordionContent className="pt-4 space-y-4">
                                           {week.days.map((day: any, dIdx: number) => (
                                               <Card key={dIdx} className="bg-muted/30">
                                                   <CardContent className="p-4 space-y-4">
                                                       <div className="flex gap-3">
                                                           <Input 
                                                                className="w-32 font-medium"
                                                                value={day.dayName}
                                                                onChange={e => updateDay(wIdx, dIdx, 'dayName', e.target.value)}
                                                                placeholder="Day Name"
                                                           />
                                                           <Input 
                                                                className="flex-1"
                                                                value={day.focus}
                                                                onChange={e => updateDay(wIdx, dIdx, 'focus', e.target.value)}
                                                                placeholder="Focus (e.g. Upper Body)"
                                                           />
                                                           <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                       </div>
                                                       
                                                       {/* Exercises */}
                                                       <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                                                           {day.exercises.map((ex: any, eIdx: number) => (
                                                               <div key={eIdx} className="grid grid-cols-12 gap-2 items-center">
                                                                   <div className="col-span-4">
                                                                       <Input placeholder="Exercise Name" value={ex.name} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'name', e.target.value)} />
                                                                   </div>
                                                                   <div className="col-span-2">
                                                                       <Input placeholder="Sets" type="number" value={ex.sets} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'sets', parseInt(e.target.value))} />
                                                                   </div>
                                                                   <div className="col-span-2">
                                                                       <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'reps', e.target.value)} />
                                                                   </div>
                                                                   <div className="col-span-3">
                                                                       <Input placeholder="Notes/Cues" value={ex.notes} onChange={e => updateExercise(wIdx, dIdx, eIdx, 'notes', e.target.value)} />
                                                                   </div>
                                                                   <div className="col-span-1">
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                                                   </div>
                                                               </div>
                                                           ))}
                                                           <Button variant="link" size="sm" onClick={() => handleAddExercise(wIdx, dIdx)}>+ Add Exercise</Button>
                                                       </div>
                                                   </CardContent>
                                               </Card>
                                           ))}
                                           <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => handleAddDay(wIdx)}>+ Add Workout Day</Button>
                                       </AccordionContent>
                                   </AccordionItem>
                               ))}
                           </Accordion>
                       </div>
    
                       <div className="flex justify-end pt-6 border-t">
                           <Button size="lg" onClick={handleSaveAndAssign} disabled={isSaving}>
                               {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                               Save & Assign Plan
                           </Button>
                       </div>
                    </div>
                )}
            </TabsContent>

        </Tabs>
    </div>
  );
}
