/**
 * A real, live map (2026-09-13, engineer's own instruction - "google
 * eart harita olsun, bölgeyi zoom ederek göstersin... country seçince
 * haritada orası zoomlanmalı") zoomed to whatever place name is passed
 * in. Uses Google Maps' own no-API-key "embed a map" iframe URL
 * (`output=embed` - the same mechanism behind Google's own "Share >
 * Embed a map" feature, not the paid/keyed Maps JavaScript or Earth
 * API) with a satellite/hybrid view (`t=k`) for an Earth-like look.
 * Google auto-fits the zoom level to the place's own extent, so a
 * country name alone zooms out to show the whole country, exactly as
 * asked - no invented coordinates or hardcoded zoom levels per country.
 *
 * <p>Domain-free (just a place name in, a map iframe out), so it lives
 * in `shared/ui`.
 */
export default function CountryMap({ place }: { place: string }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(place)}&t=k&output=embed`
  return (
    <iframe
      key={place}
      title={`Map centered on ${place}`}
      src={src}
      width="100%"
      height="360"
      style={{ border: 0, borderRadius: 8, display: 'block' }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}
