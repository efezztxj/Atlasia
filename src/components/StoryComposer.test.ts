// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { createElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import StoryComposer from "./StoryComposer";
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

describe("M-46 / M-48 · StoryComposer (24 saatlik hikâye oluşturucu ve axe denetimi)", () => {
  it("boş metinde Paylaş düğmesini kilitler, metin girilince yayınlar ve axe temizdir", async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      createElement(StoryComposer, {
        place: { label: "Efes Antik Kenti", lat: 37.94, lng: 27.34 },
        defaultAuthor: "Efe",
        uploadPhoto: vi.fn(),
        onClose: vi.fn(),
        onPublish,
      }),
    );

    const audit = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(audit.violations).toEqual([]);

    const publishBtn = screen.getByRole("button", { name: /Paylaş/ }) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(true);

    fireEvent.change(screen.getByRole("textbox", { name: "Hikâye notu" }), {
      target: { value: "Gün batımında sütunlar harika" },
    });
    expect(publishBtn.disabled).toBe(false);

    fireEvent.click(publishBtn);
    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(1));
    expect(onPublish.mock.calls[0]?.[0]).toMatchObject({
      text: "Gün batımında sütunlar harika",
      author: "Efe",
      attachPlace: true,
    });
  });

  it("15 MB üstü fotoğraf yüklemesinde ImageInputError mesajını gösterir", async () => {
    const uploadPhoto = vi.fn().mockRejectedValue(
      new ImageInputError("Fotoğraf çok büyük (en fazla 25 MB seçilebilir)."),
    );
    const { container } = render(
      createElement(StoryComposer, {
        place: { label: "Priene", lat: 37.65, lng: 27.29 },
        defaultAuthor: "Gezgin",
        uploadPhoto,
        onClose: vi.fn(),
        onPublish: vi.fn(),
      }),
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["x"], "dev.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("25 MB");
    });
  });
});
