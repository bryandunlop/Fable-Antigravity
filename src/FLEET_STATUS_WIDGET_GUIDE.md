# Fleet Status Widget - Implementation Guide

## 🎯 Overview

The Fleet Status Widget provides a comprehensive, real-time view of all Gulfstream G650s in your fleet, displaying flight status, service status, and cleaning status in one unified interface. This widget is now visible to all users across all dashboards.

## 📍 Where It Appears

### Main Dashboard (All Users)
- **Full Widget**: Shows complete fleet overview with detailed cards for each aircraft
- **Location**: Appears after Quick Actions, before Fleet Map
- **Accessible by**: All user roles (pilots, inflight, maintenance, scheduling, admin, etc.)

### Aircraft Status Page
- **Full Widget**: Comprehensive fleet view with quick access links
- **Location**: Main content area at `/aircraft`
- **Features**: Direct links to cleaning, maintenance, and tech log

### Role-Specific Dashboards

#### Maintenance Dashboard
- **Compact Widget**: Summary view with key metrics
- **Shows**: Active flights, in-service count, cleaning needs, total issues
- **Quick List**: All aircraft with status indicators

#### Scheduling Dashboard
- **Compact Widget**: Fleet availability overview
- **Shows**: Aircraft availability for scheduling
- **Integration**: Links to trip coordination

#### Lead Dashboard
- **Available**: Can be added for executive overview
- **Purpose**: High-level fleet health monitoring

## 🎨 Widget Modes

### Compact Mode
```tsx
<FleetStatusWidget compact={true} showDetailsLink={true} />
```

**Features:**
- Summary statistics (4 key metrics)
- Quick aircraft list with badges
- Minimal space usage
- Perfect for sidebar or secondary dashboards

**Displays:**
- ✈️ In Flight: X/Y aircraft
- ✓ In Service: X/Y aircraft  
- ✨ Need Cleaning: X aircraft
- ⚠️ Issues: X total issues

### Full Mode
```tsx
<FleetStatusWidget compact={false} showDetailsLink={true} />
```

**Features:**
- Detailed aircraft cards
- Full status breakdown per aircraft
- Progress indicators
- Quick action buttons
- Comprehensive information

**Displays:**
- Flight status with location
- Service status
- Cleaning status with history
- Hobbs time
- Next maintenance
- Utilization percentage
- Issue count
- Quick action buttons

## 📊 Status Types

### Flight Status
| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| In Flight | Green | ✈️ | Aircraft currently airborne |
| On Ground | Blue | 📍 | Aircraft landed, engines off |
| Taxi | Yellow | 📶 | Aircraft moving on ground |
| Parked | Gray | 📍 | Aircraft parked, not active |

### Service Status
| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| In Service | Green | ✓ | Aircraft available for operations |
| Out of Service | Red | ✕ | Aircraft not available (scheduled maintenance) |
| In Maintenance | Yellow | 🔧 | Aircraft undergoing maintenance |
| AOG | Red | ⚠️ | Aircraft on Ground - urgent issue |

### Cleaning Status
| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Verified | Green | ✨ | Cleaning completed and verified |
| Clean | Green | ✨ | Recently cleaned |
| Needs Cleaning | Red | ⚠️ | Cleaning required before next flight |
| Cleaning in Progress | Blue | ⏱️ | Currently being cleaned |

## 🔗 Integration Points

### With Aircraft Cleaning Tracker
- **Click "Cleaning" button**: Opens cleaning tracker with aircraft pre-selected
- **Status sync**: Real-time cleaning status from cleaning sessions
- **History**: Last cleaned timestamp and personnel

### With Maintenance Hub
- **Click "Maintenance" button**: Opens maintenance hub for specific aircraft
- **Issue count**: Shows open squawks/work orders
- **Next maintenance**: Displays upcoming scheduled maintenance

### With Tech Log
- **Click "Tech Log" button**: Opens tech log filtered by aircraft
- **Issue tracking**: Real-time count of open issues
- **Quick reporting**: Fast access to report new discrepancies

### With Scheduling
- **Availability**: Shows which aircraft are available for scheduling
- **Next flight**: Displays upcoming flight assignments
- **Utilization**: Shows aircraft usage percentage

## 📱 Responsive Design

The widget is fully responsive and adapts to different screen sizes:

### Desktop (>768px)
- Full cards with all information
- 4-column summary grid
- Horizontal action buttons

### Tablet (768px - 1024px)
- 2-column summary grid
- Stacked information
- Preserved functionality

### Mobile (<768px)
- Single column layout
- Compact cards
- Vertical action stack
- Touch-optimized buttons

## 🎯 User-Specific Benefits

### For Pilots
- **Quick aircraft readiness check** before flight
- **Cleaning verification** for cockpit
- **Issue awareness** before pre-flight
- **Link to tech log** for squawk review

### For Flight Attendants
- **Cabin cleaning status** at a glance
- **Track cleaning progress** in real-time
- **Verify cleanliness** before boarding
- **Access cleaning tracker** quickly

### For Maintenance
- **Fleet health overview** on dashboard
- **AOG alerts** prominent display
- **Work prioritization** by aircraft status
- **Quick access** to maintenance systems

### For Scheduling
- **Aircraft availability** for trip planning
- **Service status** for scheduling decisions
- **Utilization metrics** for resource optimization
- **Maintenance windows** visibility

### For Leadership
- **Fleet overview** executive dashboard
- **Operational status** at a glance
- **Issue tracking** for safety monitoring
- **Performance metrics** (utilization, issues)

## 💡 Best Practices

### Daily Use
1. **Morning Check**: Review fleet status at start of day
2. **Pre-Flight**: Verify assigned aircraft status before departure
3. **Post-Flight**: Check cleaning status after landing
4. **End of Day**: Review any new issues or maintenance needs

### For Maintenance Personnel
1. **Priority Setting**: Use AOG and issue counts to prioritize work
2. **Cleaning Coordination**: Check cleaning status before maintenance
3. **Status Updates**: Keep service status current
4. **Documentation**: Use quick links to update systems

### For Operations
1. **Flight Planning**: Check aircraft availability before scheduling
2. **Client Communication**: Verify aircraft cleanliness for VIP flights
3. **Risk Management**: Monitor issue counts and trends
4. **Resource Allocation**: Use utilization metrics for fleet planning

## 🔧 Configuration

### Mock Data
Currently uses local state with mock data. Update to Supabase:

```typescript
// In FleetStatusWidget.tsx
useEffect(() => {
  // Replace with Supabase query
  const fetchAircraft = async () => {
    const { data } = await supabase
      .from('aircraft')
      .select('*')
      .order('tailNumber');
    
    setAircraft(data);
  };
  
  fetchAircraft();
}, []);
```

### Real-Time Updates
Add subscription for live updates:

```typescript
// Subscribe to aircraft changes
const subscription = supabase
  .channel('aircraft_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'aircraft' },
    (payload) => {
      // Update aircraft state
      handleAircraftUpdate(payload);
    }
  )
  .subscribe();
```

## 🎨 Customization

### Colors
Defined in widget component:
- Flight status colors: Green, Blue, Yellow, Gray
- Service status colors: Green, Red, Yellow
- Cleaning status colors: Green, Red, Blue

### Icons
Uses `lucide-react` icons:
- Plane, MapPin, Activity for flight status
- CheckCircle, XCircle, Wrench, AlertTriangle for service
- Sparkles, Clock for cleaning

### Layout
- Compact mode: Summary stats + list
- Full mode: Detailed cards with actions
- Configurable: `compact` and `showDetailsLink` props

## 📈 Future Enhancements

### Planned Features
1. **Live Flight Tracking**: Integration with ADS-B/Satcom
2. **Weather Overlay**: Current conditions at aircraft location
3. **Crew Assignment**: Show assigned crew per aircraft
4. **Fuel Status**: Real-time fuel quantity
5. **Passenger Count**: Current PAX for active flights
6. **ETA Calculator**: Dynamic arrival time updates
7. **Maintenance Countdown**: Hours to next scheduled maintenance
8. **Historical Trends**: Utilization graphs

### Integration Opportunities
1. **ForeFlight Sync**: Auto-update flight status from ForeFlight
2. **Satcom Direct**: Live flight tracking
3. **Maintenance System**: Auto-populate from work orders
4. **Scheduling System**: Show scheduled flights
5. **Cleaning System**: Real-time cleaning session sync

## 🐛 Troubleshooting

### Widget not showing
- Check user permissions
- Verify component import
- Check route configuration

### Data not updating
- Check Supabase connection
- Verify subscription setup
- Check console for errors

### Status colors incorrect
- Verify status values match expected strings
- Check color mapping functions
- Review CSS classes

## 📚 Related Documentation

- [Aircraft Cleaning Guide](./AIRCRAFT_CLEANING_GUIDE.md)
- [Maintenance System Implementation](./MAINTENANCE_SYSTEM_IMPLEMENTATION.md)
- [ForeFlight Integration Guide](./FOREFLIGHT_INTEGRATION_GUIDE.md)

## 🔒 Permissions

All users can **view** fleet status. Write permissions vary:

| Action | Pilots | Inflight | Maintenance | Scheduling | Admin |
|--------|--------|----------|-------------|------------|-------|
| View Status | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update Cleaning | ✓ | ✓ | ✓ | - | ✓ |
| Update Service Status | - | - | ✓ | - | ✓ |
| Report Issues | ✓ | ✓ | ✓ | - | ✓ |
| Schedule Maintenance | - | - | ✓ | - | ✓ |

---

**Last Updated**: November 12, 2025  
**Version**: 1.0  
**Component**: `/components/FleetStatusWidget.tsx`
