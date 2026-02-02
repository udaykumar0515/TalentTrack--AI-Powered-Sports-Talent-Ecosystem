'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { StatCard } from '@/components/stat-card';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import { CoachRequestsList } from '@/components/coach-requests-list';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Coach, Session } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  X,
  Users,
  Trophy,
  Activity
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, updateUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Coach-specific stats
  const [coachStats, setCoachStats] = useState<{
    athleteCount: number;
    totalSessionsSupervised: number;
    teamAvgPerformance: number;
    goalsAchieved: number;
    specialization?: string;
  } | null>(null);

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
        if (user.role === 'coach') {
          // Fetch coach stats
          const stats = await api.getCoachStats(user.id).catch(() => null);
          const coachUser = user as Coach;
          setCoachStats(stats);
          setProfileData(user);
          setFormData({
            age: user.age?.toString() || '',
            gender: user.gender || '',
            specialization: coachUser.specialization || stats?.specialization || 'General Coach',
            bio: coachUser.bio || '',
          });
        } else {
          // Athlete flow
          const [sessionsData, activityData, athleteData] = await Promise.all([
            api.getSessions({ athleteId: user.id }).catch(() => []),
            api.getActivity(user.id).catch(() => ({ activity: {}, totalSessions: 0, streak: 0 })),
            api.getAthlete(user.id).catch(() => null)
          ]);
          
          setSessions(Array.isArray(sessionsData) ? sessionsData : []);
          setActivity(activityData?.activity || {});
          setStreak(activityData?.streak || 0);
          
          const currentData = athleteData || user;
          setProfileData(currentData);
          setFormData({
            age: currentData.age?.toString() || '',
            gender: currentData.gender || '',
            weight: currentData.weight || '',
            height: currentData.height || '',
          });
        }
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
  const [formData, setFormData] = useState<{
    age: string;
    gender: string;
    weight?: string;
    height?: string;
    specialization?: string;
    bio?: string;
  }>({
    age: '',
    gender: '',
    weight: '',
    height: '',
    specialization: 'General Coach',
    bio: '',
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const updates = {
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender,
        ...(user.role === 'athlete' ? { weight: formData.weight, height: formData.height } : {
             bio: formData.bio,
             specialization: formData.specialization
        }),
      };

      // Call API first
      await api.updateUser(user.id, updates);
      
      // Update local context without reload
      await updateUser(updates);
      
      // Update local state if needed (though context update should trigger re-render)
      setProfileData({ ...profileData, ...updates });
      
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setIsLoading(false);
    }
  };
  
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
            <h2 className="text-lg font-semibold">Personal Info</h2>
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

          <div className={`grid gap-6 ${user.role === 'athlete' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
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

            {/* Height - Only for Athletes */}
            {user.role === 'athlete' && (
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
            )}

             {/* Weight - Only for Athletes */}
            {user.role === 'athlete' && (
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
            )}
          </div>

           {/* Coach Specific Fields */}
           {user.role === 'coach' && (
              <div className="mt-6 space-y-6 border-t pt-6">
                  
                  {/* Specialization */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Specialization</label>
                    {isEditing ? (
                       <Select
                        value={formData.specialization}
                        onValueChange={(val) => setFormData({ ...formData, specialization: val })}
                      >
                        <SelectTrigger className="w-full md:w-1/2">
                          <SelectValue placeholder="Select Specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General Coach">General Coach</SelectItem>
                          <SelectItem value="Strength & Conditioning">Strength & Conditioning</SelectItem>
                          <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                          <SelectItem value="Mental Performance">Mental Performance</SelectItem>
                          <SelectItem value="Nutritionist">Nutritionist</SelectItem>
                          <SelectItem value="Tactical Analyst">Tactical Analyst</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                       <div className="inline-block">
                         <Badge variant="secondary" className="text-sm px-3 py-1">
                            {displayUser.specialization || 'General Coach'}
                        </Badge>
                       </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Biography</label>
                    {isEditing ? (
                       <Textarea 
                          value={formData.bio}
                          onChange={(e) => setFormData({...formData, bio: e.target.value})}
                          placeholder="Tell athletes about your experience and coaching philosophy..."
                          className="min-h-[120px]"
                       />
                    ) : (
                       <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {displayUser.bio || <span className="italic text-muted-foreground/50">No biography added yet.</span>}
                       </p>
                    )}
                  </div>
              </div>
           )}

        </Card>

        {/* Loading State */}
        {isLoading && !isEditing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading stats...</span>
          </div>
        ) : (
          <>
            {/* Coach Requests Section - ONLY for Coaches */}
            {user.role === 'coach' && (
               <div className="mb-6">
                  <CoachRequestsList />
               </div>
            )}

            {/* Coach Stats */}
            {user.role === 'coach' && coachStats && (
              <div className="grid gap-6 md:grid-cols-4">
                <StatCard
                  title="Athletes"
                  value={coachStats.athleteCount}
                  icon={Users}
                />
                <StatCard
                  title="Sessions Supervised"
                  value={coachStats.totalSessionsSupervised}
                  icon={Activity}
                />
                <StatCard
                  title="Team Avg Score"
                  value={`${coachStats.teamAvgPerformance}%`}
                  icon={TrendingUp}
                />
                <StatCard
                  title="Goals Achieved"
                  value={coachStats.goalsAchieved}
                  icon={Trophy}
                />
              </div>
            )}

            {/* Athlete Stats */}
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

            {/* Activity Heatmap - Athletes only */}
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

