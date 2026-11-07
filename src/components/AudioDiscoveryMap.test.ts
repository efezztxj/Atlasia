// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { AUDIO_DISCOVERY_TOURS } from "../data/audioDiscoveryFixtures";

const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock("./audioStopMarkers", () => ({ addAudioStopMarkers: mocks.add }));
import AudioDiscoveryMap from "./AudioDiscoveryMap";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("durak seçimi veya geri çağrı değişince pinleri yeniden oluşturmadan günceller", () => {
  mocks.add.mockReturnValue({ update: mocks.update, remove: mocks.remove });
  const map = {} as Map;
  const stops = AUDIO_DISCOVERY_TOURS[0].stops;
  const first = vi.fn();
  const second = vi.fn();
  const view = render(createElement(AudioDiscoveryMap, { map, stops, selected: 0, onSelect: first }));
  const click = mocks.add.mock.calls[0][3] as (index: number) => void;
  view.rerender(createElement(AudioDiscoveryMap, { map, stops, selected: 1, onSelect: second }));
  expect(mocks.add).toHaveBeenCalledTimes(1);
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenLastCalledWith(1);
  click(1);
  expect(second).toHaveBeenCalledWith(1);
  view.unmount();
  expect(mocks.remove).toHaveBeenCalledOnce();
});
