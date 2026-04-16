# Pilot & Flight Attendant Currency — Backend API Specification

**Version:** 1.0  
**Date:** April 16, 2026  
**System:** Antigravity Aviation Management System  
**Operation Type:** Part 91 (14 CFR)  
**Aircraft Types:** Gulfstream G500, G650, G800

---

## Table of Contents

1. [Overview](#overview)
2. [Data Source — MyAirOps OData](#data-source)
3. [Data Models](#data-models)
4. [Ingestion & Polling](#ingestion--polling)
5. [Currency Calculations](#currency-calculations)
   - [General Currency (90-Day)](#1-general-currency--90-day-landing-recency)
   - [Night Currency (Standard)](#2-night-currency--standard-90-day)
   - [Night Currency (Alternate)](#3-night-currency--alternate-compliance--6157e)
   - [Instrument Currency](#4-instrument-currency--6-month)
   - [Holding Procedures](#5-holding-procedures)
   - [61.58 PIC Proficiency Check](#6-6158-pic-proficiency-check)
   - [Days Since Last Flown](#7-days-since-last-flown)
   - [Total Hours in Type](#8-total-hours-in-type)
6. [Flight Attendant Calculations](#flight-attendant-calculations)
7. [Traffic Light Status Logic](#traffic-light-status-logic)
8. [API Response Schema](#api-response-schema)
9. [Edge Cases & Special Rules](#edge-cases--special-rules)
10. [Notes System](#notes-system)

---

## Overview

This system pulls raw flight log and qualification data from the **MyAirOps API/OData** feed and runs currency calculations on our backend. The front end displays results without performing any calculations itself.

**Key principle:** All currencies are tracked **per pilot, per aircraft type**. A pilot may be current on the G650 but not on the G500. The system must maintain separate currency records for each pilot × type combination.

**Aircraft types to support:**
- `G500` — Gulfstream G500
- `G650` — Gulfstream G650
- `G800` — Gulfstream G800 (may not yet exist in MyAirOps — stub with empty data)

---

## Data Source

### MyAirOps OData Endpoints

The following data must be queried from MyAirOps. Consult MyAirOps API documentation for exact endpoint URLs and authentication.

| Data Needed | Expected OData Entity | Key Fields |
|---|---|---|
| Pilot roster | `Crew` or `Personnel` | crewId, name, role (PIC/SIC/FA), certificates, totalHours |
| Flight logs | `FlightLogs` or `Legs` | date, aircraftType, tailNumber, crewAssignments, flightTime, takeoffs, landings, nightLandings, instrumentApproaches, holds, departureTime, arrivalTime |
| Qualifications | `Qualifications` or `CrewQualifications` | crewId, qualificationType, issueDate, expiryDate |
| Training records | `TrainingRecords` | crewId, trainingType, completionDate, provider (for Part 142 sim) |

### Authentication
```
Authorization: Bearer <MYAIROPS_API_TOKEN>
Content-Type: application/json
OData-Version: 4.0
```

### Query Scope
- Flight logs: Pull **rolling 12 months** of data (covers the maximum lookback window for any calculation)
- Qualifications: Pull **all current** qualification records
- Crew roster: Pull **active crew only**

---

## Data Models

### Internal Database Schema

```sql
-- Ingested flight log data (from MyAirOps)
CREATE TABLE flight_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    myairops_id     VARCHAR(100) UNIQUE NOT NULL,  -- Dedupe key
    crew_id         VARCHAR(100) NOT NULL,
    crew_name       VARCHAR(255) NOT NULL,
    crew_role       VARCHAR(10) NOT NULL,           -- 'PIC', 'SIC', 'FA'
    flight_date     DATE NOT NULL,
    aircraft_type   VARCHAR(10) NOT NULL,           -- 'G500', 'G650', 'G800'
    tail_number     VARCHAR(20),
    origin          VARCHAR(10),
    destination     VARCHAR(10),
    flight_time     DECIMAL(5,1) NOT NULL DEFAULT 0,  -- Hours
    takeoffs        INTEGER NOT NULL DEFAULT 0,
    landings        INTEGER NOT NULL DEFAULT 0,
    night_landings  INTEGER NOT NULL DEFAULT 0,      -- Full-stop only
    instrument_approaches INTEGER NOT NULL DEFAULT 0,
    holds           INTEGER NOT NULL DEFAULT 0,
    departure_time  TIMESTAMPTZ,
    arrival_time    TIMESTAMPTZ,
    is_night_flight BOOLEAN DEFAULT FALSE,
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Pilot qualification records (from MyAirOps)
CREATE TABLE pilot_qualifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id         VARCHAR(100) NOT NULL,
    qualification_type VARCHAR(50) NOT NULL,  -- '61_58_check', 'part_142_sim', etc.
    aircraft_type   VARCHAR(10),              -- NULL if not type-specific
    issue_date      DATE NOT NULL,
    expiry_date     DATE,
    provider        VARCHAR(255),             -- e.g., 'CAE', 'FlightSafety'
    notes           TEXT,
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Calculated currency results (our output)
CREATE TABLE currency_status (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id         VARCHAR(100) NOT NULL,
    crew_name       VARCHAR(255) NOT NULL,
    crew_role       VARCHAR(10) NOT NULL,       -- 'PILOT' or 'FA'
    aircraft_type   VARCHAR(10) NOT NULL,       -- 'G500', 'G650', 'G800'
    
    -- General Currency
    general_status          VARCHAR(10),  -- 'current', 'warning', 'expired'
    general_landings_count  INTEGER DEFAULT 0,
    general_expiry_date     DATE,
    
    -- Night Currency
    night_status            VARCHAR(10),
    night_landings_count    INTEGER DEFAULT 0,
    night_expiry_date       DATE,
    night_compliance_method VARCHAR(20),  -- 'standard', 'alternate_6mo', 'alternate_12mo'
    
    -- Instrument Currency
    instrument_status       VARCHAR(10),
    instrument_approach_count INTEGER DEFAULT 0,
    instrument_expiry_date  DATE,
    
    -- Holding
    holding_status          VARCHAR(10),
    holding_count           INTEGER DEFAULT 0,
    holding_expiry_date     DATE,
    
    -- 61.58 PIC Proficiency Check
    pic_check_status        VARCHAR(10),
    pic_check_last_date     DATE,
    pic_check_expiry_date   DATE,
    
    -- Operational
    days_since_last_flown   INTEGER,
    last_flown_date         DATE,
    total_hours_in_type     DECIMAL(7,1) DEFAULT 0,
    
    -- Overall
    overall_status          VARCHAR(10),  -- Worst-case of all statuses
    
    calculated_at           TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(crew_id, aircraft_type)
);

-- Scheduling notes (our internal data — NOT from MyAirOps)
CREATE TABLE currency_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id         VARCHAR(100) NOT NULL,
    aircraft_type   VARCHAR(10),              -- NULL = applies to all types
    author_name     VARCHAR(255) NOT NULL,    -- Scheduling team member
    content         TEXT NOT NULL,
    is_urgent       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Ingestion & Polling

### Schedule
- **Frequency:** Every **1 hour** via cron job
- **Retry:** 3 attempts with exponential backoff (1min, 5min, 15min)
- **Deduplication:** Use `myairops_id` as unique key — upsert on conflict

### Polling Logic (Pseudocode)

```python
def poll_myairops():
    """Main polling job — runs every hour."""
    
    # 1. Fetch active crew roster
    crew_list = myairops.get("/odata/Crew?$filter=status eq 'Active'")
    
    # 2. Fetch flight logs (rolling 12 months)
    cutoff_date = today() - timedelta(days=365)
    flight_logs = myairops.get(
        f"/odata/FlightLogs?$filter=flightDate ge {cutoff_date}"
        f"&$expand=crewAssignments"
        f"&$orderby=flightDate desc"
    )
    
    # 3. Fetch qualification records
    qualifications = myairops.get(
        "/odata/CrewQualifications?$filter=status eq 'Active'"
    )
    
    # 4. Upsert into local database
    for log in flight_logs:
        upsert_flight_log(log)
    
    for qual in qualifications:
        upsert_qualification(qual)
    
    # 5. Recalculate all currencies
    for crew in crew_list:
        for aircraft_type in ['G500', 'G650', 'G800']:
            if crew.role in ['PIC', 'SIC']:
                calculate_pilot_currency(crew.id, aircraft_type)
            elif crew.role == 'FA':
                calculate_fa_currency(crew.id, aircraft_type)
```

---

## Currency Calculations

### Important: "Calendar Month" vs "Rolling Days"

Some FAA requirements use **calendar months** (expire at the end of a calendar month), while others use **rolling days**. This distinction is critical:

| Requirement | Window Type | How Expiry Works |
|---|---|---|
| General Currency | Rolling 90 days | Expires exactly 90 days after the qualifying event |
| Night Currency (standard) | Rolling 90 days | Expires exactly 90 days after the qualifying event |
| Night Currency (alt 6-mo) | 6 calendar months | Expires end of the 6th calendar month after the event |
| Instrument Currency | 6 calendar months | Expires end of the 6th calendar month after the event |
| 61.58 PIC Check | 12/24 calendar months | Expires end of the 12th/24th calendar month after check |

```python
def end_of_calendar_month(date, months_to_add):
    """
    Returns the last day of the calendar month that is 
    `months_to_add` months after `date`.
    
    Example: 
      end_of_calendar_month(2026-03-15, 6) → 2026-09-30
      end_of_calendar_month(2026-01-31, 12) → 2027-01-31
    """
    target = date + relativedelta(months=months_to_add)
    return target.replace(day=calendar.monthrange(target.year, target.month)[1])
```

---

### 1. General Currency — 90-Day Landing Recency

**Regulation:** 14 CFR § 61.57(a)  
**Requirement:** 3 takeoffs AND 3 landings as sole manipulator of the flight controls within the preceding 90 days, in an aircraft of the same category, class, and type.

```python
def calculate_general_currency(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Calculate 90-day general (day) landing currency.
    
    Logic:
    1. Query all flights for this pilot in this aircraft type
       within the last 90 days.
    2. Sum all landings where the pilot was PIC (sole manipulator).
    3. If total >= 3, pilot is current.
    4. Expiry date = date of the 3rd-oldest qualifying landing + 90 days.
       (When that landing "falls off" the 90-day window, they drop to 2 landings.)
    """
    
    now = datetime.now()
    window_start = now - timedelta(days=90)
    
    # Get all qualifying landings (PIC only, matching type, within 90 days)
    qualifying_flights = db.query(
        """
        SELECT flight_date, landings
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type = :aircraft_type
          AND crew_role = 'PIC'
          AND flight_date >= :window_start
          AND landings > 0
        ORDER BY flight_date ASC
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type,
        window_start=window_start
    )
    
    # Expand into individual landing events  
    # (a flight with 2 landings = 2 events on that date)
    landing_dates = []
    for flight in qualifying_flights:
        for _ in range(flight.landings):
            landing_dates.append(flight.flight_date)
    
    total_landings = len(landing_dates)
    
    if total_landings >= 3:
        # Expiry = date of the 3rd-oldest landing + 90 days
        # This is the first landing that, when it "falls off", 
        # drops the count below 3
        third_oldest = landing_dates[total_landings - 3]  # 0-indexed
        expiry_date = third_oldest + timedelta(days=90)
        
        days_remaining = (expiry_date - now.date()).days
        
        if days_remaining <= 30 or total_landings == 3:
            status = 'warning'  # Amber: ≤30 days left OR exactly at minimum
        else:
            status = 'current'
    else:
        status = 'expired'
        expiry_date = None
    
    return CurrencyResult(
        status=status,
        count=total_landings,
        required=3,
        expiry_date=expiry_date,
        window_type='rolling_90_days'
    )
```

---

### 2. Night Currency — Standard (90-Day)

**Regulation:** 14 CFR § 61.57(b)  
**Requirement:** 3 takeoffs and 3 landings **to a full stop** during the period beginning **1 hour after sunset** and ending **1 hour before sunrise**, within the preceding 90 days.

> **Critical distinction from general currency:** Night landings MUST be **full-stop** landings (no touch-and-go). The `night_landings` field in the flight log should only count full-stop landings performed in the night window.

```python
def calculate_night_currency_standard(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Calculate standard 90-day night landing currency.
    
    Same structure as general currency, but uses night_landings column.
    Night = 1 hour after sunset to 1 hour before sunrise at the landing airport.
    Only full-stop landings count.
    """
    
    now = datetime.now()
    window_start = now - timedelta(days=90)
    
    qualifying_flights = db.query(
        """
        SELECT flight_date, night_landings
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type = :aircraft_type
          AND crew_role = 'PIC'
          AND flight_date >= :window_start
          AND night_landings > 0
        ORDER BY flight_date ASC
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type,
        window_start=window_start
    )
    
    night_landing_dates = []
    for flight in qualifying_flights:
        for _ in range(flight.night_landings):
            night_landing_dates.append(flight.flight_date)
    
    total_night = len(night_landing_dates)
    
    if total_night >= 3:
        third_oldest = night_landing_dates[total_night - 3]
        expiry_date = third_oldest + timedelta(days=90)
        days_remaining = (expiry_date - now.date()).days
        
        if days_remaining <= 30 or total_night == 3:
            status = 'warning'
        else:
            status = 'current'
    else:
        status = 'expired'
        expiry_date = None
    
    return CurrencyResult(
        status=status,
        count=total_night,
        required=3,
        expiry_date=expiry_date,
        compliance_method='standard',
        window_type='rolling_90_days'
    )
```

---

### 3. Night Currency — Alternate Compliance (§ 61.57(e))

**Regulation:** 14 CFR § 61.57(e)  
**Purpose:** Provides multi-crew turbine pilots an alternative to the standard 90-day night currency.

This is the most complex calculation. The pilot must meet **eligibility requirements** AND satisfy **one of two options**.

```python
def calculate_night_currency_alternate(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Calculate alternate night currency per § 61.57(e).
    
    ELIGIBILITY CHECK (ALL must be true):
      1. Pilot holds Commercial or ATP certificate with appropriate type rating
      2. Pilot has ≥ 1,500 hours total aeronautical experience
      3. Pilot is CURRENT on standard 90-day DAY landing currency in the 
         specific type (i.e., general currency must be 'current' or 'warning')
    
    If eligible, ONE of these options satisfies night currency:
    
      Option A — "6-Month Any Multi-Crew":
        3 night takeoffs/landings in ANY multi-crew turbine airplane
        within the preceding 6 calendar months
        
      Option B — "12-Month Simulator":
        Completion of a Part 142 approved training program within the 
        preceding 12 calendar months that included ≥ 6 night takeoffs 
        and landings to a full stop in a full flight simulator (FFS) 
        representative of a turbine-powered airplane with more than 
        one pilot station
    """
    
    now = datetime.now()
    
    # ─── Step 1: Check Eligibility ───
    
    pilot_info = get_pilot_info(crew_id)  # From crew roster / qualifications
    
    eligible = (
        pilot_info.certificate_level in ['COMMERCIAL', 'ATP']
        and pilot_info.has_type_rating(aircraft_type)
        and pilot_info.total_aeronautical_hours >= 1500
    )
    
    if not eligible:
        return CurrencyResult(
            status='not_eligible',
            compliance_method='alternate_not_eligible',
            notes='Pilot does not meet § 61.57(e) eligibility requirements'
        )
    
    # Check that general (day) currency is active for this type
    day_currency = calculate_general_currency(crew_id, aircraft_type)
    if day_currency.status == 'expired':
        return CurrencyResult(
            status='expired',
            compliance_method='alternate_not_eligible',
            notes='Day currency expired — prerequisite for alternate night currency'
        )
    
    # Also need 15 hours in type in the last 90 days
    recent_hours = db.query(
        """
        SELECT COALESCE(SUM(flight_time), 0) as total
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type = :aircraft_type
          AND flight_date >= :cutoff
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type,
        cutoff=now - timedelta(days=90)
    ).total
    
    if recent_hours < 15:
        return CurrencyResult(
            status='expired',
            compliance_method='alternate_not_eligible',
            notes=f'Only {recent_hours}h in type in last 90 days (need 15h)'
        )
    
    # ─── Step 2: Check Option A — 6-Month Any Multi-Crew ───
    
    six_month_cutoff = end_of_calendar_month(now, -6)
    
    # Query night landings in ANY multi-crew turbine type (not just this type)
    option_a_flights = db.query(
        """
        SELECT flight_date, night_landings, aircraft_type
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type IN ('G500', 'G650', 'G800')  -- All multi-crew turbine types
          AND crew_role = 'PIC'
          AND flight_date >= :cutoff
          AND night_landings > 0
        ORDER BY flight_date ASC
        """,
        crew_id=crew_id,
        cutoff=six_month_cutoff
    )
    
    option_a_count = sum(f.night_landings for f in option_a_flights)
    
    if option_a_count >= 3:
        # Find the 3rd-oldest night landing date
        night_dates = []
        for f in option_a_flights:
            for _ in range(f.night_landings):
                night_dates.append(f.flight_date)
        
        third_oldest = night_dates[len(night_dates) - 3]
        expiry_date = end_of_calendar_month(third_oldest, 6)
        days_remaining = (expiry_date - now.date()).days
        
        return CurrencyResult(
            status='warning' if days_remaining <= 60 else 'current',
            count=option_a_count,
            required=3,
            expiry_date=expiry_date,
            compliance_method='alternate_6mo',
            window_type='6_calendar_months',
            notes='Alternate compliance — 3 night landings in any multi-crew turbine (6 months)'
        )
    
    # ─── Step 3: Check Option B — 12-Month Simulator ───
    
    twelve_month_cutoff = end_of_calendar_month(now, -12)
    
    sim_training = db.query(
        """
        SELECT completion_date, provider
        FROM pilot_qualifications
        WHERE crew_id = :crew_id
          AND qualification_type = 'part_142_sim'
          AND completion_date >= :cutoff
        ORDER BY completion_date DESC
        LIMIT 1
        """,
        crew_id=crew_id,
        cutoff=twelve_month_cutoff
    )
    
    if sim_training:
        expiry_date = end_of_calendar_month(sim_training.completion_date, 12)
        days_remaining = (expiry_date - now.date()).days
        
        return CurrencyResult(
            status='warning' if days_remaining <= 90 else 'current',
            count=1,
            required=1,
            expiry_date=expiry_date,
            compliance_method='alternate_12mo',
            window_type='12_calendar_months',
            notes=f'Alternate compliance — Part 142 sim ({sim_training.provider})'
        )
    
    # ─── Neither option met ───
    return CurrencyResult(
        status='expired',
        compliance_method='alternate_expired',
        notes='Eligible for alternate but neither Option A nor B is met'
    )


def calculate_night_currency(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Master night currency function.
    
    Checks BOTH standard and alternate compliance.
    Returns whichever one gives the pilot a BETTER status.
    Always indicates which method is being used.
    """
    
    standard = calculate_night_currency_standard(crew_id, aircraft_type)
    alternate = calculate_night_currency_alternate(crew_id, aircraft_type)
    
    # Priority: current > warning > expired
    status_priority = {'current': 3, 'warning': 2, 'expired': 1, 'not_eligible': 0}
    
    if status_priority.get(alternate.status, 0) > status_priority.get(standard.status, 0):
        return alternate  # Alternate gives better status
    else:
        return standard   # Standard is equal or better
```

---

### 4. Instrument Currency — 6-Month

**Regulation:** 14 CFR § 61.57(c)  
**Requirement:** Within the preceding **6 calendar months**, the pilot must have performed and logged:
- **6 instrument approaches**
- **Holding procedures**
- **Intercepting and tracking courses through the use of navigational electronic systems**

> **Note:** The 61.58 PIC proficiency check does NOT reset or extend instrument currency. This is a common misconception. Instrument currency is always governed by § 61.57(c).

```python
def calculate_instrument_currency(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Calculate 6-month instrument currency.
    
    Uses CALENDAR MONTHS, not rolling days.
    Window = from the 1st of the month that is 6 months before 
             the current month, through today.
    
    Example: If today is April 16, 2026, the window starts October 1, 2025
             and the expiry (if met) would be end of the month of the 
             6th qualifying approach + 6 calendar months.
    """
    
    now = datetime.now()
    
    # 6 calendar months back = start of that month
    window_start = (now - relativedelta(months=6)).replace(day=1)
    
    qualifying_flights = db.query(
        """
        SELECT flight_date, instrument_approaches, holds
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type = :aircraft_type
          AND crew_role IN ('PIC', 'SIC')  -- Can log as either PIC or SIC
          AND flight_date >= :window_start
          AND (instrument_approaches > 0 OR holds > 0)
        ORDER BY flight_date ASC
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type,
        window_start=window_start
    )
    
    total_approaches = sum(f.instrument_approaches for f in qualifying_flights)
    total_holds = sum(f.holds for f in qualifying_flights)
    
    # Need 6 approaches AND at least 1 hold
    approaches_met = total_approaches >= 6
    holds_met = total_holds >= 1
    
    if approaches_met and holds_met:
        # Find the date of the 6th-oldest approach
        approach_dates = []
        for f in qualifying_flights:
            for _ in range(f.instrument_approaches):
                approach_dates.append(f.flight_date)
        
        if len(approach_dates) >= 6:
            sixth_oldest = approach_dates[len(approach_dates) - 6]
            expiry_date = end_of_calendar_month(sixth_oldest, 6)
            days_remaining = (expiry_date - now.date()).days
            
            if days_remaining <= 60:
                status = 'warning'
            else:
                status = 'current'
        else:
            status = 'expired'
            expiry_date = None
    else:
        status = 'expired'
        expiry_date = None
    
    return CurrencyResult(
        status=status,
        count=total_approaches,
        required=6,
        expiry_date=expiry_date,
        window_type='6_calendar_months',
        notes=f'{total_approaches}/6 approaches, {total_holds} holds'
    )
```

---

### 5. Holding Procedures

**Regulation:** 14 CFR § 61.57(c) (same as instrument)  
**Requirement:** At least 1 holding procedure within the preceding 6 calendar months.  

Holding is tracked and displayed as a separate column but shares the same 6-calendar-month window as instrument approaches.

```python
def calculate_holding_currency(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Holding is part of instrument currency but displayed separately.
    Same 6-calendar-month window.
    Minimum: 1 hold.
    """
    
    now = datetime.now()
    window_start = (now - relativedelta(months=6)).replace(day=1)
    
    qualifying_flights = db.query(
        """
        SELECT flight_date, holds
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type = :aircraft_type
          AND crew_role IN ('PIC', 'SIC')
          AND flight_date >= :window_start
          AND holds > 0
        ORDER BY flight_date ASC
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type,
        window_start=window_start
    )
    
    total_holds = sum(f.holds for f in qualifying_flights)
    
    if total_holds >= 1:
        # Expiry based on oldest qualifying hold
        oldest_hold_date = qualifying_flights[0].flight_date
        expiry_date = end_of_calendar_month(oldest_hold_date, 6)
        days_remaining = (expiry_date - now.date()).days
        
        status = 'warning' if days_remaining <= 60 else 'current'
    else:
        status = 'expired'
        expiry_date = None
    
    return CurrencyResult(
        status=status,
        count=total_holds,
        required=1,
        expiry_date=expiry_date,
        window_type='6_calendar_months'
    )
```

---

### 6. 61.58 PIC Proficiency Check

**Regulation:** 14 CFR § 61.58  
**Requirement:** A proficiency check is required for any pilot acting as PIC of:
- An aircraft type-certificated for more than one required pilot flight crewmember, OR
- A turbojet-powered airplane

**Windows:**
- **12-month check:** In any aircraft meeting the above criteria → valid for 12 calendar months
- **24-month check:** In the *specific type* → valid for 24 calendar months

**Grace Month Rule (§ 61.58(i)):**
If the check is completed in the calendar month **before** or **after** the month it was due, it is considered to have been completed in the month it was due (for calculating the *next* due date only).

```python
def calculate_61_58_currency(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Calculate 61.58 PIC proficiency check currency.
    
    Checks for the most recent proficiency check for this type.
    Uses 12-calendar-month window with grace month logic.
    """
    
    now = datetime.now()
    
    # Get the most recent 61.58 check for this aircraft type
    last_check = db.query(
        """
        SELECT issue_date, expiry_date, notes
        FROM pilot_qualifications
        WHERE crew_id = :crew_id
          AND qualification_type = '61_58_check'
          AND (aircraft_type = :aircraft_type OR aircraft_type IS NULL)
        ORDER BY issue_date DESC
        LIMIT 1
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type
    )
    
    if not last_check:
        return CurrencyResult(
            status='expired',
            count=0,
            required=1,
            expiry_date=None,
            notes='No 61.58 check on record for this type'
        )
    
    check_date = last_check.issue_date
    
    # Standard expiry: end of the 12th calendar month after check
    standard_expiry = end_of_calendar_month(check_date, 12)
    
    # Grace month: pilot can still act as PIC during the month 
    # after expiry, but the NEXT check's due date doesn't shift
    grace_expiry = end_of_calendar_month(check_date, 13)  # +1 grace month
    
    # For display purposes, show the standard expiry
    # The grace month is just operational allowance
    expiry_date = standard_expiry
    
    days_remaining = (expiry_date - now.date()).days
    
    if days_remaining < 0:
        # Check if we're in the grace month
        grace_remaining = (grace_expiry - now.date()).days
        if grace_remaining >= 0:
            status = 'warning'  # In grace month — technically still legal but overdue
            notes = f'IN GRACE MONTH — check was due {abs(days_remaining)} days ago'
        else:
            status = 'expired'
            notes = 'Expired — cannot act as PIC in type'
    elif days_remaining <= 60:
        status = 'warning'
        notes = f'{days_remaining} days until 61.58 check due'
    else:
        status = 'current'
        notes = f'Current — due {expiry_date.strftime("%b %Y")}'
    
    return CurrencyResult(
        status=status,
        count=1,
        required=1,
        last_completed=check_date,
        expiry_date=expiry_date,
        window_type='12_calendar_months',
        notes=notes
    )
```

---

### 7. Days Since Last Flown

**Type:** Operational awareness (not regulatory)  
**Tracked per aircraft type.**

```python
def calculate_days_since_last_flown(crew_id: str, aircraft_type: str) -> CurrencyResult:
    """
    Simple date difference — when did the pilot last fly this type?
    Amber threshold: > 30 days.
    """
    
    now = datetime.now()
    
    last_flight = db.query(
        """
        SELECT MAX(flight_date) as last_date
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type = :aircraft_type
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type
    )
    
    if not last_flight or not last_flight.last_date:
        return CurrencyResult(
            status='warning',
            count=None,
            notes='No flights on record for this type'
        )
    
    days = (now.date() - last_flight.last_date).days
    
    if days > 90:
        status = 'expired'  # Informational — aligns with general currency loss
    elif days > 30:
        status = 'warning'
    else:
        status = 'current'
    
    return CurrencyResult(
        status=status,
        count=days,
        last_completed=last_flight.last_date,
        notes=f'{days} days since last flight in {aircraft_type}'
    )
```

---

### 8. Total Hours in Type

**Type:** Operational awareness (not regulatory)  
**Cumulative total — no expiration.**

```python
def calculate_total_hours_in_type(crew_id: str, aircraft_type: str) -> float:
    """
    Sum of all flight time for this pilot in this aircraft type.
    No status calculation — just a number.
    """
    
    result = db.query(
        """
        SELECT COALESCE(SUM(flight_time), 0) as total_hours
        FROM flight_logs
        WHERE crew_id = :crew_id
          AND aircraft_type = :aircraft_type
        """,
        crew_id=crew_id,
        aircraft_type=aircraft_type
    )
    
    return round(result.total_hours, 1)
```

---

## Flight Attendant Calculations

Flight attendants only track **two items** per aircraft type.

```python
def calculate_fa_currency(crew_id: str, aircraft_type: str):
    """
    Flight attendant currency — minimal tracking.
    Only: Days Since Last Flown + Notes.
    """
    
    days_result = calculate_days_since_last_flown(crew_id, aircraft_type)
    
    # No notes calculation — notes are stored/retrieved separately
    
    upsert_currency_status(
        crew_id=crew_id,
        crew_role='FA',
        aircraft_type=aircraft_type,
        days_since_last_flown=days_result.count,
        last_flown_date=days_result.last_completed,
        overall_status=days_result.status
    )
```

---

## Traffic Light Status Logic

### Per-Item Status

| Status | Color | Meaning |
|---|---|---|
| `current` | 🟢 Green | Within limits, no action needed |
| `warning` | 🟡 Amber | Approaching expiration (thresholds vary by item) |
| `expired` | 🔴 Red | Non-current — cannot exercise privilege |

### Overall Status (Per Pilot × Per Type)

The **overall status** for a pilot on a given aircraft type is the **worst-case** across all currency items:

```python
def calculate_overall_status(
    general: CurrencyResult,
    night: CurrencyResult,
    instrument: CurrencyResult,
    holding: CurrencyResult,
    pic_check: CurrencyResult
) -> str:
    """
    Overall status = worst-case of all individual items.
    
    If ANY item is 'expired' → overall is 'expired' (RED)
    If ANY item is 'warning' → overall is 'warning' (AMBER)
    Otherwise → 'current' (GREEN)
    """
    
    all_statuses = [
        general.status,
        night.status,
        instrument.status,
        holding.status,
        pic_check.status
    ]
    
    if 'expired' in all_statuses:
        return 'expired'
    elif 'warning' in all_statuses:
        return 'warning'
    else:
        return 'current'
```

### Amber Thresholds Summary

| Currency Item | Amber When... |
|---|---|
| General Currency (90-day) | ≤ 30 days remaining OR exactly 3 landings (minimum) |
| Night Currency (standard 90-day) | ≤ 30 days remaining OR exactly 3 landings |
| Night Currency (alternate 6-mo) | ≤ 60 days remaining |
| Night Currency (alternate 12-mo sim) | ≤ 90 days remaining |
| Instrument Approaches (6-mo) | ≤ 60 days remaining |
| Holding (6-mo) | ≤ 60 days remaining |
| 61.58 PIC Proficiency Check | ≤ 60 days remaining |
| Days Since Last Flown | > 30 days |

---

## API Response Schema

The backend should expose a REST endpoint that returns the calculated currency data for the front end.

### `GET /api/currency/pilots`

Returns all pilot currency records.

```json
{
  "lastCalculated": "2026-04-16T10:00:00Z",
  "lastMyAirOpsSync": "2026-04-16T10:00:00Z",
  "pilots": [
    {
      "crewId": "P001",
      "crewName": "John Smith",
      "crewRole": "PILOT",
      "types": {
        "G650": {
          "generalCurrency": {
            "status": "current",
            "landingCount": 5,
            "required": 3,
            "expiryDate": "2026-06-20",
            "daysRemaining": 65
          },
          "nightCurrency": {
            "status": "warning",
            "landingCount": 3,
            "required": 3,
            "expiryDate": "2026-05-10",
            "daysRemaining": 24,
            "complianceMethod": "standard"
          },
          "nightCurrencyAlternate": {
            "eligible": true,
            "status": "current",
            "expiryDate": "2026-09-30",
            "daysRemaining": 167,
            "complianceMethod": "alternate_6mo",
            "notes": "3 night landings in any multi-crew turbine (6 months)"
          },
          "nightCurrencyEffective": {
            "status": "current",
            "complianceMethod": "alternate_6mo",
            "expiryDate": "2026-09-30",
            "daysRemaining": 167,
            "notes": "Using alternate compliance (better status)"
          },
          "instrumentCurrency": {
            "status": "current",
            "approachCount": 8,
            "required": 6,
            "expiryDate": "2026-08-31",
            "daysRemaining": 137
          },
          "holdingCurrency": {
            "status": "current",
            "holdCount": 3,
            "required": 1,
            "expiryDate": "2026-08-31",
            "daysRemaining": 137
          },
          "picCheck": {
            "status": "current",
            "lastCheckDate": "2025-09-15",
            "expiryDate": "2026-09-30",
            "daysRemaining": 167,
            "notes": "Current — due Sep 2026"
          },
          "daysSinceLastFlown": {
            "status": "current",
            "days": 5,
            "lastFlownDate": "2026-04-11"
          },
          "totalHoursInType": 1245.3,
          "overallStatus": "current"
        },
        "G500": {
          "generalCurrency": {
            "status": "expired",
            "landingCount": 1,
            "required": 3,
            "expiryDate": null,
            "daysRemaining": 0
          },
          "// ... same structure ...": "..."
        },
        "G800": {
          "generalCurrency": {
            "status": "expired",
            "landingCount": 0,
            "required": 3,
            "expiryDate": null,
            "daysRemaining": 0
          },
          "// ... same structure ...": "...",
          "notes": "No flight records — aircraft type not yet in service"
        }
      },
      "notes": [
        {
          "id": "note-001",
          "authorName": "Jane Doe (Scheduling)",
          "content": "Needs sim session before Asia trip in May — coordinating with CAE",
          "isUrgent": true,
          "createdAt": "2026-04-10T14:30:00Z",
          "updatedAt": "2026-04-10T14:30:00Z"
        }
      ]
    }
  ]
}
```

### `GET /api/currency/flight-attendants`

Same structure but only includes `daysSinceLastFlown` and `notes` per type.

```json
{
  "flightAttendants": [
    {
      "crewId": "FA001",
      "crewName": "Emily Torres",
      "crewRole": "FA",
      "types": {
        "G650": {
          "daysSinceLastFlown": {
            "status": "current",
            "days": 3,
            "lastFlownDate": "2026-04-13"
          }
        },
        "G500": {
          "daysSinceLastFlown": {
            "status": "warning",
            "days": 45,
            "lastFlownDate": "2026-03-02"
          }
        },
        "G800": {
          "daysSinceLastFlown": {
            "status": "expired",
            "days": null,
            "lastFlownDate": null
          }
        }
      },
      "notes": []
    }
  ]
}
```

---

## Edge Cases & Special Rules

### 1. SIC Landings and Currency

- **General & Night Currency:** Only count landings where the pilot was **sole manipulator of the flight controls** (typically PIC). However, an SIC can log landings for currency if they were the sole manipulator during that landing. The `crew_role` field may need refinement — consider a `sole_manipulator` boolean on the flight log.
- **Instrument Currency:** Can be logged by either PIC or SIC. Both crew members may count approaches they personally flew.

### 2. Touch-and-Go vs. Full-Stop

- **General Currency (day):** Touch-and-go landings **do count**.
- **Night Currency:** Only **full-stop** landings count. The `night_landings` field should only include full-stop landings.

### 3. Cross-Type Currency

- **General & Night Currency:** Must be in the **same category, class, and type**. G500 landings do NOT count for G650 currency.
- **Instrument Currency:** Must be in the same **category** (airplane). Technically, G500 instrument approaches could count for G650 instrument currency since both are "airplane" category. However, for conservative tracking and per your operational requirements, we track per type.
- **Alternate Night Currency (Option A):** Specifically allows landings in **any** multi-crew turbine airplane. So G500 night landings DO count for G650 alternate night currency.

### 4. Calendar Month End Dates

Be careful with month-end calculations:
- `end_of_calendar_month(Jan 31, +6)` = July 31
- `end_of_calendar_month(Aug 31, +6)` = Feb 28 (or 29 in leap year)
- `end_of_calendar_month(Mar 15, +12)` = Mar 31 of next year

### 5. G800 With No Data

The G800 may not exist in MyAirOps yet. The system should:
- Create currency records for G800 with all statuses = `expired` and counts = 0
- Display these in the UI with a note: "No flight records"
- NOT throw errors or skip the type

### 6. Grace Month (61.58 Only)

The grace month under § 61.58(i) means:
- If a check was due at the end of March 2026, the pilot can complete it in April 2026 and it's treated as if completed in March for calculating the *next* due date
- The pilot CAN still act as PIC during April (the grace month)
- The grace month should NOT be used routinely — show it as `warning` status

---

## Notes System

### Permissions
- **Create/Edit/Delete:** Scheduling role only
- **Read:** Scheduling, Chief Pilot, Admin, Lead

### API Endpoints

```
POST   /api/currency/notes          — Create a new note
PUT    /api/currency/notes/:id      — Update an existing note
DELETE /api/currency/notes/:id      — Delete a note
GET    /api/currency/notes/:crewId  — Get all notes for a crew member
```

### Note Schema

```json
{
  "id": "uuid",
  "crewId": "string",
  "aircraftType": "string | null",  // null = applies to all types
  "authorName": "string",
  "content": "string",
  "isUrgent": false,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

## Summary of Calculation Functions

| Function | Input | Output | Window |
|---|---|---|---|
| `calculate_general_currency()` | crew_id, type | status, count, expiry | Rolling 90 days |
| `calculate_night_currency_standard()` | crew_id, type | status, count, expiry | Rolling 90 days |
| `calculate_night_currency_alternate()` | crew_id, type | status, method, expiry | 6 or 12 cal months |
| `calculate_night_currency()` | crew_id, type | best of standard/alternate | — |
| `calculate_instrument_currency()` | crew_id, type | status, count, expiry | 6 calendar months |
| `calculate_holding_currency()` | crew_id, type | status, count, expiry | 6 calendar months |
| `calculate_61_58_currency()` | crew_id, type | status, date, expiry | 12 calendar months |
| `calculate_days_since_last_flown()` | crew_id, type | status, days, date | N/A |
| `calculate_total_hours_in_type()` | crew_id, type | hours (number) | N/A (cumulative) |
| `calculate_overall_status()` | all results | worst-case status | — |
| `calculate_fa_currency()` | crew_id, type | days, status | N/A |
