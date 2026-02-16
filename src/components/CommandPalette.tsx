import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Search,
  Plane,
  Users,
  FileText,
  Wrench,
  Calendar,
  Shield,
  Package,
  Utensils,
  ClipboardCheck,
  UserCheck,
  Target,
  BarChart3,
  AlertTriangle,
  MessageSquare,
  Clock,
  Boxes,
  MapPin,
  Monitor,
  Sliders,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  icon: any;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

const searchableItems: SearchResult[] = [
  {
    id: 'flight-operations-center',
    title: 'Flight Operations Center',
    description: 'Integrated flight management dashboard with real-time data',
    href: '/flight-operations-center',
    category: 'Flight Operations',
    icon: Monitor,
    keywords: ['flight operations', 'center', 'dashboard', 'integrated', 'real-time', 'flight management', 'ops center', 'foc']
  },
  // {
  //   id: 'flight-family',
  //   title: 'Flight Family',
  //   description: 'Team messaging and communication platform',
  //   href: '/flight-family',
  //   category: 'Communication',
  //   icon: MessageSquare,
  //   keywords: ['message', 'chat', 'team', 'communication', 'flight family', 'crew', 'talk']
  // },
  {
    id: 'aircraft-status',
    title: 'Aircraft Status',
    description: 'Monitor fleet status and locations',
    href: '/aircraft',
    category: 'Flight Operations',
    icon: Plane,
    keywords: ['aircraft', 'fleet', 'status', 'tracking', 'plane', 'tail number']
  },
  {
    id: 'frat-form',
    title: 'FRAT Forms',
    description: 'Flight Risk Assessment Tool',
    href: '/frat',
    category: 'Safety',
    icon: FileText,
    keywords: ['frat', 'risk', 'assessment', 'safety', 'flight']
  },
  {
    id: 'enhanced-frat',
    title: 'Enhanced FRAT',
    description: 'Auto-populated Flight Risk Assessment with system integration',
    href: '/frat/enhanced',
    category: 'Safety',
    icon: Shield,
    keywords: ['enhanced frat', 'auto-populated', 'risk assessment', 'integrated', 'smart frat']
  },
  {
    id: 'frat-review',
    title: 'FRAT Review',
    description: 'Review and approve FRAT submissions',
    href: '/frat/review',
    category: 'Safety',
    icon: FileText,
    keywords: ['frat', 'review', 'approve', 'safety', 'pending']
  },
  {
    id: 'passenger-database',
    title: 'Passenger Database',
    description: 'Manage passenger profiles and preferences',
    href: '/passenger-database',
    category: 'Service',
    icon: Users,
    keywords: ['passenger', 'guest', 'preferences', 'allergies', 'vip', 'database']
  },
  {
    id: 'maintenance',
    title: 'Maintenance Board',
    description: 'Track maintenance status and schedules',
    href: '/maintenance',
    category: 'Maintenance',
    icon: Wrench,
    keywords: ['maintenance', 'mx', 'repair', 'service', 'scheduled']
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'View and manage flight schedules',
    href: '/schedule',
    category: 'Operations',
    icon: Calendar,
    keywords: ['schedule', 'calendar', 'flights', 'crew', 'assignment']
  },
  {
    id: 'safety-center',
    title: 'Safety Center',
    description: 'Access all safety reporting and management tools',
    href: '/safety',
    category: 'Safety',
    icon: Shield,
    keywords: ['safety', 'center', 'dashboard', 'compliance', 'sms', 'hazard', 'asap', 'waiver', 'audit', 'reporting']
  },
  {
    id: 'user-safety',
    title: 'User Safety',
    description: 'Submit safety reports, caught working safely, waivers, and track compliance',
    href: '/user-safety',
    category: 'Safety',
    icon: UserCheck,
    keywords: ['user safety', 'caught working safely', 'cws', 'safety participation', 'waiver request', 'hazard report', 'audit', 'document compliance', 'safety submissions', 'recognize', 'safe work']
  },
  {
    id: 'hazard-reporting',
    title: 'Hazard Reporting',
    description: 'Report and manage safety hazards',
    href: '/safety/hazards',
    category: 'Safety',
    icon: AlertTriangle,
    keywords: ['hazard', 'report', 'incident', 'safety', 'asias']
  },
  {
    id: 'form-field-manager',
    title: 'Form Field Manager',
    description: 'Customize FRAT, GRAT, Hazard, ASAP, Waiver, and Audit forms',
    href: '/safety/form-fields',
    category: 'Safety',
    icon: Settings,
    keywords: ['form', 'field', 'manager', 'frat', 'grat', 'hazard', 'asap', 'waiver', 'audit', 'customize', 'configure', 'safety', 'scoring', 'assessment', 'template']
  },
  {
    id: 'form-field-manager',
    title: 'Form Field Manager',
    description: 'Customize FRAT and GRAT form fields and scoring',
    href: '/safety/form-fields',
    category: 'Safety',
    icon: Sliders,
    keywords: ['form', 'field', 'manager', 'frat', 'grat', 'customize', 'configure', 'safety', 'scoring', 'assessment']
  },
  {
    id: 'upcoming-flights',
    title: 'Upcoming Flights',
    description: 'Flight assignments with passenger manifests',
    href: '/upcoming-flights',
    category: 'Service',
    icon: Calendar,
    keywords: ['flights', 'upcoming', 'assignments', 'manifest', 'passengers', 'inflight']
  },
  {
    id: 'catering-orders',
    title: 'Catering Orders',
    description: 'Manage flight catering orders with passenger preferences',
    href: '/catering-orders',
    category: 'Service',
    icon: Utensils,
    keywords: ['catering', 'orders', 'food', 'menu', 'passenger', 'allergies', 'flight']
  },
  {
    id: 'catering-tracker',
    title: 'Catering Tracker',
    description: 'Track caterers and menu items by airport',
    href: '/catering-tracker',
    category: 'Service',
    icon: Utensils,
    keywords: ['catering', 'food', 'menu', 'caterer', 'airport', 'tracker']
  },
  {
    id: 'aog-management',
    title: 'AOG Management',
    description: 'Aircraft on Ground emergency management',
    href: '/aog-management',
    category: 'Maintenance',
    icon: AlertTriangle,
    keywords: ['aog', 'emergency', 'aircraft on ground', 'critical', 'maintenance']
  },

  {
    id: 'document-management',
    title: 'Document Management',
    description: 'Publish, manage, and distribute compliance documents',
    href: '/document-management',
    category: 'Documents',
    icon: FileText,
    keywords: ['document', 'management', 'compliance', 'publish', 'distribute', 'upload', 'doc', 'manual']
  },
  {
    id: 'document-request',
    title: 'Document Request',
    description: 'Request new documents or changes to existing ones',
    href: '/document-management',
    category: 'Documents',
    icon: MessageSquare,
    keywords: ['document', 'request', 'change', 'new', 'update', 'submit', 'ask', 'proposal']
  },
  {
    id: 'document-center',
    title: 'Document Center',
    description: 'Access manuals and compliance documents',
    href: '/documents',
    category: 'Documents',
    icon: Package,
    keywords: ['document', 'center', 'manual', 'compliance', 'library', 'access', 'read']
  },
  {
    id: 'trip-coordination',
    title: 'Trip Coordination',
    description: 'Tile-based trip management with collaborative checklists and notifications',
    href: '/trip-coordination',
    category: 'Scheduling',
    icon: MapPin,
    keywords: ['trip', 'coordination', 'collaborative', 'workspace', 'schedulers', 'planning', 'requirements', 'catering', 'hotels', 'ground transport', 'fuel', 'permits', 'team work', 'checklist', 'tiles', 'notifications', 'deadlines']
  },
  {
    id: 'crew-management',
    title: 'Crew Management',
    description: 'Comprehensive crew resource management, duty times, and currency tracking',
    href: '/crew-management',
    category: 'Scheduling',
    icon: Clock,
    keywords: ['crew', 'management', 'duty', 'time', 'fatigue', 'compliance', 'far', 'scheduling', 'currency', 'pilot', 'qualification', 'training', 'medical', 'crew scheduling']
  },
  {
    id: 'parts-inventory',
    title: 'Parts & Inventory',
    description: 'Track parts inventory and procurement with myCMP integration',
    href: '/parts-inventory',
    category: 'Maintenance',
    icon: Boxes,
    keywords: ['parts', 'inventory', 'stock', 'procurement', 'mycmp', 'camp', 'vendor', 'purchase', 'order', 'supplies', 'maintenance parts']
  },
  {
    id: 'crew-scheduling-workload',
    title: 'Crew Workload & Travel',
    description: 'Workload planning, crew balance optimization, and travel tracking',
    href: '/crew-scheduling-workload',
    category: 'Scheduling',
    icon: BarChart3,
    keywords: ['crew', 'workload', 'planning', 'balance', 'scheduling', 'forward looking', 'trip days', 'ron', 'standby', 'utilization', 'crew scheduling', 'balance workload', 'historical', 'trends', 'monthly planning']
  }
];

export default function CommandPalette({ isOpen, onClose, userRole }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredResults = searchableItems.filter(item => {
    if (!query) return true;

    const searchTerm = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
    );
  }).slice(0, 8); // Limit to 8 results

  const handleSelect = (href: string) => {
    navigate(href);
    onClose();
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex].href);
        }
        break;
    }
  };

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-2xl" aria-describedby="command-palette-description">
        <DialogTitle className="sr-only">
          Global Search
        </DialogTitle>
        <DialogDescription id="command-palette-description" className="sr-only">
          Search for modules, aircraft, passengers, and other flight operations resources. Use arrow keys to navigate and Enter to select.
        </DialogDescription>

        <div className="border-b">
          <div className="flex items-center px-4 py-3">
            <Search className="w-4 h-4 text-muted-foreground mr-3" />
            <Input
              placeholder="Search for modules, aircraft, passengers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filteredResults.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredResults.map((result, index) => {
                const Icon = result.icon;
                return (
                  <div
                    key={result.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                    onClick={() => handleSelect(result.href)}
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </DialogContent>
    </Dialog>
  );
}