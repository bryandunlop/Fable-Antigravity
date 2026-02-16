-- Database Schema for Corporate Aircraft Tax Compliance Platform

-- Table: Trips
-- Stores high-level trip information
CREATE TABLE Trips (
    TripID INT PRIMARY KEY IDENTITY(1,1),
    AircraftTail VARCHAR(20) NOT NULL,
    StartDate DATETIME NOT NULL,
    EndDate DATETIME NOT NULL,
    PrimaryPurpose VARCHAR(50) CHECK (PrimaryPurpose IN ('Business', 'Personal')) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- Table: Legs (Segments)
-- Granular leg-by-leg data linked to a Trip
CREATE TABLE Legs (
    LegID INT PRIMARY KEY IDENTITY(1,1),
    TripID INT NOT NULL,
    DepAirport VARCHAR(4) NOT NULL, -- ICAO code
    ArrAirport VARCHAR(4) NOT NULL, -- ICAO code
    BlockTime DECIMAL(5, 2) NOT NULL, -- In hours
    Distance DECIMAL(10, 2) NOT NULL, -- Statute Miles
    LegType VARCHAR(20) CHECK (LegType IN ('Live', 'Deadhead')) NOT NULL,
    RequiresOwnerAssignment BIT DEFAULT 0, -- Flag for deadheads needing allocation
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (TripID) REFERENCES Trips(TripID) ON DELETE CASCADE
);

-- Table: Passengers
-- Stores passenger details
CREATE TABLE Passengers (
    PaxID INT PRIMARY KEY IDENTITY(1,1),
    PaxName VARCHAR(100) NOT NULL,
    RelationshipToExecutive VARCHAR(100),
    DefaultTaxStatus VARCHAR(50) CHECK (DefaultTaxStatus IN ('Business', 'Personal-Non-Ent', 'Personal-Ent')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- Table: LegPassengers (Many-to-Many Linking Table)
-- Links Passengers to specific Legs with leg-specific tax context
CREATE TABLE LegPassengers (
    LegID INT NOT NULL,
    PaxID INT NOT NULL,
    TaxStatus VARCHAR(50) CHECK (TaxStatus IN ('Business', 'Personal-Non-Ent', 'Personal-Ent')) NOT NULL,
    PRIMARY KEY (LegID, PaxID),
    FOREIGN KEY (LegID) REFERENCES Legs(LegID) ON DELETE CASCADE,
    FOREIGN KEY (PaxID) REFERENCES Passengers(PaxID) ON DELETE CASCADE
);

-- Table: CostCenters
-- Tracks variable costs allocated per leg for SEC reporting
CREATE TABLE CostCenters (
    CostID INT PRIMARY KEY IDENTITY(1,1),
    LegID INT NOT NULL,
    FuelBurnCost DECIMAL(10, 2) DEFAULT 0.00,
    LandingFees DECIMAL(10, 2) DEFAULT 0.00,
    CateringCost DECIMAL(10, 2) DEFAULT 0.00,
    CrewTravelCost DECIMAL(10, 2) DEFAULT 0.00,
    ExternalCharterCost DECIMAL(10, 2) DEFAULT 0.00,
    TotalVariableCost AS (FuelBurnCost + LandingFees + CateringCost + CrewTravelCost + ExternalCharterCost) PERSISTED,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (LegID) REFERENCES Legs(LegID) ON DELETE CASCADE
);

-- Table: SIFLCalculations
-- Stores cached SIFL income results for reporting
CREATE TABLE SIFLCalculations (
    CalculationID INT PRIMARY KEY IDENTITY(1,1),
    LegID INT NOT NULL,
    PaxID INT NOT NULL,
    SIFLRatePeriod VARCHAR(20), -- e.g., '2023-H1'
    ImputedIncome DECIMAL(10, 2) NOT NULL,
    CalculationDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (LegID) REFERENCES Legs(LegID) ON DELETE CASCADE,
    FOREIGN KEY (PaxID) REFERENCES Passengers(PaxID) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IX_Trips_Date ON Trips(StartDate);
CREATE INDEX IX_Legs_TripID ON Legs(TripID);
CREATE INDEX IX_CostCenters_LegID ON CostCenters(LegID);
