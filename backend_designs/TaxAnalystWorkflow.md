# Tax Analyst Workflow Guide

## Overview
This document outlines the workflow for the "Tax Analyst" persona within the Corporate Aircraft Tax Compliance Platform. The goal is to ensure accurate classification of flights for IRS SIFL and SEC reporting.

## User Persona: Tax Analyst
- **Responsibilities**: Review flight logs, classify passenger purpose, allocate deadhead costs, and generate tax reports.
- **Pain Points**: Missing passenger details, unclear business vs. personal distinctions, manual calculation errors.

## Workflow Steps

### Step 1: Sync & Review Dashboard
**Goal**: Ingest recent flights and identify missing data.
1. Analyst logs in and navigates to the **"Tax Compliance"** dashboard.
2. System auto-syncs with `myairops` API (runs scheduled or manual "Sync Now").
3. Dashboard displays a list of **"Pending Review"** trips.
   - *Visual Indicator*: Red badges for trips with missing passengers or unassigned deadheads.
4. Analyst clicks on a specific Trip ID to view details.

### Step 2: Passenger Classification
**Goal**: Determine Tax Status for each passenger on each leg.
1. Analyst opens the **"Leg Detail"** view.
2. **Passenger Table** lists all manifest passengers.
3. Analyst uses a dropdown to select **Tax Status**:
    - `Business` (SIFL = $0)
    - `Business - Entertainment` (Deduction Disallowance Risk)
    - `Personal - Entertainment` (High Risk - Full SIFL + Disallowance)
    - `Personal - Non-Entertainment` (Full SIFL)
    - `Commuting` (Full SIFL)
4. *Automation*: System pre-fills based on "Default Tax Status" from Passenger Profile if available.
5. Analyst saves changes. System calls `calculate_sifl()` in the background and updates the "Estimated Income" field.

### SIFL Valuation Rules (Automated)
The system automatically applies the following multipliers based on the Passenger Profile and Aircraft Weight:
- **Control Employee (Band 7+)**:
    - Aircraft > 25,000 lbs: **400%** of SIFL Fare.
    - Aircraft 10,001 - 25,000 lbs: **300%** of SIFL Fare.
- **Non-Control Employee**:
    - Aircraft > 25,000 lbs: **31.3%** of SIFL Fare.
- **Security Concern (CEO)**:
    - Overrides weight-based multiple.
    - Rate: **200%** of SIFL Fare.

### Step 3: Deadhead Allocation
**Goal**: Assign the cost of empty legs (deadheads) to the responsible executive.
1. System flags legs with `0 Passengers` as **"Deadhead - Action Required"**.
2. Analyst opens the **"Deadhead Allocation Tool"** (Modal).
3. Tool displays the Deadhead Leg in the center.
4. **"Related Trips"** (Previous or Next trips) are shown on the side.
5. Analyst drags-and-drops the Deadhead to the associated "Personal Trip" (e.g., The leg was flown to pick up the CEO from vacation).
6. System assigns 100% of the `CostCenter` variable costs to that Executive's SEC report.

### Step 4: Reporting & Export
**Goal**: Generate final monthly/quarterly reports.
1. Analyst navigates to **"Reports"**.
2. Selects Period (e.g., Q3 2023).
3. Clicks **"Generate IRS SIFL Report"** (CSV/PDF) - Used for Payroll.
4. Clicks **"Generate SEC Incremental Cost Report"** - Used for Proxy Statements.
5. Analyst marks the period as **"Closed"** to lock data.

## UI Requirements
- **Data Grid**: Sortable columns for Date, Tail, Route, Pax Count, Status.
- **Visual Cues**: Color-coded statuses (Green = Compliant, Yellow = Review Needed, Red = Missing Data).
- **Inline Editing**: Quick dropdowns for Passenger Status to speed up workflow.
