'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { 
  Upload, 
  Video, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Play,
  ArrowLeft
} from 'lucide-react';

// Only these 3 exercises are supported by the backend AI analysis
const EXERCISES = [
  'squat',
  'pushups',
  'jumping_jacks',
];

export default function RecordSessionPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('10');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }
      setVideoFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!videoFile || !exercise || !user) {
      setError('Please select a video and exercise');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const response = await api.analyzeVideo(
        videoFile,
        exercise,
        user.id,
        user.name || user.username || 'Athlete'
      );

      clearInterval(interval);
      setProgress(100);
      setResult(response);
      setIsAnalyzing(false);
    } catch (err) {
      clearInterval(interval);
      console.error('Error analyzing video:', err);
      setError('Failed to analyze video. Please ensure the backend is running and try again.');
      setIsAnalyzing(false);
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

  return (
    <AppLayout user={user}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => router.push('/sessions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Record Session</h1>
          <p className="text-muted-foreground mt-1">
            Upload a video of your exercise for AI analysis
          </p>
        </div>

        {/* Form */}
        {!result ? (
          <Card className="p-6 space-y-6">
            {/* Exercise Selection */}
            <div className="space-y-2">
              <Label htmlFor="exercise">Exercise Type</Label>
              <Select value={exercise} onValueChange={setExercise}>
                <SelectTrigger id="exercise">
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISES.map(ex => (
                    <SelectItem key={ex} value={ex} className="capitalize">
                      {ex.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reps Input */}
            <div className="space-y-2">
              <Label htmlFor="reps">Target Reps</Label>
              <Input
                id="reps"
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                min="1"
                max="100"
              />
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label>Video Upload</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="video-upload"
                  disabled={isAnalyzing}
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  {videoFile ? (
                    <div className="space-y-2">
                      <Video className="h-12 w-12 text-primary mx-auto" />
                      <p className="font-medium text-foreground">{videoFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="font-medium text-foreground">Click to upload video</p>
                      <p className="text-sm text-muted-foreground">
                        MP4, MOV, or WebM (max 100MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {/* Analyzing Progress */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Analyzing video...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Submit Button */}
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleSubmit}
              disabled={!videoFile || !exercise || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Analyze Video
                </>
              )}
            </Button>
          </Card>
        ) : (
          /* Success Result - Show 3 Core Metrics */
          <Card className="p-8 text-center space-y-6">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Analysis Complete!</h2>
            
            {/* 3 Core Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Form Score</p>
                <p className="text-4xl font-bold text-primary">
                  {result.formScore || result.form_score || 0}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Reps</p>
                <p className="text-4xl font-bold text-foreground">
                  {result.reps || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Duration</p>
                <p className="text-4xl font-bold text-foreground">
                  {Math.round(result.durationSec || result.duration || 0)}s
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pt-4">
              <Button variant="outline" onClick={() => router.push('/sessions')}>
                View All Sessions
              </Button>
              <Button onClick={() => {
                setResult(null);
                setVideoFile(null);
                setExercise('');
                setProgress(0);
                setIsAnalyzing(false);
              }}>
                <Play className="h-4 w-4 mr-2" />
                Record Another
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
