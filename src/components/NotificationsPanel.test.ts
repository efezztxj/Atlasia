// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AppNotification, NotificationType } from "../lib/notifications";
import NotificationsPanel from "./NotificationsPanel";

/**
 * Denetim K-06 kilidi: panelde ham şema anahtarı (`group_message`,
 * `friend_accepted`…) değil Türkçe etiket görünür.
 */
const notification = (type: NotificationType): AppNotification => ({
  id: `n-${type}`,
  recipientUid: "u1",
  actorUid: "u2",
  type,
  title: "Başlık",
  body: "Gövde",
  read: true,
  createdAt: Date.now(),
});

const renderPanel = (notifications: AppNotification[]) =>
  render(createElement(NotificationsPanel, {
    notifications,
    unreadCount: 0,
    onClose: () => {},
    onMarkAllRead: () => {},
    onMarkRead: () => {},
  }));

describe("NotificationsPanel", () => {
  afterEach(() => cleanup());

  it("ham tip anahtarı yerine Türkçe etiket gösterir", () => {
    renderPanel([notification("group_message"), notification("friend_accepted")]);
    expect(screen.getByText(/Grup mesajı/)).toBeTruthy();
    expect(screen.getByText(/Arkadaşlık kabulü/)).toBeTruthy();
    expect(screen.queryByText(/group_message/)).toBeNull();
    expect(screen.queryByText(/friend_accepted/)).toBeNull();
  });

  it("boş durumda tutulamayacak bir moderasyon sözü vermez", () => {
    renderPanel([]);
    const text = screen.getByText(/Rapor sonucu bildirimi/);
    expect(text.textContent).not.toMatch(/burada görünecek/);
  });
});
