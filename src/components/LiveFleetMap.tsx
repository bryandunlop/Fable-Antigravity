import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useSatcomDirect } from './hooks/useSatcomDirect';
import {
  Plane,
  MapPin,
  Clock,
  Fuel,
  RefreshCw,
  Loader2,
  Zap,
  Wifi,
  WifiOff,
  Radio,
  Minimize2,
  Activity,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';

// Leaflet types and imports using CDN
declare global {
  interface Window {
    L: any;
    hasAutoZoomed?: boolean;
  }
}

interface MapLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
}

const MAP_LAYERS: MapLayer[] = [
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri'
  },
  {
    id: 'dark',
    name: 'Midnight',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CartoDB'
  },
  {
    id: 'streets',
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  {
    id: 'topo',
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors'
  }
];

const CITY_NAMES: { [key: string]: string } = {
  'LAX': 'Los Angeles',
  'JFK': 'New York',
  'MIA': 'Miami',
  'ORD': 'Chicago',
  'LGA': 'New York',
  'EWR': 'Newark',
  'ATL': 'Atlanta',
  'LHR': 'London',
  'CDG': 'Paris',
  'DXB': 'Dubai',
  'HND': 'Tokyo'
};

export default function LiveFleetMap() {
  const { aircraftPositions, aircraftStatuses, loading, error, refetch } = useSatcomDirect();
  const [selectedAircraft, setSelectedAircraft] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<string>('satellite');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isAutoTourActive, setIsAutoTourActive] = useState(true);

  // Refs for Map and Markers
  const mapRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map()); // Map<tailNumber, Marker>
  const flightPathsMapRef = useRef<Map<string, any>>(new Map()); // Map<tailNumber, Polyline>
  const cityLabelsMapRef = useRef<Map<string, any[]>>(new Map()); // Map<tailNumber, Marker[]>
  const tourTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapLoaded(true);
      script.onerror = () => setMapError(true);
      document.head.appendChild(script);

      timeoutId = setTimeout(() => {
        if (!window.L) setMapError(true);
      }, 8000);
    } else {
      setMapLoaded(true);
    }

    return () => clearTimeout(timeoutId);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || mapRef.current || !window.L) return;

    const L = window.L;
    const map = L.map('fleet-map', {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    L.control.attribution({ position: 'bottomright' }).addTo(map);

    const currentLayer = MAP_LAYERS.find(l => l.id === activeLayer) || MAP_LAYERS[0];
    L.tileLayer(currentLayer.url, {
      attribution: currentLayer.attribution,
      maxZoom: 18,
    }).addTo(map);

    // Stop auto-tour on user interaction
    map.on('mousedown touchstart wheel dragstart', () => {
      setIsAutoTourActive(false);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapLoaded]);

  // Update Map Layer
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const L = window.L;

    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });

    const currentLayer = MAP_LAYERS.find(l => l.id === activeLayer) || MAP_LAYERS[0];
    L.tileLayer(currentLayer.url, {
      attribution: currentLayer.attribution,
      maxZoom: 18,
    }).addTo(mapRef.current);
  }, [activeLayer, mapLoaded]);

  // Create Marker Icon Function
  const createAircraftIcon = (aircraft: any, isSelected: boolean) => {
    const L = window.L;
    const isOnline = aircraftStatuses.find(s => s.tailNumber === aircraft.tailNumber)?.isOnline;
    const isParked = aircraft.flightPhase === 'Parked';
    const color = isSelected ? '#60a5fa' : (isParked ? '#94a3b8' : '#e2e8f0');
    const pulseColor = isOnline ? '#10b981' : '#ef4444';
    const size = isParked ? 32 : 48; // Made slightly larger
    const iconSize = isSelected ? size * 1.2 : size;

    return L.divIcon({
      className: 'custom-aircraft-marker',
      html: `
        <div class="relative transition-all duration-300 ${isSelected ? 'scale-110' : ''}" style="width: ${iconSize}px; height: ${iconSize}px;">
          ${!isParked && isOnline ? `<div class="absolute inset-0 rounded-full animate-ping opacity-75" style="background-color: ${pulseColor}; transform: scale(0.6);"></div>` : ''}
          <div style="width: 100%; height: 100%; transform: rotate(${aircraft.heading || 0}deg); filter: drop-shadow(0 4px 8px rgba(0,0,0,0.8)); transition: transform 0.5s ease-in-out;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="${color}" stroke="${isSelected ? '#2563eb' : 'black'}" stroke-width="1.5" />
            </svg>
          </div>
          ${isSelected || (!isParked) ? `<div class="absolute left-1/2 -bottom-6 transform -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-white whitespace-nowrap shadow-xl z-50">${aircraft.tailNumber}</div>` : ''}
        </div>
      `,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
      popupAnchor: [0, -iconSize / 2]
    });
  };

  // Update Markers (Differential Update)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.L) return;
    const L = window.L;

    // Set of current tail numbers for cleanup
    const currentTailNumbers = new Set(aircraftPositions.map(a => a.tailNumber));

    // Remove markers/paths/labels that are no longer present
    const cleanupMap = (mapRef: React.MutableRefObject<Map<string, any>>) => {
      mapRef.current.forEach((item, tailNumber) => {
        if (!currentTailNumbers.has(tailNumber)) {
          if (Array.isArray(item)) { // Handle array of markers (city labels)
            item.forEach(i => i.remove());
          } else {
            item.remove();
          }
          mapRef.current.delete(tailNumber);
        }
      });
    };

    cleanupMap(markersMapRef);
    cleanupMap(flightPathsMapRef);
    cleanupMap(cityLabelsMapRef);

    // Update or Create Markers
    aircraftPositions.forEach(aircraft => {
      const isSelected = selectedAircraft === aircraft.tailNumber;

      // Handle Marker
      if (markersMapRef.current.has(aircraft.tailNumber)) {
        const marker = markersMapRef.current.get(aircraft.tailNumber);
        marker.setLatLng([aircraft.latitude, aircraft.longitude]);
        marker.setIcon(createAircraftIcon(aircraft, isSelected));
        marker.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker([aircraft.latitude, aircraft.longitude], {
          icon: createAircraftIcon(aircraft, isSelected),
          zIndexOffset: isSelected ? 1000 : 0
        }).addTo(mapRef.current);

        marker.on('click', () => {
          setSelectedAircraft(aircraft.tailNumber);
          setIsAutoTourActive(false);
        });

        const popupContent = `
          <div class="font-sans antialiased text-zinc-900">
             <div class="flex items-center justify-between mb-2 pb-2 border-b border-zinc-200">
               <span class="font-bold text-sm">${aircraft.tailNumber}</span>
             </div>
             <button onclick="window.selectAircraft('${aircraft.tailNumber}')" class="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors">Track Aircraft</button>
          </div>
        `;
        marker.bindPopup(popupContent, { maxWidth: 200, className: 'glass-popup' });
        markersMapRef.current.set(aircraft.tailNumber, marker);
      }

      // Handle Flight Path & City Labels
      if (aircraft.flightPhase !== 'Parked' && aircraft.departureAirport && aircraft.arrivalAirport) {
        const airportCoords: { [key: string]: [number, number] } = {
          'LAX': [33.9416, -118.4085], 'JFK': [40.6413, -73.7781], 'MIA': [25.7959, -80.2870],
          'ORD': [41.9742, -87.9073], 'LGA': [40.7769, -73.8740], 'EWR': [40.6895, -74.1745],
          'ATL': [33.6407, -84.4277], 'LHR': [51.4700, -0.4543], 'CDG': [49.0097, 2.5479],
          'DXB': [25.2532, 55.3657], 'HND': [35.5494, 139.7798]
        };
        const depCoords = airportCoords[aircraft.departureAirport];
        const arrCoords = airportCoords[aircraft.arrivalAirport];

        if (depCoords && arrCoords) {
          const pathCoords = [depCoords, [aircraft.latitude, aircraft.longitude], arrCoords];

          // 1. Flight Path Polyline
          if (flightPathsMapRef.current.has(aircraft.tailNumber)) {
            const polyline = flightPathsMapRef.current.get(aircraft.tailNumber);
            polyline.setLatLngs(pathCoords);
            polyline.setStyle({
              color: isSelected ? '#60a5fa' : '#94a3b8',
              weight: isSelected ? 3 : 2,
              opacity: isSelected ? 0.9 : 0.6
            });
          } else {
            const polyline = L.polyline(pathCoords, {
              color: isSelected ? '#60a5fa' : '#94a3b8',
              weight: isSelected ? 3 : 2,
              opacity: isSelected ? 0.9 : 0.6,
              dashArray: '8, 8',
              className: 'animate-dash-flow'
            }).addTo(mapRef.current);
            flightPathsMapRef.current.set(aircraft.tailNumber, polyline);
          }

          // 2. City Labels
          // Only create if not already existing
          if (!cityLabelsMapRef.current.has(aircraft.tailNumber)) {
            const createLabel = (coords: [number, number], code: string) => {
              const cityName = CITY_NAMES[code] || code;
              return L.marker(coords, {
                icon: L.divIcon({
                  className: 'city-label-icon',
                  html: `<div class="px-2 py-1 rounded bg-black/80 border border-white/20 text-white text-xs font-bold shadow-lg backdrop-blur-sm whitespace-nowrap">${cityName}</div>`,
                  iconSize: [0, 0], // Size handled by CSS/content
                  iconAnchor: [4, 20] // Offset slightly up
                }),
                zIndexOffset: -100 // Behind aircraft
              }).addTo(mapRef.current);
            };

            const depMarker = createLabel(depCoords, aircraft.departureAirport);
            const arrMarker = createLabel(arrCoords, aircraft.arrivalAirport);

            cityLabelsMapRef.current.set(aircraft.tailNumber, [depMarker, arrMarker]);
          }
        }
      } else {
        // If parked, remove regular path stuff
        if (flightPathsMapRef.current.has(aircraft.tailNumber)) {
          flightPathsMapRef.current.get(aircraft.tailNumber).remove();
          flightPathsMapRef.current.delete(aircraft.tailNumber);
        }
        if (cityLabelsMapRef.current.has(aircraft.tailNumber)) {
          cityLabelsMapRef.current.get(aircraft.tailNumber).forEach((m: any) => m.remove());
          cityLabelsMapRef.current.delete(aircraft.tailNumber);
        }
      }
    });

  }, [aircraftPositions, aircraftStatuses, selectedAircraft, mapLoaded, activeLayer]);

  // Auto Tour Logic
  useEffect(() => {
    if (!isAutoTourActive || !mapRef.current || !mapLoaded || selectedAircraft) return;

    const activeFlights = aircraftPositions.filter(a => a.flightPhase !== 'Parked');
    if (activeFlights.length === 0) return;

    let currentIndex = 0;

    const tour = () => {
      const aircraft = activeFlights[currentIndex];
      mapRef.current.flyTo([aircraft.latitude, aircraft.longitude], 6, {
        animate: true,
        duration: 3
      });
      currentIndex = (currentIndex + 1) % activeFlights.length;
    };

    tour();
    const interval = setInterval(tour, 10000);
    return () => clearInterval(interval);
  }, [isAutoTourActive, mapLoaded, aircraftPositions.length, selectedAircraft]);


  // Global function for popup button
  useEffect(() => {
    (window as any).selectAircraft = (tailNumber: string) => {
      setSelectedAircraft(tailNumber);
      setIsAutoTourActive(false);
    };
  }, []);

  const selectedAircraftData = aircraftPositions.find(a => a.tailNumber === selectedAircraft);
  const selectedAircraftStatus = aircraftStatuses.find(s => s.tailNumber === selectedAircraft);
  const activeFlightsCount = aircraftPositions.filter(a => a.flightPhase !== 'Parked').length;

  if (mapError) return <div className="h-[800px] bg-zinc-900 border border-red-500/30 flex items-center justify-center text-red-500">Map Error</div>;
  if (!mapLoaded) return <div className="h-[800px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400"><Loader2 className="animate-spin mr-2" /> Initializing Map...</div>;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-zinc-950 border border-zinc-800">
      <style>{`
        @keyframes dash-flow { to { stroke-dashoffset: -16; } }
        .animate-dash-flow { animation: dash-flow 1s linear infinite; }
        .glass-panel {
          background: #18181b; /* zinc-900 */
          border: 1px solid #27272a; /* zinc-800 */
        }
        .glass-popup .leaflet-popup-content-wrapper {
          background: #ffffff;
          padding: 0;
        }
        .glass-popup .leaflet-popup-tip { background: #ffffff; }
      `}</style>

      <div id="fleet-map" className="w-full z-0" style={{ height: '800px', filter: 'brightness(0.85)' }} />

      {/* Top Left Overlay - Title & Status */}
      <div className="absolute top-4 left-4 z-[5000] pointer-events-auto">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl flex items-center gap-6">
          <div>
            <h2 className="text-white font-bold text-lg leading-none tracking-tight">GLOBAL FLEET</h2>
            <div className="text-zinc-400 text-[10px] uppercase tracking-widest mt-1 font-medium">Live Tracking Operations</div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400 leading-none">{activeFlightsCount}</div>
              <div className="text-[10px] text-zinc-500 uppercase font-medium">Active</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400 leading-none">{aircraftStatuses.filter(s => s.isOnline).length}</div>
              <div className="text-[10px] text-zinc-500 uppercase font-medium">Online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Right Overlay - Controls */}
      <div className="absolute top-4 right-4 z-[5000] pointer-events-auto flex flex-col gap-2 items-end">
        {/* Auto Tour Toggle */}
        <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg shadow-xl">
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs gap-2 font-bold cursor-pointer transition-all ${isAutoTourActive ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setIsAutoTourActive(!isAutoTourActive);
            }}
          >
            {isAutoTourActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isAutoTourActive ? 'Auto Tour Active' : 'Auto Tour Paused'}
          </Button>
        </div>

        {/* Map Layers */}
        <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg flex gap-1 shadow-xl">
          {MAP_LAYERS.map(layer => (
            <button
              key={layer.id}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setActiveLayer(layer.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer ${activeLayer === layer.id ? 'bg-zinc-100 text-black shadow-lg scale-105' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              {layer.name}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg shadow-xl">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              refetch();
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Aircraft Detail Panel */}
      <div className={`absolute top-24 bottom-6 right-4 w-96 z-[1000] transition-transform duration-500 ease-in-out ${selectedAircraft ? 'translate-x-0' : 'translate-x-[120%]'}`}>
        {selectedAircraftData && selectedAircraftStatus && (
          <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-white">
            <div className="p-5 border-b border-zinc-800 bg-gradient-to-r from-blue-900/20 to-transparent">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <Plane className="w-6 h-6 text-blue-400 transform -rotate-45" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-white">{selectedAircraftData.tailNumber}</h3>
                    <p className="text-sm text-blue-400 font-mono">{selectedAircraftData.callSign || 'NO CALLSIGN'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 -mt-2 -mr-2" onClick={() => setSelectedAircraft(null)}>
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className={`border-none bg-emerald-500/10 text-emerald-400 ${selectedAircraftData.flightPhase === 'Parked' ? 'bg-zinc-800 text-zinc-400' : ''}`}>
                  {selectedAircraftData.flightPhase.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={`border-none ${selectedAircraftStatus.isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} flex gap-1 items-center`}>
                  {selectedAircraftStatus.isOnline ? <><Wifi className="w-3 h-3" /> ONLINE</> : <><WifiOff className="w-3 h-3" /> OFFLINE</>}
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-5 space-y-6">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-3 tracking-wider">Telemetry</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase mb-1">Altitude</div>
                      <div className="text-xl font-mono font-medium">{selectedAircraftData.altitude.toLocaleString()} <span className="text-sm text-zinc-600">ft</span></div>
                    </div>
                    <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase mb-1">Ground Speed</div>
                      <div className="text-xl font-mono font-medium">{selectedAircraftData.groundSpeed} <span className="text-sm text-zinc-600">kts</span></div>
                    </div>
                    <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase mb-1">Heading</div>
                      <div className="text-xl font-mono font-medium">{selectedAircraftData.heading}°</div>
                    </div>
                    <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase mb-1">Vertical Spd</div>
                      <div className={`text-xl font-mono font-medium ${selectedAircraftData.verticalSpeed > 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {Math.abs(selectedAircraftData.verticalSpeed)} <span className="text-sm text-zinc-600">fpm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
              <div className="bg-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-auto border border-zinc-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-zinc-300 font-medium tracking-wide">
                  LIVE CONNECTED • LAST UPDATE {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
