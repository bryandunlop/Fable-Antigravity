# Aircraft Cleaning Status Tracker - User Guide

## 🎯 Overview

The Aircraft Cleaning Status Tracker provides a comprehensive system for managing and tracking cleaning operations across your Gulfstream G650 fleet. This tool enables pilots, flight attendants, and maintenance crews to coordinate cleaning activities, track progress in real-time, and maintain high cleanliness standards.

## 👥 User Access

**Who can access:** Pilots, Inflight Crew, Maintenance, Admins, Leadership

**Navigation paths:**
- **Inflight Crew**: Inflight Services → Aircraft Cleaning
- **Maintenance**: Maintenance → Aircraft Cleaning
- **Pilots**: Maintenance → Aircraft Cleaning

## 🧹 Cleaning Session Types

### Quick Turn (30 minutes)
- **Purpose**: Between-flight cleaning for quick turnarounds
- **Items**: Required items only (essential cleaning tasks)
- **Best for**: Same-day multi-leg operations
- **Zones**: Cockpit, Cabin, Galley, Lavatory

### Overnight Clean (2 hours)
- **Purpose**: Standard end-of-day cleaning
- **Items**: All items including optional tasks
- **Best for**: Daily overnight maintenance
- **Zones**: All zones including basic exterior

### Deep Clean (4 hours)
- **Purpose**: Thorough cleaning and detailing
- **Items**: Complete checklist with detailed attention
- **Best for**: Weekly or bi-weekly maintenance schedules
- **Zones**: All zones with extra attention to details

### Full Detailing (8 hours)
- **Purpose**: Comprehensive cleaning and restoration
- **Items**: Complete checklist plus restoration tasks
- **Best for**: Monthly maintenance or pre-inspection prep
- **Zones**: All zones including full exterior wash

## 📋 Cleaning Zones & Items

### 🛫 Cockpit (7 items)
**Required Items:**
- Windscreen & Windows
- Instrument Panel
- Control Yokes
- Center Pedestal
- Pilot Seats
- Floor & Carpet

**Optional Items:**
- Door Panels

### 💺 Cabin (9 items)
**Required Items:**
- Passenger Seats
- Seat Belts
- Cabin Windows
- Side Panels
- Cabin Floor & Carpet
- Overhead Bins
- Tables & Surfaces

**Optional Items:**
- Entertainment Systems
- Window Shades

### 🍽️ Galley (8 items)
**Required Items:**
- Countertops
- Coffee Maker
- Refrigerator
- Microwave/Oven
- Sink & Faucet
- Trash Receptacles
- Floor & Mats

**Optional Items:**
- Cabinets & Drawers

### 🚿 Lavatory (7 items)
**Required Items:**
- Toilet
- Sink & Countertop
- Mirror
- Floor
- Trash Receptacle
- Replenish Supplies

**Optional Items:**
- Panels & Walls

### 🌬️ Exterior (5 items)
**Required Items:**
- Entry Door

**Optional Items:**
- Leading Edges
- Fuselage Wash
- Windows (External)
- Landing Gear Doors

## 🚀 Quick Start Guide

### Starting a New Cleaning Session

1. **Navigate to Aircraft Cleaning**
   - Access via Inflight Services or Maintenance menu

2. **Click "New Session"**
   - Select the aircraft tail number (N650GX, N650ER, N650EX)
   - Choose cleaning type (Quick Turn, Overnight, Deep Clean, or Detailing)

3. **Session Begins**
   - Session status changes to "Not Started"
   - Complete checklist becomes available
   - Timer starts when first item is marked complete

### Using the Cleaning Checklist

1. **Open the Session**
   - Click "View Checklist" on any active session card

2. **Filter by Zone** (optional)
   - Click zone buttons to filter items
   - Or view "All Items" to see complete list

3. **Mark Items Complete**
   - Toggle switch next to each item
   - System automatically records:
     - Your name
     - Completion timestamp
     - Item status

4. **Track Progress**
   - Progress bar updates in real-time
   - See completed vs. remaining items
   - Required items highlighted with badge

5. **Add Notes** (optional)
   - Enter session notes in text area
   - Document any issues or observations

### Completing a Session

**Automatic Completion:**
- When all items are marked complete, status changes to "Completed"
- Completion time and user are recorded
- Success notification appears

**Verification:**
- Click "Verify" button on completed sessions
- Typically done by flight crew or lead attendant
- Adds verification timestamp and user

## 📊 Status Indicators

### Session Status Colors

- **Gray - Not Started**: Session created but no items completed yet
- **Blue - In Progress**: Some items completed, work ongoing
- **Green - Completed**: All items completed, ready for verification
- **Purple - Verified**: Session completed and verified by crew/lead

### Progress Tracking

Each session card shows:
- **Overall Progress**: Percentage completion (0-100%)
- **Items Count**: X/Y items completed
- **Required Items**: X/Y required items completed
- **Time Elapsed**: Duration since session started
- **Started By**: User who began the session
- **Completed By**: User who finished (if complete)
- **Verified By**: User who verified (if verified)

## 💡 Best Practices

### For Flight Attendants

1. **Start Session Early**
   - Create session at beginning of cleaning
   - Allows tracking of total time spent

2. **Check Zone by Zone**
   - Use zone filters to focus on one area at a time
   - Prevents missing items

3. **Mark as You Go**
   - Toggle items complete immediately after finishing
   - Ensures accurate progress tracking

4. **Add Notes**
   - Document any issues found
   - Note supplies that need replenishing
   - Report damage or wear

5. **Request Verification**
   - Notify pilot/lead when complete
   - Don't skip verification step

### For Pilots

1. **Quick Check Before Flight**
   - Review cleaning status on dashboard
   - Verify cockpit cleaning completed
   - Check verification status

2. **Post-Flight Review**
   - Check if cleaning needed
   - Note any issues in tech log if needed

3. **Verify Sessions**
   - Verify completed sessions before departure
   - Ensures quality standards met

### For Maintenance

1. **Deep Cleaning Coordination**
   - Schedule deep cleans during maintenance windows
   - Coordinate with flight schedule

2. **Exterior Cleaning**
   - Mark exterior items during regular inspections
   - Track wash schedule

3. **Supply Management**
   - Check "Replenish Supplies" items
   - Coordinate with purchasing

## 📱 Mobile Access

The cleaning tracker is **fully responsive** and works on mobile devices:

- ✅ View all active sessions
- ✅ Access full checklists
- ✅ Toggle items complete
- ✅ Add notes
- ✅ Verify sessions
- ✅ View history

**Perfect for use on:**
- iPads in aircraft
- Phones while cleaning
- Tablets at cleaning stations

## 📈 Viewing History

1. **Click "History" button** in top-right
2. **View past sessions** with details:
   - Aircraft tail number
   - Session type
   - Completed by (user name)
   - Completion date and time
   - Duration
   - Items completed count

3. **Track trends**:
   - Average cleaning times
   - Most common session types
   - Crew performance

## 🔔 Notifications

The system provides **toast notifications** for:
- ✅ Session created successfully
- ✅ Session completed (all items done)
- ✅ Session verified by crew
- ❌ Verification attempted with incomplete items

## ⚠️ Important Notes

### Required vs Optional Items

- **Quick Turn**: Shows required items only (faster cleaning)
- **Other Types**: Shows all items (thorough cleaning)
- **Required Badge**: Indicates items that must be completed

### Session States

1. **Not Started**: Created but no progress
2. **In Progress**: At least one item completed
3. **Completed**: All items marked complete
4. **Verified**: Completed + verified by crew/pilot

### Data Persistence

Currently uses **local state** (resets on page reload). For production:
- Integrate with Supabase for persistence
- Sync across devices
- Share with Corporate Passenger App project

## 🔧 Troubleshooting

### "Cannot verify" error
**Cause**: Not all items are completed
**Solution**: Complete all items before verifying

### Progress not updating
**Cause**: Items not toggled
**Solution**: Click switch to toggle items on/off

### Session not showing
**Cause**: Filtered by status/aircraft
**Solution**: Check filters or create new session

## 🔗 Integration Points

### Current Integrations
- **Aircraft Status**: Links to G650 fleet
- **Navigation**: Multi-role access

### Future Integrations
- **Supabase**: Cross-project data sharing
- **Maintenance Board**: Track cleaning as maintenance item
- **Scheduling**: Auto-create sessions based on flight schedule
- **ForeFlight**: Link to flight plans
- **Notifications**: Email/SMS when cleaning needed

## 📋 Checklist Categories

Items are categorized by importance:
- **Required**: Must be completed for session completion
- **Optional**: Recommended but not mandatory

Use this to prioritize during time-constrained operations.

## 🎯 Success Metrics

Track these KPIs:
- Average cleaning time by session type
- On-time cleaning completion rate
- Verification rate (% of completed sessions verified)
- Items completion rate (% of items marked complete)
- Crew efficiency (time per item)

## 🤝 Coordination

### Between Roles

**Inflight → Maintenance**
- Report cleaning issues via notes
- Flag items needing maintenance attention

**Pilots → Inflight**
- Verify cleaning before departure
- Note cockpit-specific issues

**Maintenance → Inflight**
- Coordinate deep cleaning schedules
- Provide supplies and equipment

## 💬 Support

For issues or feature requests:
1. Check this guide
2. Contact your aviation ops manager
3. Submit feedback via system admin

---

**Last Updated**: November 12, 2025  
**Version**: 1.0  
**System**: Flight Operations Management System
