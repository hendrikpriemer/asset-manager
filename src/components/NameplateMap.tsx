"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const MARKER_ICON = divIcon({
  className: "",
  html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.925 0 1 4.925 1 11c0 8.25 11 21 11 21s11-12.75 11-21C23 4.925 18.075 0 12 0z" fill="var(--color-primary)" />
    <circle cx="12" cy="11" r="4" fill="var(--color-on-primary)" />
  </svg>`,
  iconSize: [24, 32],
  iconAnchor: [12, 32],
});

export function NameplateMap({ lat, lon }: { lat: number; lon: number }) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "300px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]} icon={MARKER_ICON} />
    </MapContainer>
  );
}
