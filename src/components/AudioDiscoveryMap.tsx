import { useEffect, useRef } from "react";
import type { Map } from "maplibre-gl";
import type { AudioDiscoveryStop } from "../data/audioDiscovery";
import { addAudioStopMarkers } from "./audioStopMarkers";

export default function AudioDiscoveryMap({ map, stops, selected, onSelect }: { map: Map | null; stops: AudioDiscoveryStop[]; selected: number; onSelect: (index: number) => void }) {
  const markers = useRef<ReturnType<typeof addAudioStopMarkers> | null>(null);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  onSelectRef.current = onSelect;
  useEffect(() => {
    if (!map) return;
    const current = addAudioStopMarkers(map, stops, selectedRef.current, (index) => onSelectRef.current(index));
    markers.current = current;
    return () => { current.remove(); markers.current = null; };
  }, [map, stops]);
  useEffect(() => { markers.current?.update(selected); }, [map, stops, selected]);
  return null;
}
