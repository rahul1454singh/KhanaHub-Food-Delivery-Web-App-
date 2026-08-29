import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, Crosshair, X, Navigation } from 'lucide-react';
import './LiveTrackingMap.css';

// Fixed KhanaHub Restaurant Location (Chitkara University, Baddi)
const DEFAULT_RESTAURANT = { 
  lat: 30.876307, 
  lng: 76.877861, 
  name: 'KhanaHub Restaurant' 
};

// Default Customer Destination
const DEFAULT_CUSTOMER_DESTINATION = {
  lat: 30.880000,
  lng: 76.885000
};

// Haversine distance in KM
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const LiveTrackingMap = ({
  pickupLocation = DEFAULT_RESTAURANT,
  customerLocation,
  deliveryBoyLocation,
  customerAddress = '',
  isLiveTracking = false
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeGroupRef = useRef(null);
  const markersRef = useRef({});

  const [routeStats, setRouteStats] = useState({ distance: '1.6 km', eta: '5 mins' });
  const [showStreetView, setShowStreetView] = useState(false);

  // Target Customer Destination
  const destLat = customerLocation?.lat || DEFAULT_CUSTOMER_DESTINATION.lat;
  const destLng = customerLocation?.lng || DEFAULT_CUSTOMER_DESTINATION.lng;

  // Local Restaurant Anchor
  let pickLat = pickupLocation?.lat || DEFAULT_RESTAURANT.lat;
  let pickLng = pickupLocation?.lng || DEFAULT_RESTAURANT.lng;

  if (calculateDistanceKm(pickLat, pickLng, destLat, destLng) > 15) {
    pickLat = destLat - 0.012;
    pickLng = destLng - 0.010;
  }

  // Rider position: anchor along road in local delivery area
  let boyLat = deliveryBoyLocation?.lat || (destLat - 0.007);
  let boyLng = deliveryBoyLocation?.lng || (destLng - 0.006);

  if (calculateDistanceKm(boyLat, boyLng, destLat, destLng) > 15) {
    boyLat = destLat - 0.007;
    boyLng = destLng - 0.006;
  }

  // 1. Map Initialization and Route Drawing (Runs once or when destination changes)
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [(boyLat + destLat) / 2, (boyLng + destLng) / 2],
        zoom: 15,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      routeGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const routeGroup = routeGroupRef.current;

    const createCustomIcon = (type) => {
      let iconHtml = '';
      if (type === 'restaurant') {
        iconHtml = `<div class="marker-pin restaurant" title="KhanaHub Restaurant"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div>`;
      } else if (type === 'delivery') {
        iconHtml = `<div class="marker-pin delivery" title="Delivery Rider"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`;
      } else {
        iconHtml = `<div class="marker-pin customer" title="Customer Delivery Location"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`;
      }
      return L.divIcon({ className: 'custom-map-marker', html: iconHtml, iconSize: [38, 38], iconAnchor: [19, 19] });
    };

    // Initialize Markers
    if (!markersRef.current.restaurant) {
      markersRef.current.restaurant = L.marker([pickLat, pickLng], { icon: createCustomIcon('restaurant') }).addTo(map).bindPopup(`<b>KhanaHub Restaurant</b>`);
    } else {
      markersRef.current.restaurant.setLatLng([pickLat, pickLng]);
    }

    if (!markersRef.current.customer) {
      markersRef.current.customer = L.marker([destLat, destLng], { icon: createCustomIcon('customer') }).addTo(map).bindPopup(`<b>Delivery Destination</b>`);
    } else {
      markersRef.current.customer.setLatLng([destLat, destLng]);
    }

    if (!markersRef.current.delivery) {
      markersRef.current.delivery = L.marker([boyLat, boyLng], { icon: createCustomIcon('delivery') }).addTo(map).bindPopup(`<b>Delivery Partner</b>`);
    }

    // Draw route from Restaurant to Customer (so we don't spam OSRM API)
    const drawCompleteRoute = (coords) => {
      if (!routeGroup) return;
      routeGroup.clearLayers();
      const finalPoints = [[pickLat, pickLng], ...coords, [destLat, destLng]];
      
      L.polyline(finalPoints, { color: '#38bdf8', weight: 10, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }).addTo(routeGroup);
      L.polyline(finalPoints, { color: '#0284c7', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(routeGroup);
      
      const bounds = L.latLngBounds(finalPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    };

    const fetchRoute = async () => {
      try {
        const startPoint = [pickLng, pickLat];
        const endPoint = [destLng, destLat];
        const url = `https://router.project-osrm.org/route/v1/driving/${startPoint[0]},${startPoint[1]};${endPoint[0]},${endPoint[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
          const rawCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          drawCompleteRoute(rawCoords);
        }
      } catch (e) {
        console.error('Error fetching route:', e);
      }
    };

    fetchRoute();
  }, [destLat, destLng, pickLat, pickLng, isLiveTracking]); // Removed boyLat, boyLng to prevent re-fetching and map clearing

  // 2. Real-time Marker Update & ETA calculation (Runs every time the bike moves)
  useEffect(() => {
    if (markersRef.current.delivery) {
      // Smoothly move the marker without redrawing the route
      markersRef.current.delivery.setLatLng([boyLat, boyLng]);
      
      // Update ETA dynamically based on new distance
      const straightDist = calculateDistanceKm(boyLat, boyLng, destLat, destLng);
      const roadDistKm = Math.max(0.1, Number((straightDist * 1.3).toFixed(1)));
      const etaMins = Math.max(1, Math.round(roadDistKm * 3.5));

      setRouteStats({
        distance: `${roadDistKm} km`,
        eta: `${etaMins} mins`
      });
    }
  }, [boyLat, boyLng, destLat, destLng]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([
        [pickLat, pickLng],
        [destLat, destLng],
        [boyLat, boyLng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div className="live-tracking-map-wrapper">
      {/* Route Info Badge */}
      <div className="map-route-info-badge">
        <div className="route-stat">
          <span className="stat-label">Distance</span>
          <span className="stat-value">{routeStats.distance}</span>
        </div>
        <div className="stat-divider" />
        <div className="route-stat">
          <span className="stat-label">Estimated Time</span>
          <span className="stat-value" style={{ color: '#0284c7' }}>{routeStats.eta}</span>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="map-floating-controls">
        <button type="button" className="map-control-btn" onClick={handleRecenter} title="Fit Route in View">
          <Crosshair size={16} /> Recenter
        </button>
        <button 
          type="button" 
          className="map-control-btn" 
          onClick={() => setShowStreetView(true)}
          title="Open Street View"
        >
          <Eye size={16} /> Street View
        </button>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="map-container-element" />

      {/* Street View Modal */}
      {showStreetView && (
        <div className="streetview-modal-overlay" onClick={() => setShowStreetView(false)}>
          <div className="streetview-modal" onClick={e => e.stopPropagation()}>
            <div className="streetview-header">
              <h3>Street View — Delivery Location</h3>
              <button className="streetview-close-btn" onClick={() => setShowStreetView(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="streetview-iframe-container">
              <iframe
                title="Street View"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${destLat},${destLng}&layer=c&cbll=${destLat},${destLng}&cbp=11,0,0,0,0&output=svembed`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTrackingMap;
