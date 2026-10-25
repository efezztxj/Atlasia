#!/usr/bin/env node
/**
 * Atlasia — telefon önizlemesi (geliştirme aracı).
 *
 * NEDEN VAR: Uygulamanın telefon yerleşimi ancak gerçek bir telefon
 * görünümünde değerlendirilebiliyor. Bu araç, masaüstü tarayıcıda açılan
 * bir önizleme penceresine cihaz çerçeveleri koyar ve uygulamayı o
 * ölçülerde çalıştırıp mobil uygunluk ölçütlerini canlı ölçer.
 *
 * Üretim çıktısına girmez (public/ altında değil, build kapsamı dışında).
 * Kullanım:
 *   1) Ayrı terminalde: npm run dev
 *   2) node scripts/mobil-onizleme.mjs
 *   3) Tarayıcıda: http://localhost:5180/
 *
 * Telefon boyutunda bir ekranda açılırsa doğrudan uygulamaya geçilir;
 * yani aynı adres gerçek telefonda uygulamayı, masaüstünde denetim
 * masasını gösterir.
 */
import { createServer, request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const harnessPath = path.join(here, "mobil-onizleme", "index.html");

const PORT = Number(process.env.PORT ?? 5180);
const APP_URL = new URL(process.env.ATLASIA_APP_URL ?? "http://127.0.0.1:5173");
const APP_PREFIX = "/uygulama";

/** Uygulama sunucusuna istek aktarır; Host başlığı Vite'ın kendi adına çevrilir. */
function proxy(req, res) {
  const incoming = req.url ?? "/";
  const targetPath = incoming.startsWith(APP_PREFIX)
    ? incoming.slice(APP_PREFIX.length) || "/"
    : incoming;

  const upstream = httpRequest(
    {
      protocol: APP_URL.protocol,
      hostname: APP_URL.hostname,
      port: APP_URL.port,
      method: req.method,
      path: targetPath,
      headers: { ...req.headers, host: APP_URL.host },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      `Uygulama sunucusuna ulaşılamadı (${APP_URL.origin}).\n` +
        `Önce "npm run dev" çalıştırın.\n\n${error.message}\n`,
    );
  });

  req.pipe(upstream);
}

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";
  if (url === "/" || url.startsWith("/?")) {
    try {
      const html = await readFile(harnessPath);
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Önizleme sayfası okunamadı: ${error.message}\n`);
    }
    return;
  }
  proxy(req, res);
});

// Vite HMR websocket'i de aktarılır; aksi hâlde konsolda bağlantı hatası görünür.
server.on("upgrade", (req, socket, head) => {
  const upstream = httpRequest({
    hostname: APP_URL.hostname,
    port: APP_URL.port,
    path: req.url,
    headers: { ...req.headers, host: APP_URL.host },
  });
  upstream.on("upgrade", (upstreamRes, upstreamSocket, upstreamHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(upstreamRes.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\r\n")}\r\n\r\n`,
    );
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);
    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);
  });
  upstream.on("error", () => socket.destroy());
  upstream.end();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Atlasia telefon önizlemesi: http://localhost:${PORT}/`);
  console.log(`Uygulama kaynağı: ${APP_URL.origin}`);
});
