'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
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
  UserPlus
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CoachesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCoaches = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getCoaches();
        setCoaches(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching coaches:', err);
        setError('Failed to load coaches.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoaches();
  }, [user]);

  const handleSelectCoach = async (coach: Coach) => {
    if (!user) return;
    
    const athlete = user as Athlete;
    
    setSelecting(coach.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/coach-change-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: user.id,
          currentCoachId: athlete.coachId || 'none',
          newCoachId: coach.id,
          reason: 'Initial coach selection',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to select coach');
      }

      const result = await response.json();
      
      if (result.autoApproved) {
        // Update local user state
        const updatedUser = {
          ...user,
          coachId: coach.id,
          coachName: coach.name || coach.username,
        };
        localStorage.setItem('talenttrack_user', JSON.stringify(updatedUser));
        
        setSuccessMessage(`${coach.name || coach.username} is now your coach!`);
        
        // Redirect to messages after 2 seconds
        setTimeout(() => {
          window.location.reload(); // Reload to update auth context
        }, 2000);
      } else {
        setSuccessMessage('Coach request submitted. Waiting for approval.');
      }
    } catch (err) {
      console.error('Error selecting coach:', err);
      setError('Failed to select coach. Please try again.');
    } finally {
      setSelecting(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const athlete = user as Athlete;
  const hasCoach = !!athlete.coachId;

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Find a Coach</h1>
            <p className="text-muted-foreground mt-1">
              {hasCoach 
                ? `Your current coach: ${athlete.coachName || 'Unknown'}`
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

        {/* Current Coach Card */}
        {hasCoach && (
          <Card className="p-6 border-primary/50 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <UserIcon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Current Coach</p>
                  <h3 className="text-xl font-semibold text-foreground">{athlete.coachName}</h3>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                Active
              </Badge>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
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
          /* Coaches Grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach) => {
              const isCurrentCoach = athlete.coachId === coach.id;
              
              return (
                <Card key={coach.id} className={`p-6 ${isCurrentCoach ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                        {(coach.name || coach.username || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {coach.name || coach.username}
                        </h3>
                        {coach.specialization && (
                          <p className="text-sm text-muted-foreground">{coach.specialization}</p>
                        )}
                      </div>
                    </div>
                    {isCurrentCoach && (
                      <Badge className="bg-primary text-primary-foreground">Your Coach</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {coach.email}
                    </div>
                    {coach.athleteCount !== undefined && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {coach.athleteCount} athlete{coach.athleteCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {!isCurrentCoach && (
                    <Button
                      onClick={() => handleSelectCoach(coach)}
                      disabled={selecting === coach.id}
                      className="w-full"
                    >
                      {selecting === coach.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Selecting...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Select as Coach
                        </>
                      )}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
