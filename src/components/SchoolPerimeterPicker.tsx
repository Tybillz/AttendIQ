'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Crosshair, ShieldCheck, CheckCircle2, Sliders, AlertCircle, RefreshCw } from 'lucide-react';

interface SchoolPerimeterPickerProps {
  initialLat: number;
  initialLng: number;
  initialRadius: number;
  schoolName: string;
  onPerimeterChange: (lat: number, lng: number, radius: number) => void;
  onSavePermanent: (lat: number, lng: number, radius: number) => Promise<boolean>;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function SchoolPerimeterPicker({
  initialLat,
  initialLng,
  initialRadius,
  schoolName,
  onPerimeterChange,
  onSavePermanent,
}: SchoolPerimeterPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [lat, setLat] = useState<number>(initialLat || 9.121251);
  const [lng, setLng] = useState<number>(initialLng || 7.384811);
  const [radius, setRadius] = useState<number>(initialRadius || 250);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [locatingCurrent, setLocatingCurrent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Sync internal state when parent props change
  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat);
      setLng(initialLng);
    }
    if (initialRadius) {
      setRadius(initialRadius);
    }
  }, [initialLat, initialLng, initialRadius]);

  // Load Leaflet dynamically on browser
  useEffect(() => {
    let isCancelled = false;

    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;

      // 1. Inject Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Inject Leaflet JS if not loaded
      if (!(window as any).L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Leaflet script'));
          document.body.appendChild(script);
        });
      }

      if (isCancelled || !mapContainerRef.current) return;

      const L = (window as any).L;
      if (!L) return;

      // Initialize Map
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 16,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Marker for school center
        const marker = L.marker([lat, lng], {
          draggable: true,
          autoPan: true,
        }).addTo(map);

        marker.bindPopup(`<b>${schoolName || 'School Campus'}</b><br>Official Geofence Center`).openPopup();

        // Circle for perimeter radius
        const circle = L.circle([lat, lng], {
          radius: radius,
          color: '#4f46e5',
          fillColor: '#6366f1',
          fillOpacity: 0.22,
          weight: 2,
        }).addTo(map);

        // Map Click: Move marker and circle to clicked coordinate
        map.on('click', (e: any) => {
          const newLat = parseFloat(e.latlng.lat.toFixed(6));
          const newLng = parseFloat(e.latlng.lng.toFixed(6));
          updatePerimeterPosition(newLat, newLng);
        });

        // Marker Drag: Update coordinate on drag end
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          updatePerimeterPosition(newLat, newLng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
        setMapLoaded(true);

        // Invalidate size after layout renders
        setTimeout(() => {
          map.invalidateSize();
        }, 250);
      }
    };

    loadLeaflet().catch((err) => console.error('Map loading error:', err));

    return () => {
      isCancelled = true;
    };
  }, []);

  // Update map visual position when lat/lng/radius change
  const updatePerimeterPosition = (newLat: number, newLng: number, newRadius?: number) => {
    setLat(newLat);
    setLng(newLng);
    const rad = newRadius !== undefined ? newRadius : radius;
    if (newRadius !== undefined) setRadius(rad);

    onPerimeterChange(newLat, newLng, rad);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      circleRef.current.setLatLng([newLat, newLng]);
      if (newRadius !== undefined) {
        circleRef.current.setRadius(newRadius);
      }
      mapInstanceRef.current.panTo([newLat, newLng], { animate: true });
    }
  };

  // Live radius change
  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    onPerimeterChange(lat, lng, newRadius);
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius);
    }
  };

  // Search Address / Landmark via OpenStreetMap Nominatim
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=5`;
      const res = await fetch(endpoint, {
        headers: {
          'Accept-Language': 'en',
        },
      });

      if (!res.ok) throw new Error('Search failed');
      const data: SearchResult[] = await res.json();

      if (data.length === 0) {
        setSearchError('No matching locations found. Try entering a city, district, or street name.');
      } else {
        setSearchResults(data);
      }
    } catch (err: any) {
      setSearchError('Could not reach address search service. Please enter coordinates manually or click the map.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: SearchResult) => {
    const newLat = parseFloat(parseFloat(item.lat).toFixed(6));
    const newLng = parseFloat(parseFloat(item.lon).toFixed(6));
    updatePerimeterPosition(newLat, newLng);
    setSearchResults([]);
    setSearchQuery(item.display_name.split(',')[0]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 17);
    }
  };

  // One-Click "Use My Current Location" for testing convenience
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingCurrent(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingCurrent(false);
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        updatePerimeterPosition(newLat, newLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 17);
        }
        setSaveSuccess(`📍 Acquired current position (${newLat}, ${newLng})! Tap "Lock & Save Permanently" below to store.`);
        setTimeout(() => setSaveSuccess(null), 6000);
      },
      (err) => {
        setLocatingCurrent(false);
        alert(`Could not acquire GPS: ${err.message}. Please verify browser location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Save permanently to cloud database
  const handleSavePermanently = async () => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      const ok = await onSavePermanent(lat, lng, radius);
      if (ok) {
        setSaveSuccess(`✅ School Perimeter Permanently Tagged! All teacher devices will now verify against (${lat}, ${lng}) with a ${radius}m geofence.`);
      }
    } catch (err) {
      alert('Failed to save perimeter permanently.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-700 shadow-xl space-y-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/40">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Institutional School Perimeter Tag</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Device-Independent
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tag the school campus area once. Teachers' devices will calculate proximity relative to this permanently locked landmark.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Testing Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locatingCurrent}
          className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          title="Capture my current location for testing purposes"
        >
          <Crosshair className={`h-4 w-4 ${locatingCurrent ? 'animate-spin' : ''}`} />
          <span>{locatingCurrent ? 'Capturing GPS...' : '📍 Use My Current Location (Testing)'}</span>
        </button>
      </div>

      {/* Address Search Bar */}
      <div>
        <form onSubmit={handleSearchAddress} className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search school address, neighborhood, or landmark (e.g. Maitama Abuja, Gwarinpa, Lagos...)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Searching...' : 'Locate'}</span>
            </button>
          </div>
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-slate-950 border border-slate-700 rounded-xl p-2 space-y-1 shadow-2xl z-20">
            <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Select Location:</p>
            {searchResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => selectSearchResult(item)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-indigo-900/60 hover:text-white transition flex items-start gap-2 cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {searchError && (
          <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{searchError}</span>
          </p>
        )}
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
        <div
          ref={mapContainerRef}
          style={{ height: '360px', width: '100%' }}
          className="z-0"
        />

        {/* Floating Instruction Banner */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-[400] bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 text-[11px] text-slate-300 shadow-lg flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong>Interactive Mode:</strong> Tap anywhere on the map or drag the pin to position the school center.
          </span>
        </div>

        {/* Coordinate Badge on Map */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] font-mono text-slate-200 shadow-md">
          <span className="text-indigo-400 font-bold">Lat:</span> {lat.toFixed(6)} | <span className="text-indigo-400 font-bold">Lng:</span> {lng.toFixed(6)}
        </div>
      </div>

      {/* Radius Controls & Coordinate Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        {/* Geofence Radius Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-indigo-400" />
              <span>Allowed Boundary Radius:</span>
            </label>
            <span className="text-sm font-black font-mono text-indigo-400">
              {radius} meters
            </span>
          </div>

          <input
            type="range"
            min="50"
            max="1000"
            step="10"
            value={radius}
            onChange={(e) => handleRadiusChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-medium mr-1">Presets:</span>
            {[
              { label: '100m (Compact)', val: 100 },
              { label: '150m (Standard)', val: 150 },
              { label: '250m (Large Campus)', val: 250 },
              { label: '500m (Compound & Field)', val: 500 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => handleRadiusChange(p.val)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${
                  radius === p.val
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Latitude & Longitude Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Latitude (°N)
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) updatePerimeterPosition(val, lng);
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Longitude (°E)
            </label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) updatePerimeterPosition(lat, val);
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Saved coordinates persist permanently in the cloud database across all devices.</span>
        </div>

        <button
          type="button"
          onClick={handleSavePermanently}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{saving ? 'Locking Coordinates...' : '🔒 Permanently Lock School Perimeter'}</span>
        </button>
      </div>
    </div>
  );
}
