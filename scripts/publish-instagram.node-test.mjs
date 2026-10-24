/**
 * Kimlik bilgisi gerektirmeyen testler: scripts/publish-instagram.mjs
 * Ağa hiç çıkmaz; fetch enjekte edilerek sahte yanıtlar kullanılır.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  CAPTION_MAX,
  buildContainerBody,
  countHashtags,
  createContainer,
  errorHint,
  isDue,
  isValidHttpsUrl,
  parseArgs,
  publishContainer,
  validatePost,
  waitForContainer,
} from "./publish-instagram.mjs";

const base = {
  id: "2026-10-27-kyoto",
  mediaUrl: "https://atlasia.pages.dev/social/kyoto.mp4",
  mediaType: "REELS",
  caption: "On bin kapı var.\n\nSırayı biz yazdık.",
};

test("isValidHttpsUrl yalnızca https kabul eder", () => {
  assert.equal(isValidHttpsUrl("https://ornek.com/a.mp4"), true);
  assert.equal(isValidHttpsUrl("http://ornek.com/a.mp4"), false);
  assert.equal(isValidHttpsUrl("ftp://ornek.com/a.mp4"), false);
  assert.equal(isValidHttpsUrl(""), false);
  assert.equal(isValidHttpsUrl(null), false);
  assert.equal(isValidHttpsUrl("sadece/metin.mp4"), false);
});

test("geçerli kayıt sorunsuz doğrulanır", () => {
  assert.deepEqual(validatePost(base), []);
});

test("eksik alanlar raporlanır", () => {
  const problems = validatePost({});
  assert.ok(problems.length >= 3);
  assert.ok(problems.some((p) => p.includes("id")));
  assert.ok(problems.some((p) => p.includes("mediaUrl")));
  assert.ok(problems.some((p) => p.includes("caption")));
});

test("uzun caption ve fazla hashtag reddedilir", () => {
  const long = validatePost({ ...base, caption: "a".repeat(CAPTION_MAX + 1) });
  assert.ok(long.some((p) => p.includes("karakterden uzun")));

  const tags = Array.from({ length: 31 }, (_, i) => `#etiket${i}`).join(" ");
  const hashtag = validatePost({ ...base, caption: `deneme ${tags}` });
  assert.ok(hashtag.some((p) => p.includes("hashtag")));
});

test("countHashtags Türkçe karakterli etiketleri sayar", () => {
  assert.equal(countHashtags("#gezi #şehir #çok-güzel"), 3);
  assert.equal(countHashtags("hashtag yok"), 0);
});

test("desteklenmeyen mediaType ve bozuk coverUrl reddedilir", () => {
  assert.ok(validatePost({ ...base, mediaType: "VIDEO" }).some((p) => p.includes("mediaType")));
  assert.ok(validatePost({ ...base, coverUrl: "http://x.com/c.jpg" }).some((p) => p.includes("coverUrl")));
});

test("isDue zamanlanmamış kaydı hazır sayar", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  assert.equal(isDue({ ...base }, now), true);
  assert.equal(isDue({ ...base, scheduledFor: "2026-10-27T11:59:00Z" }, now), true);
  assert.equal(isDue({ ...base, scheduledFor: "2026-10-27T12:01:00Z" }, now), false);
  assert.equal(isDue({ ...base, scheduledFor: "bozuk-tarih" }, now), false);
});

test("buildContainerBody REELS için doğru alanları üretir", () => {
  const body = buildContainerBody({ ...base, shareToFeed: false, coverUrl: "https://x.com/c.jpg" });
  assert.equal(body.get("media_type"), "REELS");
  assert.equal(body.get("video_url"), base.mediaUrl);
  assert.equal(body.get("share_to_feed"), "false");
  assert.equal(body.get("cover_url"), "https://x.com/c.jpg");
  assert.equal(body.get("caption"), base.caption);
  assert.equal(body.get("image_url"), null);
});

test("buildContainerBody IMAGE için image_url kullanır", () => {
  const body = buildContainerBody({ ...base, mediaType: "IMAGE", mediaUrl: "https://x.com/a.jpg" });
  assert.equal(body.get("image_url"), "https://x.com/a.jpg");
  assert.equal(body.get("video_url"), null);
});

test("parseArgs bayrakları ve değerleri okur", () => {
  const args = parseArgs(["--due", "--dry-run", "--api-version", "v26.0", "--post-id", "abc"]);
  assert.equal(args.due, true);
  assert.equal(args.dryRun, true);
  assert.equal(args.apiVersion, "v26.0");
  assert.equal(args.postId, "abc");
  assert.throws(() => parseArgs(["--yok"]), /Bilinmeyen argüman/);
});

test("errorHint bilinen kodlar için Türkçe ipucu döner", () => {
  assert.match(errorHint(190), /jeton/i);
  assert.match(errorHint(9), /herkese açık/i);
  assert.match(errorHint(2207026), /H\.264/);
  assert.match(errorHint(12345, 99999), /12345/);
});

test("createContainer POST eder ve container id döner", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: "1789" }), { status: 200 });
  };
  const id = await createContainer({
    host: "https://graph.facebook.com",
    apiVersion: "v26.0",
    igUserId: "42",
    accessToken: "tok",
    post: base,
    fetchImpl,
  });
  assert.equal(id, "1789");
  assert.equal(calls[0].init.method, "POST");
  assert.match(calls[0].url, /\/v26\.0\/42\/media\?access_token=tok$/u);
  assert.match(calls[0].init.body, /media_type=REELS/u);
});

test("createContainer Meta hatasını okunur mesaja çevirir", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: { code: 9, message: "Media fetch failed" } }), { status: 400 });
  await assert.rejects(
    () =>
      createContainer({
        host: "https://graph.facebook.com",
        apiVersion: "v26.0",
        igUserId: "42",
        accessToken: "tok",
        post: base,
        fetchImpl,
      }),
    /herkese açık/u,
  );
});

test("waitForContainer FINISHED olana kadar bekler", async () => {
  const statuses = ["IN_PROGRESS", "IN_PROGRESS", "FINISHED"];
  let i = 0;
  const fetchImpl = async () =>
    new Response(JSON.stringify({ status_code: statuses[Math.min(i++, statuses.length - 1)] }), { status: 200 });
  const seen = [];
  const result = await waitForContainer({
    host: "https://graph.facebook.com",
    apiVersion: "v26.0",
    containerId: "c1",
    accessToken: "tok",
    fetchImpl,
    pollIntervalMs: 1,
    maxWaitMs: 5000,
    sleep: async () => {},
    onPoll: ({ attempt, status }) => seen.push(`${attempt}:${status}`),
  });
  assert.equal(result, "FINISHED");
  assert.deepEqual(seen, ["1:IN_PROGRESS", "2:IN_PROGRESS", "3:FINISHED"]);
});

test("waitForContainer ERROR durumunda durur", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ status_code: "ERROR" }), { status: 200 });
  await assert.rejects(
    () =>
      waitForContainer({
        host: "https://graph.facebook.com",
        apiVersion: "v26.0",
        containerId: "c1",
        accessToken: "tok",
        fetchImpl,
        sleep: async () => {},
      }),
    /işleme başarısız/u,
  );
});

test("waitForContainer süre aşımında hata verir", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ status_code: "IN_PROGRESS" }), { status: 200 });
  await assert.rejects(
    () =>
      waitForContainer({
        host: "https://graph.facebook.com",
        apiVersion: "v26.0",
        containerId: "c1",
        accessToken: "tok",
        fetchImpl,
        maxWaitMs: -1,
        sleep: async () => {},
      }),
    /hazır olmadı/u,
  );
});

test("publishContainer creation_id gönderir", async () => {
  let captured = null;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({ id: "999" }), { status: 200 });
  };
  const mediaId = await publishContainer({
    host: "https://graph.facebook.com",
    apiVersion: "v26.0",
    igUserId: "42",
    accessToken: "tok",
    containerId: "1789",
    fetchImpl,
  });
  assert.equal(mediaId, "999");
  assert.match(captured.init.body, /creation_id=1789/u);
  assert.match(captured.url, /media_publish/u);
});

test("loadPublishedIds yayınlanmış kimlikleri toplar", async () => {
  const { mkdtemp, writeFile, mkdir } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { loadPublishedIds } = await import("./publish-instagram.mjs");

  const dir = await mkdtemp(path.join(tmpdir(), "atlasia-social-"));
  const done = path.join(dir, "published");
  await mkdir(done, { recursive: true });
  await writeFile(path.join(done, "2026-10-27-kyoto-2026-10-27T15-00-00-000Z.json"), "{}");
  await writeFile(path.join(done, "elle-yazilmis.json"), "{}");

  const ids = await loadPublishedIds(done);
  assert.equal(ids.has("2026-10-27-kyoto"), true);
  assert.equal(ids.has("elle-yazilmis"), true);
  assert.equal(ids.size, 2);
});

test("loadPublishedIds klasör yoksa boş küme döner", async () => {
  const { loadPublishedIds } = await import("./publish-instagram.mjs");
  const ids = await loadPublishedIds("/tmp/atlasia-yok-boyle-bir-klasor-xyz");
  assert.equal(ids.size, 0);
});
