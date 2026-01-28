'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { GamificationData, Session } from '@/lib/types';
import { 
  User, 
  Mail, 
  Award, 
  Flame, 
  Star, 
  Target,
  Loader2,
  TrendingUp
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const [gamificationData, sessionsData] = await Promise.all([
          api.getGamificationData(user.id).catch(() => null),
          api.getSessions({ athleteId: user.id }).catch(() => []),
        ]);
        setGamification(gamificationData);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

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

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (s.formScore || s.metrics?.formScore || 0), 0) / sessions.length)
    : 0;

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-1">
              View your profile and achievements
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {(user.name || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {user.name || user.username || 'User'}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              <Badge className="mt-2 capitalize">{user.role}</Badge>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading stats...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            {user.role === 'athlete' && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Sessions"
                  value={sessions.length}
                  icon={Target}
                />
                <StatCard
                  title="Avg Form Score"
                  value={`${avgScore}%`}
                  icon={TrendingUp}
                />
                <StatCard
                  title="Current Streak"
                  value={gamification?.streak || 0}
                  subtitle="days"
                  icon={Flame}
                />
                <StatCard
                  title="Level"
                  value={gamification?.level || 1}
                  subtitle={`${gamification?.xp || 0} XP`}
                  icon={Star}
                />
              </div>
            )}

            {/* Badges */}
            {user.role === 'athlete' && gamification && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Badges & Achievements
                </h2>
                {gamification.badges && gamification.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {gamification.badges.map((badge, i) => (
                      <div 
                        key={badge.id || i} 
                        className="flex flex-col items-center p-4 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <span className="text-3xl mb-2">{badge.icon || '🏆'}</span>
                        <span className="font-medium text-sm">{badge.name}</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          {badge.description}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Complete sessions to earn badges!</p>
                )}
              </Card>
            )}

            {/* Achievements Progress */}
            {user.role === 'athlete' && gamification?.achievements && gamification.achievements.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Achievement Progress</h2>
                <div className="space-y-4">
                  {gamification.achievements.map((achievement, i) => {
                    const progress = achievement.target > 0 
                      ? Math.round((achievement.progress / achievement.target) * 100) 
                      : 0;
                    return (
                      <div key={achievement.id || i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{achievement.title || achievement.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {achievement.progress}/{achievement.target}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
