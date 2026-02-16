import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { HelpCircle, X, Keyboard, Lightbulb, AlertCircle } from 'lucide-react';

interface HelpTip {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'warning' | 'info';
  shortcut?: string;
}

interface ContextualHelpProps {
  page: string;
  userRole: string;
}

const helpContent: Record<string, HelpTip[]> = {
  'dashboard': [
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      description: 'Use the role-specific quick action cards to access your most common tasks quickly.',
      type: 'tip'
    },
    {
      id: 'command-palette',
      title: 'Global Search',
      description: 'Press Cmd+K (Mac) or Ctrl+K (Windows) to open the command palette and search for anything.',
      type: 'tip',
      shortcut: '⌘K'
    },
    {
      id: 'emergency-actions',
      title: 'Emergency Actions',
      description: 'Emergency buttons in the top-right are always accessible for critical situations.',
      type: 'warning'
    }
  ],
  'frat': [
    {
      id: 'frat-scoring',
      title: 'FRAT Scoring',
      description: 'Scores are automatically calculated. Green (0-10) = Low Risk, Yellow (11-20) = Medium Risk, Red (21+) = High Risk.',
      type: 'info'
    },
    {
      id: 'auto-save',
      title: 'Auto-Save',
      description: 'Your FRAT form is automatically saved as you fill it out. You can safely leave and return.',
      type: 'tip'
    }
  ],
  'passenger-database': [
    {
      id: 'allergy-alerts',
      title: 'Critical Allergy Alerts',
      description: 'Passengers with critical allergies are highlighted with red borders and alert icons for flight safety.',
      type: 'warning'
    },
    {
      id: 'vip-levels',
      title: 'VIP Status',
      description: 'VIP levels: Standard (gray), Gold (yellow), Platinum (blue), Diamond (purple) determine service level.',
      type: 'info'
    }
  ],
  'aircraft': [
    {
      id: 'status-colors',
      title: 'Status Indicators',
      description: 'Green = Available, Blue = In Flight, Yellow = Maintenance, Red = AOG (Aircraft on Ground).',
      type: 'info'
    },
    {
      id: 'live-tracking',
      title: 'Live Tracking',
      description: 'Aircraft with live tracking show real-time position, altitude, and speed via Satcom Direct.',
      type: 'tip'
    }
  ]
};

export default function ContextualHelp({ page, userRole }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const tips = helpContent[page] || [];
  
  if (tips.length === 0) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertCircle;
      case 'tip': return Lightbulb;
      default: return HelpCircle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-orange-600 bg-orange-100';
      case 'tip': return 'text-green-600 bg-green-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <>
      {/* Help Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-6 z-40 md:bottom-6 rounded-full w-12 h-12 p-0 shadow-lg"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      {/* Help Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Help Card */}
          <Card className="fixed bottom-6 left-6 right-6 md:left-6 md:right-auto md:w-96 z-50 max-h-96 overflow-y-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Page Help
                  </CardTitle>
                  <CardDescription>
                    Tips for {page.charAt(0).toUpperCase() + page.slice(1)}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {tips.map((tip) => {
                const Icon = getTypeIcon(tip.type);
                return (
                  <div key={tip.id} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded ${getTypeColor(tip.type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{tip.title}</h4>
                          {tip.shortcut && (
                            <Badge variant="outline" className="text-xs">
                              <Keyboard className="w-3 h-3 mr-1" />
                              {tip.shortcut}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-2 border-t text-xs text-muted-foreground text-center">
                Press <kbd className="px-1 py-0.5 bg-muted rounded font-mono">?</kbd> for keyboard shortcuts
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}