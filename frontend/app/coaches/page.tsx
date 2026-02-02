'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Coach, Athlete } from '@/lib/types';
import { 
  UserPlus,
  ArrowRight,
  Users,
  User as UserIcon,
  Mail,
  Loader2,
  CheckCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { RequestCoachDialog } from '@/components/request-coach-dialog';
import { LeaveCoachDialog } from '@/components/leave-coach-dialog';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CoachesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]); 
  const [rejectedRequests, setRejectedRequests] = useState<string[]>([]);
  const [freshProfile, setFreshProfile] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch Basic Data
        const [coachesData, requestsData] = await Promise.all([
             api.getCoaches(),
             user.role === 'athlete' ? api.getAthleteRequests(user.id).catch(() => ({ requests: [] })) : Promise.resolve({ requests: [] })
        ]);
        
        const allCoaches = Array.isArray(coachesData) ? coachesData : [];
        setCoaches(allCoaches);

        // 2. Process Requests
        if (requestsData) {
             const reqs = Array.isArray(requestsData) ? requestsData : requestsData.requests || [];
             const pending = reqs.filter((r: any) => r.status === 'pending').map((r: any) => r.newCoachId);
             setPendingRequests(pending);
             const rejected = reqs.filter((r: any) => r.status === 'rejected').map((r: any) => r.newCoachId);
             setRejectedRequests(rejected);
        }

        // 3. Fetch Fresh Profile & Determine Coach
        let activeCoachId: string | null | undefined;
        if (user.role === 'athlete') {
             activeCoachId = (user as Athlete).coachId;
            try {
                const profile = await api.getAthlete(user.id);
                setFreshProfile(profile);
                if (profile && profile.coachId) activeCoachId = profile.coachId;
            } catch (e) {
                console.error("Failed to fetch fresh profile", e);
            }
        } else if (user.role === 'coach') {
             // specific logic for coach if needed, or just ignore
        }

        // 4. Set "My Coach" Object
        if (activeCoachId && activeCoachId !== 'null') {
             const myCoach = allCoaches.find((c: any) => c.id === activeCoachId);
             if (myCoach) setCurrentCoach(myCoach);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const athlete = user.role === 'athlete' ? (user as Athlete) : null;
  // Use fresh profile logic if available, otherwise fallback to context
  const resolvedCoachId = freshProfile?.coachId || athlete?.coachId;
  const hasCoach = !!(resolvedCoachId && resolvedCoachId !== 'null' && resolvedCoachId !== '');
  const coachNameDisplay = currentCoach?.name || currentCoach?.username || freshProfile?.coachName || athlete?.coachName || 'Unknown';

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Find a Coach</h1>
            <p className="text-muted-foreground mt-1">
              {hasCoach 
                ? `Your current coach: ${coachNameDisplay}`
                : 'Select a coach to guide your training journey'}
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {successMessage}
          </div>
        )}

        {/* User has a Coach - Show ONLY Current Coach */}
        {hasCoach ? (
          <div className="max-w-2xl mx-auto mt-8">
            <Card className="p-8 border-primary/50 bg-primary/5 shadow-xl">
               <div className="flex flex-col items-center text-center gap-6">
                  {/* Avatar */}
                 <div className="h-24 w-24 rounded-full bg-primary/20 text-primary flex items-center justify-center border-4 border-background shadow-inner">
                    <UserIcon className="h-10 w-10" />
                  </div>
                  
                  <div>
                     <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Your Head Coach</p>
                    <h2 className="text-3xl font-bold text-foreground mb-2">{coachNameDisplay}</h2>
                     <div className="flex items-center justify-center gap-2">
                        <Badge variant="outline" className="text-primary border-primary px-3 py-1">
                          Active Training
                        </Badge>
                     </div>
                  </div>

                  <div className="w-full h-px bg-border/50 my-2" />

                   <div className="grid grid-cols-2 gap-8 w-full"> 
                       {(() => {
                          const currentCoachData = coaches.find(c => c.id === resolvedCoachId);
                          return (
                              <>
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Team Size</div>
                                    <div className="text-2xl font-bold text-foreground">{currentCoachData?.athleteCount || '0'}</div>
                                    <div className="text-xs text-muted-foreground">Athletes</div>
                                </div>
                                 <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Experience</div>
                                    <div className="text-2xl font-bold text-foreground">{currentCoachData?.totalSessionsSupervised || '0'}</div>
                                    <div className="text-xs text-muted-foreground">Sessions</div>
                                </div>
                              </>
                          )
                       })()}
                   </div>

                   <div className="w-full h-px bg-border/50 my-2" />

                  <div className="flex gap-4 w-full">
                     <Link href={`/coaches/${resolvedCoachId}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                            View Profile
                        </Button>
                     </Link>
                     <div className="flex-1">
                        {resolvedCoachId && (
                            <LeaveCoachDialog 
                                coachName={coachNameDisplay}
                                onSuccess={() => window.location.reload()}
                            />
                        )}
                     </div>
                  </div>
               </div>
            </Card>
          </div>
        ) : (
          /* No Coach - Show Grid */
          isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : coaches.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Coaches Available</h3>
              <p className="text-muted-foreground">
                No coaches have registered yet. Check back later.
              </p>
            </Card>
          ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {coaches.map((coach) => {
                  const isPending = pendingRequests.includes(coach.id);
                  const isRejected = rejectedRequests.includes(coach.id);
                  
                  return (
                    <Link href={`/coaches/${coach.id}`} key={coach.id} className="block group">
                      <Card className={`p-6 h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 flex flex-col ${isPending ? 'border-primary/20 bg-muted/20' : isRejected ? 'border-destructive/20 bg-destructive/5' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold flex-shrink-0">
                                {(coach.name || coach.username || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                                  {coach.name || coach.username}
                                </h3>
                                 <Badge variant="secondary" className="mt-1 text-xs font-normal">
                                    {coach.specialization || 'General Coach'}
                                 </Badge>
                              </div>
                            </div>
                            {isPending ? (
                                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-100 flex-shrink-0">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Request Sent
                                </Badge>
                            ) : isRejected && (
                                <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10 flex-shrink-0">
                                  <Target className="h-3 w-3 mr-1" /> Request Rejected
                                </Badge>
                            )}
                        </div>
                        
                        <div className="mt-4 mb-4 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                             {coach.bio || coach.about || "No biography added."}
                        </div>

                        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 group-hover:text-primary transition-colors font-medium">
                                {isPending ? 'Waiting for approval...' : isRejected ? <span className="text-destructive">Request Rejected</span> : <>View Profile <ArrowRight className="h-3 w-3" /></>}
                            </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
