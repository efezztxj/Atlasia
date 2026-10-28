// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { createElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import AddDiscoveryModal from "./AddDiscoveryModal";
import * as geo from "../utils/geo";
import { ImageInputError } from "../utils/image";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get(this: HTMLElement) {
      return this === document.body ? null : document.body;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("M-46 / M-48 · AddDiscoveryModal (iz bırakma ve T10 fotoğraf hata yayılımı)", () => {
  it("form doğrulamasını uygular, geçerli kaydı gönderir ve axe ihlali üretmez", async () => {
    vi.spyOn(geo, "reverseName").mockResolvedValue("Selçuk, İzmir");
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { container } = render(
      createElement(AddDiscoveryModal, {
        draft: { lat: 37.94, lng: 27.34 },
        uploadPhoto: vi.fn(),
        onClose,
        onSave,
      }),
    );

    await waitFor(() => expect(screen.getByText("Selçuk, İzmir")).toBeTruthy());

    const submitBtn = screen.getByRole("button", { name: /İz bırak/ });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/Sessiz koy/), {
      target: { value: "Celsus Kitaplığı" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tarih" }));
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    const audit = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(audit.violations).toEqual([]);

    fireEvent.click(submitBtn);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      title: "Celsus Kitaplığı",
      category: "history",
      region: "Selçuk, İzmir",
    });
  });

  it("desteklenmeyen HEIC fotoğraf hatasını kullanıcıya net Türkçe mesajla gösterir", async () => {
    vi.spyOn(geo, "reverseName").mockResolvedValue("Urla");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const uploadPhoto = vi.fn().mockRejectedValue(
      new ImageInputError("HEIC/HEIF fotoğraflar doğrudan yüklenemiyor."),
    );

    const { container } = render(
      createElement(AddDiscoveryModal, {
        draft: { lat: 38.32, lng: 26.76 },
        uploadPhoto,
        onClose: vi.fn(),
        onSave: vi.fn(),
      }),
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const heicFile = new File(["heic"], "iphone.heic", { type: "" });
    fireEvent.change(fileInput, { target: { files: [heicFile] } });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("HEIC/HEIF");
    });
  });
});
