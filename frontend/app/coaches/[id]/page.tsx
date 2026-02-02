'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Coach, Athlete } from '@/lib/types';
import { 
  Users, 
  User as UserIcon, 
  Mail,
  Loader2,
  CheckCircle,
  TrendingUp,
  Target,
  ArrowLeft,
  Award,
  Calendar
} from 'lucide-react';
import { RequestCoachDialog } from '@/components/request-coach-dialog';
import { StatCard } from '@/components/stat-card';

export default function CoachDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCoachDetails = async () => {
      if (!user) return;
      
      const coachId = params.id as string;
      if (!coachId) return;

      setIsLoading(true);
      try {
        const [allCoaches, requests] = await Promise.all([
             api.getCoaches(),
             api.getAthleteRequests(user.id)
        ]);

        const foundCoach = allCoaches.find(c => c.id === coachId);
        
        if (foundCoach) {
           setCoach(foundCoach);
           setStats(foundCoach);
        } else {
           setError('Coach not found');
        }

        const pendingIds = (Array.isArray(requests) ? requests : [])
          .filter(r => r.status === 'pending')
          .map(r => r.newCoachId);
        setPendingRequests(pendingIds);

      } catch (err) {
        console.error('Error loading coach:', err);
        setError('Failed to load coach details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoachDetails();
  }, [user, params.id]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !coach || !user) {
    if (!user) return null; // Handled by useEffect redirect
    return (
      <AppLayout user={user}>
        <div className="p-8 text-center">
            <h2 className="text-xl text-destructive mb-4">{error || 'Coach not found'}</h2>
            <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
            </Button>
        </div>
      </AppLayout>
    );
  }

  const athlete = user as Athlete;
  const isCurrentCoach = athlete.coachId === coach.id;
  const isPending = coach ? pendingRequests.includes(coach.id) : false;

  return (
    <AppLayout user={user as any}>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Navigation */}
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Coaches
        </Button>

        {/* Profile Header Card */}
        <Card className="p-8 border-none bg-gradient-to-br from-card to-accent/5 shadow-lg">
           <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar Section */}
              <div className="flex-shrink-0">
                  <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-xl">
                      <span className="text-4xl font-bold text-primary">
                          {(coach.name || coach.username || 'C').charAt(0).toUpperCase()}
                      </span>
                  </div>
              </div>

              {/* Info Section */}
              <div className="flex-grow space-y-4">
                  <div className="flex items-start justify-between">
                      <div>
                          <h1 className="text-3xl font-bold text-foreground mb-2">{coach.name || coach.username}</h1>
                          <div className="flex flex-wrap gap-3 mb-4">
                              <Badge variant="secondary" className="text-sm px-3 py-1">
                                  {coach.specialization || 'General Coach'}
                              </Badge>
                              {isCurrentCoach && <Badge className="bg-primary text-primary-foreground">Your Coach</Badge>}
                          </div>
                      </div>
                      
                       {!isCurrentCoach && (
                          <div className="flex-shrink-0">
                             {isPending ? (
                                 <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 flex items-center gap-1.5 px-4 py-2 text-base font-medium">
                                   <CheckCircle className="h-4 w-4" /> Request Sent
                                 </Badge>
                             ) : (
                                 <RequestCoachDialog 
                                     coach={coach} 
                                     isPending={false} // Always false here because if true, we show Badge above
                                     onSuccess={() => {
                                         // Optimistic Update: Immediately add to pending
                                         if (coach?.id) {
                                           setPendingRequests(prev => {
                                               if (prev.includes(coach.id)) return prev;
                                               return [...prev, coach.id];
                                           });
                                         }
                                     }}
                                 />
                             )}
                          </div>
                       )}
                  </div>

                  <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                      {coach.about || coach.bio || ""}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="flex items-center gap-3 text-muted-foreground p-3 rounded-lg bg-background/50">
                          <Mail className="h-5 w-5 text-primary" />
                          <span>{coach.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground p-3 rounded-lg bg-background/50">
                           <UserIcon className="h-5 w-5 text-primary" />
                           <span>{coach.age ? `${coach.age} Years Old` : 'Age N/A'} • {coach.gender || 'Gender N/A'}</span>
                      </div>
                  </div>
              </div>
           </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Athletes Trained" 
                value={coach.athleteCount || 0} 
                icon={Users}
                subtitle="Active Team Size"
            />
            <StatCard 
                title="Experience" 
                value={coach.totalSessionsSupervised || 0} 
                icon={Calendar} 
                subtitle="Sessions Supervised"
            />
             <StatCard 
                title="Performance" 
                value={`${coach.teamAvgPerformance || 0}`} 
                icon={TrendingUp} 
                subtitle="Avg Team Score"
            />
             <StatCard 
                title="Success Rate" 
                value={coach.goalsAchieved || 0} 
                icon={Award} 
                subtitle="Goals Achieved"
            />
        </div>

      </div>
    </AppLayout>
  );
}
