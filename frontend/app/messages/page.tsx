'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { CoachMessage, Athlete } from '@/lib/types';
import { 
  Send, 
  Loader2, 
  Search,
  MessageSquare,
  MoreVertical,
  Phone,
  Video,
  X,
  Link as LinkIcon,
  Activity,
  Target,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TagSelector } from '@/components/tag-selector';

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [coaches, setCoaches] = useState<{id: string, name: string}[]>([]); // For athletes to see list of coaches
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null); // Unified partner ID (athleteId for coach, coachId for athlete)
  const [newMessage, setNewMessage] = useState('');
  const [selectedTags, setSelectedTags] = useState<{ type: 'session' | 'goal' | 'plan'; id: string; title: string }[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        if (user.role === 'athlete') {
          // Athletes see messages directly
          const data = await api.getAthleteMessages(user.id);
          setMessages(Array.isArray(data) ? data.reverse() : []); // Oldest first for chat
        } else {
          // Coach view: Fetch athletes
          const [messagesData, athletesData] = await Promise.all([
            api.getCoachMessages(user.id),
            api.getAthletes(),
          ]);
          setMessages(Array.isArray(messagesData) ? messagesData : []);
          setAthletes(Array.isArray(athletesData) ? athletesData : []);
        }

        // Special handling for Athletes: derive "coaches" list from messages + current coach
        if (user.role === 'athlete') {
           const myMessages = await api.getAthleteMessages(user.id) as CoachMessage[];
           setMessages(Array.isArray(myMessages) ? myMessages : []);
           
           // Extract unique coaches from messages
           const uniqueCoachIds = Array.from(new Set(myMessages.map(m => m.coachId)));
           
           // If has current coach, ensure they are in the list
           const athlete = user as Athlete;
           if (athlete.coachId && !uniqueCoachIds.includes(athlete.coachId)) {
               uniqueCoachIds.push(athlete.coachId);
           }

           // Currently we don't have a getCoachesByIds endpoint, so we might need to fetch all coaches or just use names from messages
           // Ideally we fetch 'all coaches' and filter, or use message metadata.
           // For simplicity: Fetch all coaches and filter.
           const allCoaches = await api.getCoaches();
           const myCoachList = allCoaches.filter(c => uniqueCoachIds.includes(c.id)).map(c => ({
               id: c.id,
               name: c.name || c.username || 'Unknown Coach'
           }));
           setCoaches(myCoachList);
           
           // Auto-select current coach if no partner selected
           if (!selectedPartnerId && athlete.coachId) {
               setSelectedPartnerId(athlete.coachId);
           } else if (!selectedPartnerId && myCoachList.length > 0) {
               setSelectedPartnerId(myCoachList[0].id);
           }
        }

      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Auto-refresh messages every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedPartnerId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !newMessage.trim()) return;
    
    // For coach: must have athlete selected
    if (user.role === 'coach' && !selectedPartnerId) return;

    setSending(true);
    
    // Generate unique ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    let messageData: Partial<CoachMessage>;

    if (user.role === 'coach') {
      const selectedAthlete = athletes.find(a => a.id === selectedPartnerId);
      messageData = {
        id: messageId,
        coachId: user.id,
        coachName: user.name || user.username || 'Coach',
        athleteId: selectedPartnerId!,
        athleteName: athletes.find(a => a.id === selectedPartnerId)?.name || 'Athlete',
        content: newMessage,
        message: newMessage,
        timestamp,
        read: false,
        senderId: user.id,
        sessionId: '',
        tags: selectedTags,
      };
    } else {
      const athlete = user as import('@/lib/types').Athlete;
      // We need to send to the SELECTED coach, not just the current coach
      const targetCoachId = selectedPartnerId || athlete.coachId;
      const targetCoachName = coaches.find(c => c.id === targetCoachId)?.name || athlete.coachName || 'Coach';

      if (!targetCoachId) return;

      messageData = {
        id: messageId,
        coachId: targetCoachId,
        coachName: targetCoachName,
        athleteId: user.id,
        athleteName: user.name || user.username || 'Athlete',
        content: newMessage,
        message: newMessage,
        timestamp,
        read: false,
        senderId: user.id,
        sessionId: '',
        tags: selectedTags,
      };
    }

    try {
      // Optimistic update
      const optimisticMsg = messageData as CoachMessage;
      setMessages(prev => [...prev, optimisticMsg]);
      setNewMessage('');
      setSelectedTags([]);
      
      await api.sendCoachMessage(messageData);
    } catch (err) {
      console.error('Error sending message:', err);
      // Revert if failed (could implement retry logic here)
    } finally {
      setSending(false);
    }
  };

  // Filter messages for current view
  const activeMessages = !user 
    ? [] 
    : (user.role === 'athlete' 
        ? messages.filter(m => m.coachId === selectedPartnerId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        : messages
            .filter(m => m.athleteId === selectedPartnerId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      );

  // Get conversation partner info
  const partnerName = !user 
    ? '' 
    : (user.role === 'athlete' 
        ? (coaches.find(c => c.id === selectedPartnerId)?.name || 'Coach')
        : (athletes.find(a => a.id === selectedPartnerId)?.name || 'Athlete')
      );

  // Mark messages as read when viewing
  useEffect(() => {
    if (!user || activeMessages.length === 0) return;

    const unreadMessages = activeMessages.filter(msg => 
      !msg.read && 
      (msg.senderId ? msg.senderId !== user.id : true) // Incoming messages only
    );

    if (unreadMessages.length > 0) {
      // Mark as read in backend
      unreadMessages.forEach(msg => {
        api.markMessageAsRead(msg.id).catch(console.error);
      });

      // Optimistically update local state
      setMessages(prev => prev.map(m => 
        unreadMessages.some(u => u.id === m.id) ? { ...m, read: true } : m
      ));
    }
  }, [activeMessages.length, selectedPartnerId, user]); // Trigger when messages change or athlete selected

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="h-[calc(100vh-8rem)] flex rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        
        {/* Sidebar (Coach Only) */}
        {user.role === 'coach' && (
          <div className="w-80 border-r border-border flex flex-col bg-muted/5">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search athletes..." className="pl-9 bg-background" />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-1 p-2">
                {athletes.map(athlete => {
                  const athleteMessages = messages.filter(m => m.athleteId === athlete.id);
                  const lastMsg = athleteMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                  const hasUnread = athleteMessages.some(m => !m.read && m.senderId !== user.id);
                  
                  return (
                    <button
                      key={athlete.id}
                      onClick={() => setSelectedPartnerId(athlete.id)}
                      className={`flex items-start gap-3 p-3 text-left rounded-lg transition-colors ${
                        selectedPartnerId === athlete.id 
                          ? 'bg-primary/10 hover:bg-primary/15' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={athlete.profileImage} />
                          <AvatarFallback>{(athlete.name || athlete.username || 'A').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn("truncate", hasUnread ? "font-bold text-foreground" : "font-medium")}>
                            {athlete.name || athlete.username}
                          </span>
                          {lastMsg && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(lastMsg.timestamp), 'h:mm a')}
                            </span>
                          )}
                        </div>
                        <p className={cn("text-xs truncate", hasUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                          {'View messages'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Sidebar (Athlete - For Multiple Coaches History) */}
        {user.role === 'athlete' && (
             <div className="w-80 border-r border-border flex flex-col bg-muted/5">
                <div className="p-4 border-b border-border font-semibold">
                    Your Coaches
                </div>
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-1 p-2">
                        {coaches.map(coach => {
                             const coachMessages = messages.filter(m => m.coachId === coach.id);
                             const hasUnread = coachMessages.some(m => !m.read && m.senderId !== user.id);
                             return (
                                <button
                                  key={coach.id}
                                  onClick={() => setSelectedPartnerId(coach.id)}
                                  className={`flex items-start gap-3 p-3 text-left rounded-lg transition-colors ${
                                    selectedPartnerId === coach.id 
                                      ? 'bg-primary/10 hover:bg-primary/15' 
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                    <Avatar>
                                        <AvatarFallback>{(coach.name || 'C').charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="font-medium flex justify-between">
                                            {coach.name}
                                            {hasUnread && <span className="h-2 w-2 rounded-full bg-primary" />}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {coachMessages.length > 0 ? 'View messages' : 'Start conversation'}
                                        </div>
                                    </div>
                                </button>
                             )
                        })}
                        {coaches.length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                                No coaches yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>
             </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {!selectedPartnerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {partnerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{partnerName}</h2>
                  </div>
                </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {activeMessages.map((msg, i) => {
                  const sentByMe = msg.senderId ? msg.senderId === user.id : (
                    // Fallback for old messages without senderId
                    user.role === 'coach' ? msg.coachId === user.id : msg.athleteId === user.id
                    // Note: This fallback is imperfect if we don't know who sent it,
                    // but newly sent messages will have senderId.
                  );

                  return (
                    <div
                      key={`${msg.id}-${i}`}
                      className={`flex ${sentByMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex items-end gap-2 max-w-[80%] ${
                          sentByMe ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {/* Avatar only for other person */}
                        {!sentByMe && (
                          <Avatar className="h-8 w-8 border border-border shrink-0">
                            <AvatarFallback className="text-xs">
                              {partnerName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={`group relative px-4 py-2 rounded-2xl text-sm max-w-full break-words ${
                            sentByMe
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-muted text-foreground rounded-bl-none'
                          }`}
                        >
                          {msg.tags && msg.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                  {msg.tags.map((tag: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-1 bg-background/20 rounded px-1.5 py-0.5 text-[10px]">
                                          <LinkIcon className="h-3 w-3" />
                                          <span className="truncate max-w-[100px]">{tag.title}</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                          <p className="break-words">{msg.content || msg.message}</p>
                          <span className={`text-[10px] opacity-70 mt-1 block ${
                            sentByMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {format(new Date(msg.timestamp), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {/* Message Input Area */}
          {(selectedPartnerId) && (
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur">
                {selectedTags.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                        {selectedTags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="flex gap-1 items-center whitespace-nowrap">
                                {tag.type === 'session' && <Activity className="h-3 w-3" />}
                                {tag.type === 'goal' && <Target className="h-3 w-3" />}
                                {tag.type === 'plan' && <FileText className="h-3 w-3" />}
                                {tag.title}
                                <button onClick={() => setSelectedTags(selectedTags.filter((_, idx) => idx !== i))} className="ml-1 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
              <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-background min-h-[44px]"
                  disabled={sending}
                />
                <TagSelector 
                    userId={user.id} 
                    role={user.role as any} 
                    partnerId={selectedPartnerId!} 
                    onSelect={(tag) => setSelectedTags([...selectedTags, tag])} 
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessage.trim() || sending}
                  className="h-11 w-11 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
