import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useNotifications } from './hooks/useNotifications';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plane,
  Wrench,
  Shield,
  Users,
  Fuel,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  X,
  Eye,
  ExternalLink,
  Archive,
  Filter,
  MoreHorizontal,
  Zap,
  Target,
  Building2,
  Star,
  Coffee,
  BookOpen,
  RefreshCw,
  Loader2,
  RotateCcw,
  EllipsisVertical,
  Globe,
  Navigation,
  MapPin
} from 'lucide-react';

interface NotificationCenterProps {
  userRole: string;
}

export default function NotificationCenter({ userRole }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  
  const { 
    notifications, 
    loading, 
    error, 
    markAsRead, 
    markAsUnread,
    markAllAsRead, 
    deleteNotification, 
    refetch,
    counts 
  } = useNotifications({ userRole });

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'critical' ? 'text-red-500' : 
                     priority === 'high' ? 'text-orange-500' : 
                     priority === 'medium' ? 'text-yellow-500' : 'text-blue-500';

    switch (type) {
      case 'task':
        return <Target className={`w-4 h-4 ${iconClass}`} />;
      case 'audit':
        return <Shield className={`w-4 h-4 ${iconClass}`} />;
      case 'fuel':
        return <Fuel className={`w-4 h-4 ${iconClass}`} />;
      case 'maintenance':
        return <Wrench className={`w-4 h-4 ${iconClass}`} />;
      case 'safety':
        return <AlertTriangle className={`w-4 h-4 ${iconClass}`} />;
      case 'passenger':
        return <Users className={`w-4 h-4 ${iconClass}`} />;
      case 'schedule':
        return <Calendar className={`w-4 h-4 ${iconClass}`} />;
      case 'document':
        return <FileText className={`w-4 h-4 ${iconClass}`} />;
      case 'system':
        return <Zap className={`w-4 h-4 ${iconClass}`} />;
      case 'nas_impact':
        return <Globe className={`w-4 h-4 ${iconClass}`} />;
      case 'trip':
        return <MapPin className={`w-4 h-4 ${iconClass}`} />;
      default:
        return <Bell className={`w-4 h-4 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'high':
        return notification.priority === 'high' || notification.priority === 'critical';
      default:
        return true;
    }
  }).sort((a, b) => {
    // Sort by: unread first, then by priority, then by timestamp
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
    
    if (aPriority !== bPriority) return bPriority - aPriority;
    
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigate to the URL if it exists
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleActionClick = (notification: any, event: React.MouseEvent) => {
    event.stopPropagation();
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAsUnread = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsUnread(notificationId);
  };

  const handleMarkAsRead = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsRead(notificationId);
  };

  const handleDelete = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative p-2 hover:bg-accent"
        >
          <Bell className="w-5 h-5" />
          {counts.unread > 0 && (
            <Badge 
              className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${
                counts.critical > 0 ? 'bg-red-500 animate-pulse' : 'bg-primary'
              }`}
            >
              {counts.unread > 99 ? '99+' : counts.unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refetch}
                  disabled={loading}
                  className="text-xs"
                  title="Refresh notifications"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                {counts.unread > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs"
                    title="Mark all as read"
                  >
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                  title="Close notifications"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Quick stats */}
            {counts.critical > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {counts.critical} critical notification{counts.critical !== 1 ? 's' : ''} requiring immediate attention
                  </span>
                </div>
              </div>
            )}
            
            {/* Filter tabs */}
            <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">
                  All ({counts.total})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  Unread ({counts.unread})
                </TabsTrigger>
                <TabsTrigger value="high" className="text-xs">
                  Priority ({counts.highPriority})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent className="p-0">
            {error && (
              <div className="p-4 bg-red-50 border-b">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Failed to load notifications</span>
                  <Button variant="ghost" size="sm" onClick={refetch} className="ml-auto">
                    Retry
                  </Button>
                </div>
              </div>
            )}
            
            <ScrollArea className="h-96">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications to display</p>
                  <p className="text-xs mt-1">
                    {filter === 'unread' ? 'All caught up!' : 
                     filter === 'high' ? 'No high priority items' : 
                     'Check back later for updates'}
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredNotifications.map((notification, index) => (
                    <div key={notification.id} className="group">
                      <div 
                        className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                          !notification.isRead ? 'bg-blue-50/50' : ''
                        } ${notification.priority === 'critical' ? 'border-l-4 border-l-red-500' : 
                          notification.priority === 'high' ? 'border-l-4 border-l-orange-500' : ''} ${
                          notification.type === 'nas_impact' ? 'border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={`text-sm ${!notification.isRead ? 'font-medium' : 'font-normal'}`}>
                                    {notification.title}
                                  </p>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge 
                                    className={`text-xs ${getPriorityColor(notification.priority)}`}
                                  >
                                    {notification.priority}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {notification.module}
                                  </Badge>
                                  {notification.type === 'nas_impact' && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                                      <Globe className="w-3 h-3 mr-1" />
                                      NAS Impact
                                    </Badge>
                                  )}
                                  {notification.daysUntilDue !== undefined && (
                                    <Badge 
                                      className={`text-xs ${
                                        notification.daysUntilDue < 0 ? 'bg-red-100 text-red-800' :
                                        notification.daysUntilDue <= 1 ? 'bg-orange-100 text-orange-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      {notification.daysUntilDue < 0 
                                        ? `${Math.abs(notification.daysUntilDue)}d overdue`
                                        : notification.daysUntilDue === 0 
                                        ? 'Due today'
                                        : `${notification.daysUntilDue}d left`
                                      }
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {getTimeAgo(notification.timestamp)}
                                  </span>
                                </div>

                                {notification.assignedBy && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Assigned by {notification.assignedBy}
                                  </p>
                                )}
                              </div>
                              
                              {/* Actions dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                                    title="More actions"
                                  >
                                    <EllipsisVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {notification.isRead ? (
                                    <DropdownMenuItem
                                      onClick={(e) => handleMarkAsUnread(notification.id, e)}
                                      className="flex items-center gap-2"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      Mark as unread
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                                      className="flex items-center gap-2"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  )}
                                  {notification.actionUrl && (
                                    <DropdownMenuItem
                                      onClick={(e) => handleActionClick(notification, e)}
                                      className="flex items-center gap-2"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Open link
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={(e) => handleDelete(notification.id, e)}
                                    className="flex items-center gap-2 text-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {notification.actionUrl && notification.actionText && (
                              <div className="mt-3 flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="text-xs h-7"
                                  onClick={(e) => handleActionClick(notification, e)}
                                >
                                  {notification.actionText}
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < filteredNotifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}