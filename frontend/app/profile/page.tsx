'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { 
  Mail, 
  Flame, 
  Target,
  Loader2,
  TrendingUp,
  LogOut,
  Pencil,
  Save,
  X
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // State for fresh user data
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const [sessionsData, activityData, athleteData] = await Promise.all([
          api.getSessions({ athleteId: user.id }).catch(() => []),
          api.getActivity(user.id).catch(() => ({ activity: {}, totalSessions: 0, streak: 0 })),
          // Fetch fresh athlete data to get latest stats
          user.role === 'athlete' ? api.getAthlete(user.id).catch(() => null) : Promise.resolve(null)
        ]);
        
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setActivity(activityData?.activity || {});
        setStreak(activityData?.streak || 0);
        
        // Use fresh data if available, otherwise fallback to auth user context
        setProfileData(athleteData || user);

        // Update form data with fresh data
        const currentData = athleteData || user;
        setFormData({
          age: currentData.age?.toString() || '',
          gender: currentData.gender || '',
          weight: currentData.weight || '',
          height: currentData.height || '',
        });
        
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

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    weight: '',
    height: '',
  });

  // Removed stale useEffect that overwrote formData from 'user' context
  
  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      await api.updateUser(user.id, {
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender,
        weight: formData.weight,
        height: formData.height,
      });
      setIsEditing(false);
      // Force reload to update context (since we don't have setUser)
      window.location.reload();
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use profileData for display instead of user
  const displayUser = profileData || user;

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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your profile
            </p>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {(displayUser.name || displayUser.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">
                {displayUser.name || displayUser.username || 'User'}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {displayUser.email}
              </div>
              <Badge className="mt-2 capitalize">{displayUser.role}</Badge>
            </div>
          </div>
        </Card>

        {/* Personal Stats Card */}
        <Card className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Personal Stats</h2>
            {isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Age */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Age</label>
              {isEditing ? (
                <Input 
                  type="number" 
                  value={formData.age} 
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  placeholder="25"
                />
              ) : (
                <p className="text-lg font-semibold">{displayUser.age || '-'}</p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Gender</label>
               {isEditing ? (
                <Select
                  value={formData.gender}
                  onValueChange={(val) => setFormData({ ...formData, gender: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-lg font-semibold capitalize">{displayUser.gender || '-'}</p>
              )}
            </div>

            {/* Height */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Height</label>
               {isEditing ? (
                <div className="flex items-center gap-2">
                   <Input 
                    type="number"
                    value={formData.height} 
                    onChange={(e) => setFormData({...formData, height: e.target.value})}
                    placeholder="180"
                  />
                  <span className="text-xs text-muted-foreground">cm</span>
                </div>
              ) : (
                <p className="text-lg font-semibold">{displayUser.height ? `${displayUser.height} cm` : '-'}</p>
              )}
            </div>

             {/* Weight */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Weight</label>
               {isEditing ? (
                <div className="flex items-center gap-2">
                   <Input 
                    type="number"
                    value={formData.weight} 
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    placeholder="75"
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
              ) : (
                <p className="text-lg font-semibold">{displayUser.weight ? `${displayUser.weight} kg` : '-'}</p>
              )}
            </div>
          </div>
        </Card>



        {/* Loading State */}
        {isLoading && !isEditing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading stats...</span>
          </div>
        ) : (
          <>
            {/* Stats - Simplified (no Level/XP) */}
            {user.role === 'athlete' && (
              <div className="grid gap-6 md:grid-cols-3">
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
                  value={streak}
                  subtitle="days"
                  icon={Flame}
                />
              </div>
            )}

            {/* Activity Heatmap - GitHub/LeetCode style */}
            {user.role === 'athlete' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Session Activity</h2>
                <ActivityHeatmap 
                  activity={activity}
                  totalSessions={sessions.length}
                  streak={streak}
                />
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
