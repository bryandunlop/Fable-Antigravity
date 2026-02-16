import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  Eye,
  Edit,
  Trash2,
  FileText,
  AlertCircle,
  Download,
  Pin,
  Archive,
  Clock,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  X
} from 'lucide-react';

interface ProceduralBulletin {
  id: string;
  title: string;
  content: string;
  category: string;
  roles: string[];
  effectiveDate: string;
  expirationDate?: string;
  author: string;
  createdDate: string;
  lastUpdated?: string;
  version: string;
  isPinned: boolean;
  isArchived: boolean;
  tags: string[];
  images?: { url: string; caption?: string }[];
  videos?: { url: string; title?: string; platform?: 'youtube' | 'vimeo' | 'other' }[];
  links?: { url: string; title: string }[];
}

interface ProceduralBulletinsProps {
  userRole: string;
  userName?: string;
}

export default function ProceduralBulletins({ userRole, userName = 'Current User' }: ProceduralBulletinsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBulletin, setSelectedBulletin] = useState<ProceduralBulletin | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Can create/edit/delete bulletins - now includes document-manager
  const canManage = ['admin', 'safety', 'lead', 'document-manager'].includes(userRole);

  // Categories
  const categories = [
    'Standard Operating Procedures',
    'Safety Procedures',
    'Maintenance Procedures',
    'Emergency Procedures',
    'Flight Operations',
    'Inflight Service',
    'Scheduling',
    'Administrative',
    'Compliance',
    'Training'
  ];

  // Role options
  const roleOptions = [
    { value: 'pilot', label: 'Pilots' },
    { value: 'inflight', label: 'Inflight Crew' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'safety', label: 'Safety' },
    { value: 'scheduling', label: 'Scheduling' },
    { value: 'document-manager', label: 'Document Manager' },
    { value: 'admin-assistant', label: 'Admin Assistant' },
    { value: 'lead', label: 'Leadership' },
    { value: 'admin', label: 'Admin' },
    { value: 'all', label: 'All Roles' }
  ];

  // Sample bulletins
  const [bulletins, setBulletins] = useState<ProceduralBulletin[]>([
    {
      id: 'PB-001',
      title: 'G650 Winter Operations Procedures',
      content: `# Winter Operations Procedures - Gulfstream G650

## Purpose
This bulletin outlines specific procedures for operating the G650 during winter conditions including cold weather operations, anti-icing, and de-icing procedures.

## Scope
Applies to all flight operations when:
- Outside Air Temperature (OAT) is at or below 10°C (50°F)
- Frost, ice, or snow is present or forecast
- Operating on contaminated runways

## Pre-Flight Procedures

### 1. Aircraft Inspection
- Conduct thorough visual inspection for frost, ice, or snow
- Pay special attention to:
  - Wing leading edges
  - Engine inlets
  - Pitot/static ports
  - Flight control surfaces
  - Antennas

### 2. Cold Weather Engine Start
- Use GPU for starting when available
- Monitor start parameters carefully
- Allow engines to stabilize before taxi

### 3. Anti-Ice/De-Ice Systems Check
- Verify all anti-ice systems operational
- Test engine and wing anti-ice
- Check pitot heat and static port heat

## De-Icing Procedures

### Type I Fluid (Unheated)
- Used for de-icing only
- Provides minimal holdover time
- Clear fluid

### Type IV Fluid (Heated)
- Used for both de-icing and anti-icing
- Extended holdover time
- Green fluid

### Holdover Times
Reference the current Holdover Time Tables based on:
- Fluid type
- Precipitation type and intensity
- Outside air temperature

## Takeoff Considerations

### Before Taxi
- Ensure all ice/snow removed
- Note holdover time start
- Brief crew on contaminated runway procedures

### Taxi
- Use caution on slippery surfaces
- Avoid sudden braking or sharp turns
- Keep taxi speed reduced

### Before Takeoff
- Verify holdover time not expired
- Final visual check of critical surfaces
- Confirm anti-ice systems as required

## Landing Considerations

### Approach
- Add appropriate speed additives for conditions
- Brief crew on braking action reports
- Plan for longer landing distance

### Touchdown
- Use appropriate autobrake setting
- Avoid heavy braking on contaminated surfaces
- Maintain directional control

## Emergency Procedures

### Unexpected Ice Accumulation in Flight
1. Exit icing conditions immediately
2. Activate all anti-ice systems
3. Notify ATC and request priority handling
4. Consider diversion if icing persists

### Ground Icing During Delay
- Monitor holdover time
- If expired, return for re-treatment
- Do not attempt takeoff

## Additional Resources
- G650 AFM Chapter 7 - Systems
- G650 AFM Chapter 10 - Limitations
- Company Winter Operations Manual
- Current Holdover Time Tables

## Revision History
- Version 1.0 - Initial Release
- Version 1.1 - Updated holdover time references

For questions or clarifications, contact the Safety Department.`,
      category: 'Flight Operations',
      roles: ['pilot', 'admin', 'lead'],
      effectiveDate: '2024-11-01',
      author: 'Chief Pilot Johnson',
      createdDate: '2024-10-15',
      lastUpdated: '2024-10-20',
      version: '1.1',
      isPinned: true,
      isArchived: false,
      tags: ['winter', 'de-icing', 'weather', 'G650']
    },
    {
      id: 'PB-002',
      title: 'Cabin Service Standards - VIP Flights',
      content: `# VIP Flight Service Standards

## Pre-Flight Cabin Preparation

### Timing
- Begin preparation minimum 2 hours before scheduled departure
- Complete all setup 30 minutes before passenger arrival

### Cleanliness Standards
- Deep clean all surfaces
- Polish all wood and metal surfaces
- Vacuum carpets and upholstery
- Clean and polish lavatories
- Ensure galley is spotless

### Configuration
- Configure seating per passenger preference
- Set up meeting table if requested
- Prepare sleep configurations as needed

## Catering Setup

### Galley Organization
- Stock per catering order
- Verify special dietary items
- Check expiration dates on all items
- Organize for efficient service

### Beverage Service
- Stock full bar inventory
- Chill champagne and white wines
- Prepare coffee station
- Stock variety of non-alcoholic options

## Service Protocol

### Passenger Greeting
- Professional appearance required
- Warm, friendly greeting
- Offer coat/jacket storage
- Provide safety briefing

### Meal Service
- Follow passenger preferences
- Present courses professionally
- Maintain cleanliness during service
- Accommodate special requests

### In-Flight Service
- Anticipate passenger needs
- Maintain discretion
- Respond promptly to requests
- Keep cabin tidy throughout flight

## Post-Flight Procedures

### Cabin Securing
- Secure all loose items
- Close and latch all compartments
- Turn off unnecessary systems
- Complete cabin checklist

### Passenger Departure
- Ensure all passenger items removed
- Check for lost items
- Professional farewell
- Coordinate ground transportation if needed

## Special Considerations

### International Flights
- Prepare customs/immigration forms
- Brief passengers on arrival procedures
- Coordinate with FBO for customs clearance

### High-Profile Passengers
- Enhanced discretion required
- Photography prohibited
- Limit social media discussion
- Report any security concerns immediately

For questions, contact Inflight Services Manager.`,
      category: 'Inflight Service',
      roles: ['inflight', 'admin'],
      effectiveDate: '2024-09-01',
      author: 'Inflight Services Manager Davis',
      createdDate: '2024-08-20',
      version: '2.0',
      isPinned: true,
      isArchived: false,
      tags: ['VIP', 'service', 'catering', 'cabin']
    },
    {
      id: 'PB-003',
      title: 'Aircraft Towing Procedures - G650',
      content: `# G650 Towing Procedures

## General Safety Requirements

### Personnel Requirements
- Minimum 2 qualified personnel required
- Tow supervisor must be certified
- All personnel must complete towing training
- High-visibility vests required

### Equipment Requirements
- Approved tow bar for G650
- Serviceable tug with adequate capacity
- Wing walkers equipped with wands
- Communication devices (radios or hand signals)

## Pre-Towing Inspection

### Aircraft Checks
- Parking brake released
- Hydraulic systems off
- Nose gear steering disconnect pin installed
- All doors and panels closed and secured
- No personnel inside aircraft

### Equipment Checks
- Tow bar inspected for damage
- Tug brakes operational
- Tow bar properly attached to nose gear
- Safety pins installed

## Towing Procedures

### Before Movement
1. Post wing walkers at each wingtip
2. Verify clear path to destination
3. Check for overhead obstructions
4. Brief all personnel on route and signals
5. Establish communication

### During Towing
- Maintain walking pace (3 mph max)
- Wing walkers maintain 10-foot clearance
- Stop immediately if any concerns
- Avoid sharp turns
- Monitor all clearances continuously

### Stopping
- Gradual brake application only
- Never apply brakes suddenly
- Ensure aircraft fully stopped before disconnecting

## Post-Towing

### Aircraft Securing
- Set parking brake
- Remove nose gear steering disconnect pin
- Chock main landing gear
- Install ground safety locks as required

### Equipment
- Remove tow bar properly
- Inspect tow bar for damage
- Return equipment to storage
- Document any issues

## Emergency Procedures

### Loss of Brakes
- Use hand signals to stop immediately
- Deploy chocks if available
- Do not disconnect tow bar
- Call for assistance

### Aircraft Damage During Tow
- Stop immediately
- Secure aircraft
- Notify maintenance supervisor
- Document damage
- Complete incident report

## Prohibited Actions
- Never tow with personnel inside aircraft
- Never exceed 3 mph towing speed
- Never tow in high winds (>25 knots)
- Never tow at night without proper lighting
- Never tow without wing walkers

## Training Requirements
- Initial towing certification required
- Annual recurrent training
- Specific G650 towing qualification
- Documented competency check

For questions or to report issues, contact Maintenance Supervisor.`,
      category: 'Maintenance Procedures',
      roles: ['maintenance', 'admin', 'lead'],
      effectiveDate: '2024-10-01',
      author: 'Maintenance Manager Wilson',
      createdDate: '2024-09-15',
      version: '1.0',
      isPinned: false,
      isArchived: false,
      tags: ['towing', 'ground-ops', 'safety', 'G650']
    },
    {
      id: 'PB-004',
      title: 'Crew Rest and Duty Time Guidelines',
      content: `# Crew Rest and Duty Time Guidelines

## Purpose
Ensure all crew members receive adequate rest to maintain safety and operational effectiveness.

## Flight Crew Duty Limitations

### Daily Duty Period
- Maximum 14 hours duty time
- May extend to 16 hours with adequate rest
- Must have minimum 10 hours rest before next duty

### Flight Time Limitations
- 8 hours in any 24 consecutive hours
- 100 hours in any calendar month
- 1000 hours in any calendar year

### Rest Requirements
- Minimum 10 hours rest between duty periods
- Minimum 24 consecutive hours rest in any 7 days
- Rest period begins when crew is released from duty

## Inflight Crew Duty Limitations

### Daily Duty Period
- Maximum 14 hours duty time
- Includes pre-flight preparation
- Travel to/from airport counts as duty time

### Rest Requirements
- Minimum 9 hours rest between duty periods
- Rest must include opportunity for 8 hours uninterrupted sleep
- Hotel accommodation must meet rest standards

## Fatigue Risk Factors

### High-Risk Situations
- WOCL operations (0200-0600 local)
- Multiple time zone crossings
- Back-to-back international flights
- Reduced crew rest
- Extended duty periods

### Fatigue Reporting
- Any crew member may report fatigue
- No penalty for fatigue-related duty declination
- Confidential reporting available
- Company supports conservative decision-making

## Scheduling Considerations

### Trip Planning
- Consider time zones and circadian disruption
- Allow adequate rest at all destinations
- Avoid back-to-back high-stress operations
- Build in buffer time for delays

### International Operations
- Minimum 24 hours rest after crossing 4+ time zones
- Minimum 36 hours rest after crossing 8+ time zones
- Acclimation time for extended international trips

## Crew Responsibilities

### Pre-Duty
- Obtain adequate rest before duty period
- Report to duty fit for service
- Notify scheduling of any rest concerns
- Decline duty if fatigued

### During Duty
- Monitor own fatigue levels
- Use crew rest facilities when available
- Report fatigue to PIC/supervisor
- Make conservative decisions

### Post-Duty
- Ensure adequate rest before next duty
- Report any irregular rest situations
- Document fatigue-related issues

## Management Responsibilities

### Scheduling
- Build schedules within limitations
- Monitor crew duty/rest patterns
- Respond to fatigue reports
- Provide adequate backup crews

### Support
- Provide suitable rest facilities
- Ensure hotel accommodations meet standards
- Support crew fatigue reports
- Maintain non-punitive fatigue policy

## Fatigue Self-Assessment

Ask yourself:
- Did I get adequate sleep last night?
- Am I experiencing circadian disruption?
- Have I had multiple short rest periods?
- Am I experiencing stress or personal issues?
- Do I feel alert and focused?

If any concerns: Report to supervisor before accepting duty.

## Resources
- Company Fatigue Risk Management Program
- NASA Fatigue Countermeasures Guide
- FAA Crew Rest Requirements
- Safety Department Fatigue Hotline

Contact Safety Department with questions or concerns.`,
      category: 'Safety Procedures',
      roles: ['pilot', 'inflight', 'scheduling', 'admin', 'lead'],
      effectiveDate: '2024-08-01',
      author: 'Safety Director Thompson',
      createdDate: '2024-07-15',
      lastUpdated: '2024-09-01',
      version: '1.2',
      isPinned: true,
      isArchived: false,
      tags: ['fatigue', 'duty-time', 'rest', 'safety', 'crew']
    },
    {
      id: 'PB-005',
      title: 'Hazmat Handling and Documentation',
      content: `# Hazardous Materials Handling Procedures

## Scope
All personnel handling, transporting, or storing hazardous materials.

## Classification
- Flammable liquids (fuel, solvents)
- Compressed gases (oxygen, nitrogen)
- Corrosives (batteries, cleaning agents)
- Toxic materials

## Handling Requirements
- Proper PPE required
- Adequate ventilation
- No smoking or open flames
- Proper container labeling
- Spill kits readily available

## Storage
- Separate incompatible materials
- Proper containment
- Adequate ventilation
- Restricted access
- Regular inspections

## Documentation
- Material Safety Data Sheets (MSDS/SDS)
- Inventory tracking
- Usage logs
- Disposal records
- Training records

## Emergency Response
- Know location of spill kits
- Evacuate if necessary
- Contain spill if safe to do so
- Notify supervisor immediately
- Call emergency services if needed

## Training
- Initial hazmat awareness training
- Annual recurrent training
- Specific material handling training
- Emergency response procedures

Contact Safety or Maintenance for questions.`,
      category: 'Safety Procedures',
      roles: ['maintenance', 'admin', 'safety'],
      effectiveDate: '2024-06-01',
      author: 'Safety Officer Martinez',
      createdDate: '2024-05-10',
      version: '1.0',
      isPinned: false,
      isArchived: false,
      tags: ['hazmat', 'safety', 'maintenance', 'compliance']
    }
  ]);

  // Create bulletin form state
  const [newBulletin, setNewBulletin] = useState<Partial<ProceduralBulletin>>({
    title: '',
    content: '',
    category: '',
    roles: [],
    effectiveDate: new Date().toISOString().split('T')[0],
    author: userName,
    version: '1.0',
    isPinned: false,
    isArchived: false,
    tags: [],
    images: [],
    videos: [],
    links: []
  });

  // Temporary state for adding media
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  // Filter bulletins based on user role and search
  const filteredBulletins = bulletins.filter(bulletin => {
    // Role filter
    if (!bulletin.roles.includes(userRole) && !bulletin.roles.includes('all')) {
      return false;
    }

    // Archived filter
    if (!showArchived && bulletin.isArchived) {
      return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && bulletin.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        bulletin.title.toLowerCase().includes(query) ||
        bulletin.content.toLowerCase().includes(query) ||
        bulletin.tags.some(tag => tag.toLowerCase().includes(query)) ||
        bulletin.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Sort: pinned first, then by date
  const sortedBulletins = [...filteredBulletins].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
  });

  const handleCreateBulletin = () => {
    if (!newBulletin.title || !newBulletin.content || !newBulletin.category || !newBulletin.roles?.length) {
      toast.error('Please fill in all required fields');
      return;
    }

    const bulletin: ProceduralBulletin = {
      id: `PB-${String(bulletins.length + 1).padStart(3, '0')}`,
      title: newBulletin.title,
      content: newBulletin.content,
      category: newBulletin.category,
      roles: newBulletin.roles,
      effectiveDate: newBulletin.effectiveDate || new Date().toISOString().split('T')[0],
      expirationDate: newBulletin.expirationDate,
      author: userName,
      createdDate: new Date().toISOString().split('T')[0],
      version: newBulletin.version || '1.0',
      isPinned: newBulletin.isPinned || false,
      isArchived: false,
      tags: newBulletin.tags || [],
      images: newBulletin.images || [],
      videos: newBulletin.videos || [],
      links: newBulletin.links || []
    };

    setBulletins([bulletin, ...bulletins]);
    setIsCreateDialogOpen(false);
    setNewBulletin({
      title: '',
      content: '',
      category: '',
      roles: [],
      effectiveDate: new Date().toISOString().split('T')[0],
      author: userName,
      version: '1.0',
      isPinned: false,
      isArchived: false,
      tags: [],
      images: [],
      videos: [],
      links: []
    });
    toast.success('Procedural bulletin created successfully');
  };

  const handleViewBulletin = (bulletin: ProceduralBulletin) => {
    setSelectedBulletin(bulletin);
    setIsViewDialogOpen(true);
  };

  const handleTogglePin = (bulletinId: string) => {
    setBulletins(bulletins.map(b => 
      b.id === bulletinId ? { ...b, isPinned: !b.isPinned } : b
    ));
    toast.success('Bulletin updated');
  };

  const handleArchive = (bulletinId: string) => {
    setBulletins(bulletins.map(b => 
      b.id === bulletinId ? { ...b, isArchived: !b.isArchived } : b
    ));
    toast.success('Bulletin archived');
  };

  const handleDelete = (bulletinId: string) => {
    setBulletins(bulletins.filter(b => b.id !== bulletinId));
    toast.success('Bulletin deleted');
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      pilot: 'bg-blue-100 text-blue-800',
      inflight: 'bg-purple-100 text-purple-800',
      maintenance: 'bg-orange-100 text-orange-800',
      safety: 'bg-red-100 text-red-800',
      scheduling: 'bg-green-100 text-green-800',
      admin: 'bg-gray-100 text-gray-800',
      all: 'bg-slate-100 text-slate-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleRoleToggle = (role: string) => {
    const currentRoles = newBulletin.roles || [];
    if (role === 'all') {
      setNewBulletin({ ...newBulletin, roles: ['all'] });
    } else {
      const updatedRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role && r !== 'all')
        : [...currentRoles.filter(r => r !== 'all'), role];
      setNewBulletin({ ...newBulletin, roles: updatedRoles });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-muted-foreground mb-2">
            <BookOpen className="w-8 h-8" />
            Procedural Bulletins
          </h1>
          <p className="text-sm text-muted-foreground">
            Reference library for standard operating procedures and guidelines
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Bulletin
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search bulletins by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-64">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showArchived"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked as boolean)}
              />
              <Label htmlFor="showArchived" className="cursor-pointer">
                Show Archived
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulletins List */}
      <div className="space-y-4">
        {sortedBulletins.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No procedural bulletins found</p>
            </CardContent>
          </Card>
        ) : (
          sortedBulletins.map(bulletin => (
            <Card 
              key={bulletin.id} 
              className={`hover:shadow-md transition-shadow ${
                bulletin.isPinned ? 'border-blue-500 border-2' : ''
              } ${bulletin.isArchived ? 'opacity-60' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {bulletin.isPinned && (
                        <Pin className="w-4 h-4 text-blue-600" />
                      )}
                      {bulletin.isArchived && (
                        <Archive className="w-4 h-4 text-gray-600" />
                      )}
                      <CardTitle className="text-xl">{bulletin.title}</CardTitle>
                    </div>
                    <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline">{bulletin.category}</Badge>
                      <Badge variant="secondary">v{bulletin.version}</Badge>
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3" />
                        Effective: {new Date(bulletin.effectiveDate).toLocaleDateString()}
                      </span>
                      {bulletin.expirationDate && (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <Clock className="w-3 h-3" />
                          Expires: {new Date(bulletin.expirationDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs">
                        <User className="w-3 h-3" />
                        {bulletin.author}
                      </span>
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {bulletin.roles.map(role => (
                        <Badge key={role} className={getRoleBadgeColor(role)}>
                          {roleOptions.find(r => r.value === role)?.label || role}
                        </Badge>
                      ))}
                    </div>
                    {bulletin.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {bulletin.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewBulletin(bulletin)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(bulletin.id)}
                        >
                          <Pin className={`w-4 h-4 ${bulletin.isPinned ? 'text-blue-600' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(bulletin.id)}
                        >
                          <Archive className={`w-4 h-4 ${bulletin.isArchived ? 'text-orange-600' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(bulletin.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {bulletin.content.substring(0, 200)}...
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Bulletin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Procedural Bulletin</DialogTitle>
            <DialogDescription>
              Create a reference document for specific roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newBulletin.title}
                onChange={(e) => setNewBulletin({ ...newBulletin, title: e.target.value })}
                placeholder="Enter bulletin title..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={newBulletin.category} 
                  onValueChange={(value) => setNewBulletin({ ...newBulletin, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={newBulletin.version}
                  onChange={(e) => setNewBulletin({ ...newBulletin, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effectiveDate">Effective Date *</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={newBulletin.effectiveDate}
                  onChange={(e) => setNewBulletin({ ...newBulletin, effectiveDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={newBulletin.expirationDate || ''}
                  onChange={(e) => setNewBulletin({ ...newBulletin, expirationDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Applicable Roles *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {roleOptions.map(role => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={newBulletin.roles?.includes(role.value) || false}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <Label htmlFor={`role-${role.value}`} className="cursor-pointer">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={newBulletin.tags?.join(', ')}
                onChange={(e) => setNewBulletin({ 
                  ...newBulletin, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                })}
                placeholder="winter, safety, maintenance..."
              />
            </div>
            <div>
              <Label htmlFor="content">Content * (Markdown supported)</Label>
              <Textarea
                id="content"
                value={newBulletin.content}
                onChange={(e) => setNewBulletin({ ...newBulletin, content: e.target.value })}
                placeholder="Enter bulletin content using Markdown formatting..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPinned"
                checked={newBulletin.isPinned}
                onCheckedChange={(checked) => setNewBulletin({ ...newBulletin, isPinned: checked as boolean })}
              />
              <Label htmlFor="isPinned" className="cursor-pointer">
                Pin this bulletin (appears at top of list)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBulletin}>
              Create Bulletin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bulletin Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedBulletin && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">
                      {selectedBulletin.isPinned && <Pin className="w-5 h-5 text-blue-600 inline mr-2" />}
                      {selectedBulletin.title}
                    </DialogTitle>
                    <DialogDescription>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{selectedBulletin.category}</Badge>
                          <Badge variant="secondary">v{selectedBulletin.version}</Badge>
                          {selectedBulletin.roles.map(role => (
                            <Badge key={role} className={getRoleBadgeColor(role)}>
                              {roleOptions.find(r => r.value === role)?.label || role}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {selectedBulletin.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Effective: {new Date(selectedBulletin.effectiveDate).toLocaleDateString()}
                          </span>
                          {selectedBulletin.expirationDate && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <Clock className="w-3 h-3" />
                              Expires: {new Date(selectedBulletin.expirationDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {selectedBulletin.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {selectedBulletin.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </DialogHeader>
              <div className="mt-6 prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap font-sans">
                  {selectedBulletin.content}
                </div>
              </div>
              {selectedBulletin.lastUpdated && (
                <div className="mt-6 pt-6 border-t text-xs text-muted-foreground">
                  Last updated: {new Date(selectedBulletin.lastUpdated).toLocaleDateString()}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}