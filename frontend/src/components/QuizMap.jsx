import { MapContainer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import WorldMapLayer from "./WorldMapLayer.jsx";
import InvalidateOnResize from "./InvalidateOnResize.jsx";

// Простые цветные пины через DivIcon — без внешних картинок,
// чтобы не тащить лишние ассеты и легко управлять цветом из CSS.
function pinIcon(colorVar) {
  return L.divIcon({
    className: "quiz-pin",
    html: `<span class="quiz-pin__dot" style="background:${colorVar}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const GUESS_ICON = pinIcon("#ffffff");
const CORRECT_ICON = pinIcon("var(--color-accent)");

function ClickCatcher({ onGuess, disabled }) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onGuess(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function QuizMap({ guess, correct, onGuess, disabled, mapStyle }) {
  return (
    <MapContainer center={[20, 10]} zoom={2} minZoom={2} worldCopyJump className="quiz-map">
      <InvalidateOnResize />
      <WorldMapLayer mapStyle={mapStyle} />
      <ClickCatcher onGuess={onGuess} disabled={disabled} />

      {guess && <Marker position={[guess.lat, guess.lng]} icon={GUESS_ICON} />}
      {correct && <Marker position={[correct.lat, correct.lng]} icon={CORRECT_ICON} />}
      {guess && correct && (
        <Polyline
          positions={[
            [guess.lat, guess.lng],
            [correct.lat, correct.lng],
          ]}
          pathOptions={{ color: "var(--color-text-faint)", dashArray: "6 8", weight: 2 }}
        />
      )}
    </MapContainer>
  );
}
