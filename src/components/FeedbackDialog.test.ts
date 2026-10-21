// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const submit = vi.hoisted(() => vi.fn());
vi.mock("../lib/feedback", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/feedback")>();
  return { ...actual, submitFeedback: submit };
});

import FeedbackDialog from "./FeedbackDialog";

const renderDialog = (uid: string | null, onClose: () => void = () => {}) =>
  render(createElement(FeedbackDialog, { uid, onClose }));

describe("FeedbackDialog", () => {
  beforeEach(() => submit.mockReset());
  afterEach(() => cleanup());

  it("boş mesajda gönder kapalıdır; girilince seçili kategoriyle gönderir ve başarı gösterir", async () => {
    submit.mockResolvedValue({ ok: true });
    renderDialog("alice");

    const send = screen.getByRole("button", { name: /Gönder/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Mesaj"), { target: { value: "Harita donuyor." } });
    fireEvent.click(send);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("alındı"));
    expect(submit).toHaveBeenCalledWith("alice", { category: "bug", message: "Harita donuyor." });
  });

  it("1000 karakteri aşan mesajda gönder kapalıdır", () => {
    renderDialog("alice");
    fireEvent.change(screen.getByLabelText("Mesaj"), { target: { value: "a".repeat(1001) } });
    expect((screen.getByRole("button", { name: /Gönder/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("gönderim hatası kullanıcıya gösterilir (yutulmaz)", async () => {
    submit.mockResolvedValue({ ok: false, error: "Çok sık gönderiyorsun." });
    renderDialog("alice");
    fireEvent.change(screen.getByLabelText("Mesaj"), { target: { value: "Merhaba" } });
    fireEvent.click(screen.getByRole("button", { name: /Gönder/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("Çok sık");
  });

  it("giriş yoksa gönderim yapmadan hata gösterir; Esc kapatır", async () => {
    const onClose = vi.fn();
    renderDialog(null, onClose);
    fireEvent.change(screen.getByLabelText("Mesaj"), { target: { value: "Merhaba" } });
    fireEvent.click(screen.getByRole("button", { name: /Gönder/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("giriş yapman");
    expect(submit).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
