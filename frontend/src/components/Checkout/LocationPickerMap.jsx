import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPickerMap.css';

const LocationPickerMap = ({ lat, lon, onLocationChange }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const initialLat = lat || 27.7172;
  const initialLon = lon || 85.3240;

  // Custom Red Pin Icon
  const createRedPinIcon = () => {
    const iconHtml = `
      <div class="custom-red-pin">
        <svg class="red-pin-svg" width="34" height="42" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
        </svg>
      </div>
    `;

    return L.divIcon({
      className: 'custom-pin-marker',
      html: iconHtml,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
      popupAnchor: [0, -38]
    });
  };

  const reverseGeocode = async (newLat, newLon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLon}`);
      if (res.ok) {
        const data = await res.json();
        const address = data.display_name || '';
        const city = data.address?.city || data.address?.town || data.address?.state_district || data.address?.county || '';
        if (onLocationChange) {
          onLocationChange({ lat: newLat, lon: newLon, address, city });
        }
        return;
      }
    } catch (e) {
      console.warn("Reverse geocode failed", e);
    }
    if (onLocationChange) {
      onLocationChange({ lat: newLat, lon: newLon });
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 15,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add draggable red pin
      const marker = L.marker([initialLat, initialLon], {
        icon: createRedPinIcon(),
        draggable: true
      }).addTo(map);

      marker.bindPopup('<b>Delivery Pin</b><br/>Drag pin or click map to move').openPopup();

      // On Marker Drag End
      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        reverseGeocode(pos.lat, pos.lng);
      });

      // On Map Click - move pin to clicked spot
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        reverseGeocode(clickLat, clickLng);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map alive across standard renders
    };
  }, []);

  // Update map view when coordinates change from "Use My Current Location" button
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && lat && lon) {
      const currentMarkerPos = markerRef.current.getLatLng();
      if (Math.abs(currentMarkerPos.lat - lat) > 0.0001 || Math.abs(currentMarkerPos.lng - lon) > 0.0001) {
        markerRef.current.setLatLng([lat, lon]);
        mapInstanceRef.current.setView([lat, lon], 16, { animate: true });
      }
    }
  }, [lat, lon]);

  return (
    <div className="location-picker-map-wrapper">
      <div ref={mapContainerRef} className="location-picker-map-element" />
      <div className="map-drag-hint">📍 Drag pin or click map to pinpoint exact delivery spot</div>
    </div>
  );
};

export default LocationPickerMap;
