import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import WorldMapLayer from "./WorldMapLayer.jsx";
import InvalidateOnResize from "./InvalidateOnResize.jsx";

const PIN_ICON = L.divIcon({
  className: "quiz-pin",
  html: `<span class="quiz-pin__dot" style="background:var(--color-accent)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickCatcher({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PickMap({ point, onPick }) {
  return (
    <MapContainer center={[20, 10]} zoom={1} minZoom={1} worldCopyJump className="pick-map">
      <InvalidateOnResize />
      <WorldMapLayer mapStyle="landmarks" />
      <ClickCatcher onPick={onPick} />
      {point && <Marker position={[point.lat, point.lng]} icon={PIN_ICON} />}
    </MapContainer>
  );
}
