'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { CoachMessage, Athlete } from '@/lib/types';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  RefreshCw,
  User,
  Clock
} from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [sending, setSending] = useState(false);

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
        if (user.role === 'athlete') {
          const data = await api.getAthleteMessages(user.id);
          setMessages(Array.isArray(data) ? data : []);
        } else {
          const [messagesData, athletesData] = await Promise.all([
            api.getCoachMessages(user.id),
            api.getAthletes(),
          ]);
          setMessages(Array.isArray(messagesData) ? messagesData : []);
          setAthletes(Array.isArray(athletesData) ? athletesData : []);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleRefresh = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (user.role === 'athlete') {
        const data = await api.getAthleteMessages(user.id);
        setMessages(Array.isArray(data) ? data : []);
      } else {
        const data = await api.getCoachMessages(user.id);
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    if (user.role === 'coach' && !selectedAthleteId) return;

    setSending(true);
    try {
      const message = await api.sendCoachMessage({
        coachId: user.role === 'coach' ? user.id : undefined,
        coachName: user.role === 'coach' ? (user.name || user.username) : undefined,
        athleteId: user.role === 'athlete' ? user.id : selectedAthleteId,
        athleteName: user.role === 'athlete' ? (user.name || user.username) : undefined,
        type: 'feedback',
        message: newMessage,
        sessionId: '',
        timestamp: new Date().toISOString(),
        read: false,
      });
      setMessages([message, ...messages]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await api.markMessageAsRead(messageId);
      setMessages(messages.map(m => m.id === messageId ? { ...m, read: true } : m));
    } catch (err) {
      console.error('Error marking as read:', err);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground mt-1">
              {user.role === 'athlete' ? 'Messages from your coach' : 'Communicate with your athletes'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {/* Send Message (Coach only) */}
        {user.role === 'coach' && (
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
              >
                <option value="">Select Athlete</option>
                {athletes.map(athlete => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name || athlete.username || athlete.email}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim() || !selectedAthleteId}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Messages List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading messages...</span>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => (
              <Card 
                key={msg.id} 
                className={`p-4 ${!msg.read && user.role === 'athlete' ? 'border-primary/50 bg-primary/5' : ''}`}
                onClick={() => !msg.read && user.role === 'athlete' && handleMarkAsRead(msg.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">
                        {user.role === 'athlete' ? msg.coachName : msg.athleteName}
                      </span>
                      <div className="flex items-center gap-2">
                        {!msg.read && <Badge variant="secondary">New</Badge>}
                        <Badge variant="outline">{msg.type}</Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{msg.message}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Messages</h3>
            <p className="text-muted-foreground">
              {user.role === 'coach' 
                ? 'Send a message to one of your athletes to get started.'
                : 'Your coach hasn\'t sent any messages yet.'}
            </p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
