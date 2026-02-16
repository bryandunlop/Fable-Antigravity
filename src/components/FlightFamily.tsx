import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { 
  MessageSquare,
  Users,
  Hash,
  Phone,
  Video,
  Paperclip,
  Send,
  Search,
  Settings,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  ArrowLeft,
  Plane,
  Wrench,
  Shield,
  Calendar,
  Bell,
  Pin,
  Smile,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  Star,
  Trash2,
  Edit,
  Reply,
  Forward
} from 'lucide-react';

interface FlightFamilyProps {
  userRole: string;
}

interface Message {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  timestamp: string;
  type: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  priority?: 'normal' | 'high' | 'emergency';
  edited?: boolean;
  reactions?: { emoji: string; users: string[]; }[];
  replyTo?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'flight' | 'department' | 'general' | 'direct';
  members: number;
  unread: number;
  lastMessage: string;
  lastActivity: string;
  description?: string;
  icon?: string;
  isPrivate?: boolean;
  flightNumber?: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  avatar?: string;
  lastSeen?: string;
}

export default function FlightFamily({ userRole }: FlightFamilyProps) {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showStartDM, setShowStartDM] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // Mock data
  const currentUser = {
    id: 'current-user',
    name: getCurrentUserName(userRole),
    role: userRole,
    status: 'online' as const
  };

  const channels: Channel[] = [
    // Flight Channels
    { 
      id: 'flight-gf101', 
      name: 'GF-101 KTEB→KPBI', 
      type: 'flight', 
      members: 8, 
      unread: 3, 
      lastMessage: 'Catering confirmed for departure',
      lastActivity: '2 min ago',
      flightNumber: 'GF-101',
      icon: '✈️'
    },
    { 
      id: 'flight-gf205', 
      name: 'GF-205 KPBI→KIAH', 
      type: 'flight', 
      members: 6, 
      unread: 0, 
      lastMessage: 'Weather check complete',
      lastActivity: '15 min ago',
      flightNumber: 'GF-205',
      icon: '✈️'
    },
    
    // Department Channels
    { 
      id: 'pilots', 
      name: 'Pilots', 
      type: 'department', 
      members: 12, 
      unread: 1, 
      lastMessage: 'Currency update reminder',
      lastActivity: '5 min ago',
      icon: '👨‍✈️'
    },
    { 
      id: 'cabin-crew', 
      name: 'Cabin Crew', 
      type: 'department', 
      members: 8, 
      unread: 2, 
      lastMessage: 'Safety briefing materials updated',
      lastActivity: '8 min ago',
      icon: '👩‍✈️'
    },
    { 
      id: 'maintenance', 
      name: 'Maintenance', 
      type: 'department', 
      members: 15, 
      unread: 0, 
      lastMessage: 'Scheduled inspection complete',
      lastActivity: '1 hour ago',
      icon: '🔧'
    },
    { 
      id: 'dispatch', 
      name: 'Flight Dispatch', 
      type: 'department', 
      members: 6, 
      unread: 4, 
      lastMessage: 'Route optimization update',
      lastActivity: '12 min ago',
      icon: '📡'
    },
    
    // General Channels
    { 
      id: 'general', 
      name: 'General', 
      type: 'general', 
      members: 45, 
      unread: 0, 
      lastMessage: 'Welcome to the team, Sarah!',
      lastActivity: '30 min ago',
      icon: '💬'
    },
    { 
      id: 'announcements', 
      name: 'Announcements', 
      type: 'general', 
      members: 45, 
      unread: 1, 
      lastMessage: 'Q1 Safety Training Schedule Released',
      lastActivity: '2 hours ago',
      icon: '📢'
    },
    { 
      id: 'random', 
      name: 'Random', 
      type: 'general', 
      members: 32, 
      unread: 0, 
      lastMessage: 'Great sunset photo from yesterday\'s flight!',
      lastActivity: '1 hour ago',
      icon: '🎲'
    }
  ];

  const onlineUsers: User[] = [
    { id: '1', name: 'Captain Mike Wilson', role: 'Chief Pilot', status: 'online' },
    { id: '2', name: 'Sarah Johnson', role: 'Flight Attendant', status: 'online' },
    { id: '3', name: 'Tom Chen', role: 'Maintenance Manager', status: 'busy' },
    { id: '4', name: 'Lisa Rodriguez', role: 'Flight Dispatcher', status: 'online' },
    { id: '5', name: 'David Kim', role: 'Ground Operations', status: 'away' },
    { id: '6', name: 'Jessica Park', role: 'Chief Flight Attendant', status: 'online' },
    { id: '7', name: 'Robert Taylor', role: 'Maintenance Tech', status: 'offline' }
  ];

  // Mock messages for active channel
  useEffect(() => {
    const mockMessages: Record<string, Message[]> = {
      'general': [
        {
          id: '1',
          content: 'Good morning team! Hope everyone has a great day today.',
          author: 'Captain Mike Wilson',
          authorRole: 'Chief Pilot',
          timestamp: '9:15 AM',
          type: 'text'
        },
        {
          id: '2',
          content: 'Sarah Johnson has joined the team as our new Flight Attendant. Please give her a warm welcome!',
          author: 'System',
          authorRole: 'system',
          timestamp: '9:30 AM',
          type: 'system'
        },
        {
          id: '3',
          content: 'Welcome to the team, Sarah! Looking forward to working with you.',
          author: 'Jessica Park',
          authorRole: 'Chief Flight Attendant',
          timestamp: '9:32 AM',
          type: 'text'
        }
      ],
      'flight-gf101': [
        {
          id: '1',
          content: 'Flight GF-101 crew check-in. Weather looking good for departure.',
          author: 'Captain Mike Wilson',
          authorRole: 'Pilot',
          timestamp: '7:45 AM',
          type: 'text',
          priority: 'high'
        },
        {
          id: '2',
          content: 'Cabin prep complete. All safety equipment checked.',
          author: 'Sarah Johnson',
          authorRole: 'Flight Attendant',
          timestamp: '8:15 AM',
          type: 'text'
        },
        {
          id: '3',
          content: 'Catering confirmed for departure. Special dietary meals loaded.',
          author: 'Ground Operations',
          authorRole: 'Ground Crew',
          timestamp: '8:45 AM',
          type: 'text'
        }
      ]
    };
    
    setMessages(mockMessages[activeChannel] || []);
  }, [activeChannel]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getCurrentUserName(role: string): string {
    const nameMap: Record<string, string> = {
      'pilot': 'Captain John Smith',
      'inflight-crew': 'Sarah Johnson',
      'maintenance': 'Tom Chen',
      'admin': 'Maria Rodriguez',
      'safety': 'Dr. Lisa Davis',
      'scheduling': 'Michael Torres',
      'document-manager': 'David Kim',
      'admin-assistant': 'Jessica Park'
    };
    return nameMap[role] || 'Team Member';
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedFile) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      author: currentUser.name,
      authorRole: currentUser.role,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: selectedFile ? (selectedFile.type.startsWith('image/') ? 'image' : 'file') : 'text',
      fileName: selectedFile?.name,
      replyTo: replyToMessage?.id
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setSelectedFile(null);
    setReplyToMessage(null);
    toast.success('Message sent');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      toast.success(`File "${file.name}" ready to send`);
    }
  };

  const getChannelIcon = (channel: Channel) => {
    if (channel.icon) return channel.icon;
    switch (channel.type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'department': return <Users className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const formatMessageContent = (message: Message) => {
    if (message.type === 'system') {
      return <span className="italic text-muted-foreground">{message.content}</span>;
    }
    
    if (message.type === 'file') {
      return (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="w-5 h-5" />
          <span>{message.fileName}</span>
          <Button size="sm" variant="outline">Download</Button>
        </div>
      );
    }

    if (message.type === 'image') {
      return (
        <div className="space-y-2">
          {message.content && <p>{message.content}</p>}
          <div className="bg-muted rounded-lg p-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              <span>{message.fileName}</span>
            </div>
          </div>
        </div>
      );
    }

    return <p>{message.content}</p>;
  };

  const activeChannelData = channels.find(c => c.id === activeChannel);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b aviation-gradient">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate('/')} className="text-white/90 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-white" />
            <div>
              <h1 className="font-medium text-white">Flight Family</h1>
              <p className="text-sm text-white/80">Team Communication</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Channels List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Flight Channels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Active Flights</h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {channels.filter(c => c.type === 'flight').map(channel => (
                  <Button
                    key={channel.id}
                    variant={activeChannel === channel.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto p-2"
                    onClick={() => setActiveChannel(channel.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-lg">{getChannelIcon(channel)}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{channel.name}</span>
                          {channel.unread > 0 && (
                            <Badge variant="destructive" className="h-5 text-xs">
                              {channel.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.lastMessage}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Department Channels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Departments</h3>
              </div>
              <div className="space-y-1">
                {channels.filter(c => c.type === 'department').map(channel => (
                  <Button
                    key={channel.id}
                    variant={activeChannel === channel.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto p-2"
                    onClick={() => setActiveChannel(channel.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-lg">{getChannelIcon(channel)}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{channel.name}</span>
                          {channel.unread > 0 && (
                            <Badge variant="destructive" className="h-5 text-xs">
                              {channel.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.lastMessage}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* General Channels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">General</h3>
              </div>
              <div className="space-y-1">
                {channels.filter(c => c.type === 'general').map(channel => (
                  <Button
                    key={channel.id}
                    variant={activeChannel === channel.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto p-2"
                    onClick={() => setActiveChannel(channel.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-lg">{getChannelIcon(channel)}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{channel.name}</span>
                          {channel.unread > 0 && (
                            <Badge variant="destructive" className="h-5 text-xs">
                              {channel.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.lastMessage}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Direct Messages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Direct Messages</h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowStartDM(true)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {onlineUsers.slice(0, 3).map(user => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => toast.info(`Starting DM with ${user.name}`)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">{user.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(user.status)}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-medium text-sm">{user.name}</span>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* User Status */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">{currentUser.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(currentUser.status)}`} />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{currentUser.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{currentUser.status}</div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="p-4 border-b bg-card aviation-card-featured">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">{getChannelIcon(activeChannelData!)}</span>
              <div>
                <h2 className="font-medium text-primary">{activeChannelData?.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {activeChannelData?.members} members • Last active {activeChannelData?.lastActivity}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="btn-aviation-secondary">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
              <Button size="sm" className="btn-aviation-accent">
                <Video className="w-4 h-4 mr-2" />
                Video
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowChannelInfo(true)} className="hover:bg-accent/10">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message, index) => (
              <div key={message.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium">
                    {message.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{message.author}</span>
                    <Badge variant="outline" className="text-xs">
                      {message.authorRole}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                    {message.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">
                        HIGH PRIORITY
                      </Badge>
                    )}
                    {message.edited && (
                      <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                  </div>
                  
                  {message.replyTo && (
                    <div className="mb-2 p-2 bg-muted/50 rounded border-l-2 border-primary">
                      <p className="text-xs text-muted-foreground">Replying to message</p>
                    </div>
                  )}
                  
                  <div className="text-sm">
                    {formatMessageContent(message)}
                  </div>
                  
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {message.reactions.map((reaction, idx) => (
                        <Button key={idx} size="sm" variant="outline" className="h-6 text-xs">
                          {reaction.emoji} {reaction.users.length}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toast.info('React feature coming soon')}>
                      <Smile className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setReplyToMessage(message)}>
                      <Reply className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toast.info('Forward feature coming soon')}>
                      <Forward className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t bg-card">
          <div className="max-w-4xl mx-auto">
            {replyToMessage && (
              <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">Replying to </span>
                  <span className="font-medium">{replyToMessage.author}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setReplyToMessage(null)}>
                  ✕
                </Button>
              </div>
            )}
            
            {selectedFile && (
              <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  <span className="text-sm">{selectedFile.name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)}>
                  ✕
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pr-12"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  <label htmlFor="file-input">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                      <span>
                        <Paperclip className="w-3 h-3" />
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toast.info('Emoji picker coming soon')}>
                    <Smile className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Button onClick={handleSendMessage} disabled={!newMessage.trim() && !selectedFile} className="btn-aviation-primary">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {isTyping.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Online Users Sidebar */}
      <div className="w-64 border-l bg-card p-4 hidden lg:block">
        <h3 className="font-medium mb-4">Online Now ({onlineUsers.filter(u => u.status === 'online').length})</h3>
        <div className="space-y-2">
          {onlineUsers.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium">{user.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(user.status)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Info Dialog */}
      <Dialog open={showChannelInfo} onOpenChange={setShowChannelInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getChannelIcon(activeChannelData!)}
              {activeChannelData?.name}
            </DialogTitle>
            <DialogDescription>
              Channel information and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Members ({activeChannelData?.members})</h4>
              <div className="space-y-2">
                {onlineUsers.slice(0, 5).map(user => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs">{user.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Bell className="w-4 h-4 mr-2" />
                Mute Channel
              </Button>
              <Button variant="outline" className="flex-1">
                <Star className="w-4 h-4 mr-2" />
                Star Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}