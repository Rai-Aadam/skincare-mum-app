# SkinCare Mum — App v1 (PWA)

**One codebase. One push updates every device. No monthly cost. No App Store / Play Store fees.**

This is a **Progressive Web App (PWA)** for [skincaremum.com](https://skincaremum.com).
Customers install it from Chrome (Android / desktop) or Safari (iPhone) — "Add to Home Screen" — and it opens like a real app, full-screen, with its own icon.

## What it does

- **Live products from Shopify** — on load it fetches `https://skincaremum.com/products.json?limit=250` (title, price, compare-at price, stock, images, variants, description). Add / change / reprice a product in Shopify and the app shows it automatically. No app update needed.
- **Offline fallback** — if the live fetch fails, it shows 13 verified sample products (prices checked 2026-11-06) and a clear "Offline sample" badge, so the app never looks broken.
- **Shop** — search, brand filter chips (Medicube, Huda Beauty, Sheglam, CeraVe, Cosrx, Anua, AXIS-Y, The Ordinary, Skin 1004, Beauty of Joseon, Makeup, Mist & Perfume, Viral Picks…), sort (Featured / Price ↑ / Price ↓ / Biggest discount), in-stock-only filter.
- **Product detail** — photo, description, shade/variant selector (price updates), quantity, Add to Cart, "Buy on Website" link to the real product page.
- **Cart (saved on device)** — add / remove / quantity, subtotal, free-shipping progress bar to **Rs 5,000**, promo code **MUM10 = 10% off**, then:
  - **Order via WhatsApp (COD)** — builds the order message (items, subtotal, discount, total) and opens `wa.me/923180404069` (+92 318 0404069).
  - **Checkout on Website** — for card / website payment.
- **Wishlist (saved on device)** — heart any product, view it in the Wishlist tab.
- **Install** — captures `beforeinstallprompt` (Chrome/Android/desktop) with an Install button + banner; on iPhone Safari it shows the "Share → Add to Home Screen" hint.
- **Works offline** for the app shell (service worker caches index / CSS / JS / icons).

## Files

| File | What it is |
|---|---|
| `index.html` | App shell: header + search, hero, brand chips, product grids, product modal, cart drawer, bottom nav (Home / Shop / Wishlist / Cart), install banner, footer |
| `styles.css` | All styling — blush pink `#C2185B` / `#FCE4EC`, white, rounded cards, mobile-first, responsive grid |
| `app.js` | All logic — vanilla JS, **no framework, no build step**. Edit offers in the `CONFIG` block at the top |
| `manifest.webmanifest` | App name, icon, colours, `display: standalone`, `start_url: ./index.html` |
| `sw.js` | Service worker — cache-first for the shell, network-first for `products.json` |
| `logo.png` | Real SkinCare Mum logo — "SKINCARE MUM / GLOW LIKE NEVER BEFORE", black on white, used in the header and hero |
| `icon-192.png` / `icon-512.png` | App install icons made from the real logo, white square, cropped so the logo reads at small size |
| `README.md` | This file |

All paths are **relative** (`./…`), so the app works opened from the file system *and* from GitHub Pages. No absolute `/` paths.

## Edit products / offers in ONE place

**Products, prices & stock: edit in Shopify only.** The app reads them live — do not edit prices in `app.js` (the 13 fallback products there are only for offline use).

**Offers, contact & thresholds: edit the `CONFIG` block at the top of `app.js`:**

```js
WHATSAPP_NUMBER: "923180404069",
FREE_SHIPPING_THRESHOLD: 5000,   // Rs
DISCOUNT_CODE: "MUM10",
DISCOUNT_PERCENT: 10,
```

Change one of those, commit + push, and every installed device gets it on its next visit (service worker updates the shell in the background).

## Deploy — free on GitHub Pages (no monthly cost)

1. Create a GitHub repo, e.g. `skincare-mum-app`, and push this folder's contents to the `main` branch. (Do **not** run `gh auth` / push from this workspace — the parent agent handles GitHub.)
2. In the repo: **Settings → Pages → Source: Deploy from a branch → Branch: `main` → Folder: `/ (root)` → Save.**
3. Your app is live at `https://<your-username>.github.io/skincare-mum-app/` — share that link, or link it from skincaremum.com (e.g. a "Get our App" banner).
4. **Every later change = edit → commit → push.** That's it. No rebuild, no store review, no fee. Installed users get the new version on next launch.

> Optional custom domain: in Pages settings add `app.skincaremum.com` (or similar) and add the CNAME record in your domain DNS. Not required — the `github.io` link works as-is.

## Test locally before deploying

```bash
# From this folder:
python3 -m http.server 8000
# then open http://localhost:8000/  (service worker + install need http, not file://)
node --check app.js   # syntax check
```

In Chrome DevTools → Application → Manifest / Service Workers you can verify installability. On iPhone, open the Pages link in Safari → Share → Add to Home Screen.

## Limitations — please read

- **Shopify checkout stays on the website.** The app does not take card payments itself. COD orders go via WhatsApp; card/website checkout links out to skincaremum.com. This keeps it free and avoids payment / PCI work.
- **iOS push notifications are not included.** iOS Safari PWAs have very limited web-push support and it needs a paid Apple Developer account + server for real push. Android Chrome can be extended later if wanted. The app itself is fully usable on iOS (install, browse, cart, WhatsApp order).
- **iOS install is manual** ("Share → Add to Home Screen") — Apple does not allow an automatic install prompt on iPhone. The app shows a hint for this.
- **Cart & wishlist are per-device** (localStorage). They do not sync between a customer's phone and laptop, and are not shared with the website cart.
- **Live products need internet** and Shopify's `products.json` to stay public (it is, by default, on Shopify). Offline, only the sample products show.
- **Fallback images are placeholders** (blush gradient + product initial). No Shopify CDN image URLs were invented — live products use their real Shopify images; only the offline sample list uses placeholders.
