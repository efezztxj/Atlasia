# social/ — Instagram yayın kuyruğu

Bu klasör Atlasia'nın **otomatik Instagram yayınını** besler.

```
social/queue/        yayın bekleyen gönderiler (JSON)
social/published/    yayınlanmış gönderilerin arşivi (otomatik taşınır)
```

## Bir gönderi eklemek

`social/queue/2026-10-27-kyoto.json` gibi bir dosya oluştur:

```json
{
  "id": "2026-10-27-kyoto",
  "scheduledFor": "2026-10-27T18:00:00+03:00",
  "mediaType": "REELS",
  "mediaUrl": "https://atlasia.pages.dev/social/kyoto-yuruyus.mp4",
  "caption": "10.000 kapı var, hangisinden geçeceğini kimse söylemiyor.",
  "shareToFeed": true
}
```

Videoyu `public/social/` içine koy; `main`'e merge edilince
`https://atlasia.pages.dev/social/<dosya>` adresinden herkese açık olur.

`*.example.json` dosyaları yayınlanmaz — şablon olarak kalabilir.

## Doğrulama

```bash
npm run test:social
node scripts/publish-instagram.mjs --due --dry-run
```

## Tam kurulum

[docs/instagram-otomasyon.md](../docs/instagram-otomasyon.md)
