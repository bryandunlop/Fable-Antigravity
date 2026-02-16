# Technical Architecture Diagram

```mermaid
graph TB
    %% Nodes
    subgraph Client ["Client Layer"]
        Browser["Web Browser<br>(React/Vite Application)"]
    end

    subgraph Hosting ["Hosting & Infrastructure"]
        Vercel["Frontend Hosting<br>(Vercel / Local:3000)"]
        AzureServices["Azure Services"]
        
        subgraph AzureDetails ["Azure Components"]
            AzureStorage["Azure Blob Storage<br>(Port: 443)"]
            AzureAPIM["Azure API Management<br>(SatCom Gateway)<br>(Port: 443)"]
        end
    end

    subgraph ExternalAPIs ["External Integrations"]
        CAMP["CAMP CMP<br>(Maintenance Sync)<br>(Port: 443)"]
        MyAirOps["myairops<br>(Flight Data / OData)<br>(Port: 443)"]
        ForeFlight["ForeFlight API<br>(Flight Plans & Weather)<br>(Port: 443)"]
        SatComDirect["SatCom Direct ADX<br>(Movement & Position)<br>(Port: 443)"]
        FAA_ASWS["FAA ASWS<br>(Weather & NOTAMs)<br>(Port: 443)"]
        ADIP["FAA ADIP<br>(Airport Data)<br>(Port: 443)"]
    end

    %% Connections
    Browser -- "HTTPS / 443" --> Vercel
    
    %% Backend Integrations (via Edge Functions or Client Proxies)
    Vercel -.-> AzureAPIM
    AzureAPIM --> SatComDirect
    
    %% Direct Integrations
    Browser -- "HTTPS / 443" --> CAMP
    Browser -- "HTTPS / 443" --> MyAirOps
    Browser -- "OData / 443" --> MyAirOps
    Browser -- "HTTPS / 443" --> ForeFlight
    Browser -- "HTTPS / 443" --> FAA_ASWS
    Browser -- "HTTPS / 443" --> ADIP
    
    %% Azure Storage Integration
    Browser -.-> AzureStorage

    %% Data Flow
    SatComDirect -- "OOOI & Position Data" --> AzureAPIM
    CAMP -- "Maintenance Status" --> Browser
    MyAirOps -- "Flight Schedules" --> Browser

    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef housing fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    classDef azure fill:#e0f7fa,stroke:#006064,stroke-width:2px;
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px;

    class Browser client;
    class Vercel housing;
    class AzureStorage,AzureAPIM azure;
    class CAMP,MyAirOps,ForeFlight,SatComDirect,FAA_ASWS,ADIP external;
```

## System Components

### 1. Client Layer
- **Web Application**: React 18, Vite, TypeScript.
- **Port**: 3000 (Local Development), 443 (Production).

### 2. Hosting & Infrastructure
- **Frontend**: Hosted on Vercel (or similar static hose).
- **Azure Integration**:
  - **Azure Blob Storage**: Used for scalable file and document storage (Port 443).
  - **Azure API Management (APIM)**: Secure gateway for SatCom Direct integration (Port 443).

### 3. External Integrations
- **CAMP CMP**: 
  - Protocol: HTTPS
  - Port: 443
  - Purpose: Synchronizing maintenance status, due lists, and work orders.
- **myairops**: 
  - Protocol: OData / HTTPS
  - Port: 443
  - Purpose: Fetching flight schedules, crew assignments, and aircraft availability.
- **SatCom Direct**: 
  - Via Azure APIM
  - Purpose: Real-time aircraft movement (OOOI) and position updates.
- **ForeFlight**: 
  - Protocol: HTTPS
  - Port: 443
  - Purpose: Flight planning, filing, and weather data.
- **FAA ASWS & ADIP**: 
  - Protocol: HTTPS
  - Port: 443
  - Purpose: US government aviation data and airport facility directories.
