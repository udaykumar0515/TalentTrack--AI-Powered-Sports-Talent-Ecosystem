'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { SessionCard } from '@/components/session-card';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';
import { Search, Play, Loader2, RefreshCw } from 'lucide-react';

export default function SessionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExercise, setFilterExercise] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = user.role === 'athlete' 
          ? { athleteId: user.id }
          : { coachId: user.id };
        
        console.log('[SESSIONS DEBUG] Fetching with params:', params);
        
        const response = await api.getSessions(params);
        
        console.log('[SESSIONS DEBUG] Raw response:', response);
        
        // Handle both array and paginated response formats
        let sessionsData: Session[] = [];
        if (Array.isArray(response)) {
          sessionsData = response;
        } else if (response && typeof response === 'object' && 'sessions' in response) {
          // Paginated response: { sessions: [...], pagination: {...} }
          sessionsData = (response as { sessions: Session[] }).sessions || [];
        }
        
        console.log('[SESSIONS DEBUG] Extracted sessions:', sessionsData.length);
        setSessions(sessionsData);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Failed to load sessions. Please check if the backend is running.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchSessions();
    }
  }, [user]);

  const handleRefresh = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = user.role === 'athlete' ? { athleteId: user.id } : { coachId: user.id };
      const response = await api.getSessions(params);
      
      // Handle both array and paginated response formats
      let sessionsData: Session[] = [];
      if (Array.isArray(response)) {
        sessionsData = response;
      } else if (response && typeof response === 'object' && 'sessions' in response) {
        sessionsData = (response as { sessions: Session[] }).sessions || [];
      }
      setSessions(sessionsData);
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      setSessions(sessions.filter(s => (s.id || s.sessionId) !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
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

  // Get unique exercises for filter
  const exercises = [...new Set(sessions.map(s => s.exercise))];

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchQuery || 
      session.exercise.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.athleteName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExercise = filterExercise === 'all' || session.exercise === filterExercise;
    return matchesSearch && matchesExercise;
  });

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sessions</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your training sessions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {user.role === 'athlete' && (
              <Link href="/sessions/record">
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Record Session
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterExercise} onValueChange={setFilterExercise}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by exercise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exercises</SelectItem>
              {exercises.map(exercise => (
                <SelectItem key={exercise} value={exercise}>{exercise}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sessions Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading sessions...</span>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id || session.sessionId}
                session={session}
                onDelete={handleDeleteSession}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Sessions Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterExercise !== 'all'
                ? 'No sessions match your search criteria.'
                : 'Start recording sessions to track your progress.'}
            </p>
            {user.role === 'athlete' && (
              <Link href="/sessions/record">
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Record Your First Session
                </Button>
              </Link>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
