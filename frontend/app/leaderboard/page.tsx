'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Loader2, Trophy, Medal, Crown, Dumbbell, Activity, Target, Flame } from 'lucide-react';

const EXERCISES = [
  { value: 'squat', label: 'Squats' },
  { value: 'pushups', label: 'Push-ups' },
  { value: 'jumping_jacks', label: 'Jumping Jacks' },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [exercise, setExercise] = useState('squat');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [standards, setStandards] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const coachId = user.role === 'coach' ? user.id : undefined;
        const [lbResponse, std] = await Promise.all([
          api.getBenchmarkLeaderboard(exercise, coachId).catch(() => ({ leaderboard: [] })),
          api.getExerciseStandards(exercise).catch(() => null),
        ]);
        const lb = (lbResponse as any)?.leaderboard ?? lbResponse;
        setLeaderboard(Array.isArray(lb) ? lb : []);
        setStandards(std);
      } catch (err) { console.error('Error:', err); }
      finally { setIsLoading(false); }
    };
    if (user) fetchData();
  }, [user, exercise]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const formColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy className="h-8 w-8 text-yellow-500" />Leaderboard</h1>
            <p className="text-muted-foreground mt-1">{user.role === 'coach' ? 'Your team rankings' : 'See how you rank against other athletes'}</p>
          </div>
          <Select value={exercise} onValueChange={setExercise}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>{EXERCISES.map(ex => <SelectItem key={ex.value} value={ex.value}><Dumbbell className="h-4 w-4 inline mr-2" />{ex.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Score Formula Explanation */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Target className="h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Score formula:</strong> 40% Avg Form + 25% Avg Performance + 20% Consistency (sessions) + 15% Best Session
              </span>
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2 text-muted-foreground">Loading...</span></div>
        ) : leaderboard.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold mb-2">No Rankings Yet</h3>
            <p className="text-muted-foreground">No sessions recorded for this exercise yet.</p>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Rank</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Athlete</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Score</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Sessions</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Total Reps</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Avg Form</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={`${entry.athlete_id}-${i}`} className={`border-b border-border/30 transition-colors ${entry.athlete_id === user.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                      <td className="p-4">{rankIcon(entry.rank)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{(entry.athlete_name || 'A').charAt(0).toUpperCase()}</div>
                          <span className={`font-medium ${entry.athlete_id === user.id ? 'text-primary' : ''}`}>
                            {entry.athlete_name || 'Unknown'}{entry.athlete_id === user.id && <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-lg">{entry.performance_score}</td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          {entry.session_count || 1}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium">{entry.total_reps ?? entry.reps}</td>
                      <td className="p-4 text-right">
                        <span className={formColor(entry.avg_form_score ?? entry.form_score)}>
                          {entry.avg_form_score ?? entry.form_score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
