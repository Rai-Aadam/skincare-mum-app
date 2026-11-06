/* ============================================================================
   SkinCare Mum — PWA v1  (vanilla JS, no framework, no build step)
   ----------------------------------------------------------------------------
   EDIT OFFERS / CONTACT IN THIS ONE PLACE — one change here updates the app
   on every device after the next GitHub push (users get it on next visit).
   Products themselves are NOT edited here: they load live from Shopify
   (PRODUCTS_JSON below). The FALLBACK_PRODUCTS list is only shown when the
   live fetch fails / the device is offline.
   ========================================================================== */
const CONFIG = {
  STORE_NAME: "SkinCare Mum",
  STORE_URL: "https://skincaremum.com",
  PRODUCTS_JSON: "https://skincaremum.com/products.json?limit=250",
  WHATSAPP_NUMBER: "923180404069", // +92 318 0404069 — no +, no spaces
  FREE_SHIPPING_THRESHOLD: 5000,   // Rs — free shipping above this
  DISCOUNT_CODE: "MUM10",          // 10% extra off
  DISCOUNT_PERCENT: 10,
  CURRENCY: "Rs",
  BRANDS: ["Medicube","Huda Beauty","Sheglam","Makeup","CeraVe","Cosrx","Anua","AXIS-Y","The Ordinary","Skin 1004 Centella","Beauty of Joseon","Mist & Perfume","Viral Picks","Viral Lip Sets","Top Sellers"],
  CONTACT: { address: "DHA Phase 5, Lahore", email: "skincaremum33@gmail.com", phone: "+92 3180404069" }
};

/* Fallback products — ONLY used if the live Shopify fetch fails.
   Prices verified 2026-11-06 from the store. No CDN image URLs are invented:
   fallback items use a clean blush placeholder with the product initial. */
const FALLBACK_PRODUCTS = [
  { title:"Huda Beauty Blush Filter Palette", handle:"huda-beauty-blush-filter-palette", vendor:"Huda Beauty", product_type:"Makeup", price:4699, compare_at_price:7500, available:true, image:null, body_html:"" },
  { title:"Huda Beauty Easy Bake Pressed Powder", handle:"huda-beauty-easy-bake-pressed-powder", vendor:"Huda Beauty", product_type:"Makeup", price:4899, compare_at_price:6500, available:true, image:null, body_html:"" },
  { title:"Anua PDRN Hyaluronic Acid Capsule Mist", handle:"anua-pdrn-hyaluronic-acid-capsule-mist", vendor:"Anua", product_type:"Skincare", price:3899, compare_at_price:6000, available:true, image:null, body_html:"" },
  { title:"Dior Rosy Glow Blush", handle:"dior-rosy-glow-blush", vendor:"Dior", product_type:"Makeup", price:4999, compare_at_price:9000, available:true, image:null, body_html:"" },
  { title:"Skin1004 Madagascar Centella Ampoule", handle:"skin1004-madagascar-centella-ampoule", vendor:"Skin 1004 Centella", product_type:"Skincare", price:3299, compare_at_price:5499, available:true, image:null, body_html:"" },
  { title:"Medicube Night Wrapping Mask", handle:"medicube-night-wrapping-mask", vendor:"Medicube", product_type:"Skincare", price:3899, compare_at_price:5999, available:true, image:null, body_html:"" },
  { title:"Medicube Collagen Gelly Cream", handle:"medicube-collagen-gelly-cream", vendor:"Medicube", product_type:"Skincare", price:4399, compare_at_price:7499, available:true, image:null, body_html:"" },
  { title:"CeraVe Hydrating Cleanser", handle:"cerave-hydrating-cleanser", vendor:"CeraVe", product_type:"Skincare", price:2999, compare_at_price:7000, available:true, image:null, body_html:"" },
  { title:"Beauty of Joseon Dynasty Cream", handle:"beauty-of-joseon-dynasty-cream", vendor:"Beauty of Joseon", product_type:"Skincare", price:3399, compare_at_price:6999, available:true, image:null, body_html:"" },
  { title:"Biodance Bio Collagen Real Deep Mask", handle:"biodance-bio-collagen-real-deep-mask", vendor:"Biodance", product_type:"Skincare", price:1349, compare_at_price:2500, available:true, image:null, body_html:"" },
  { title:"Sheglam Buttery Bliss Blush Stick", handle:"sheglam-buttery-bliss-blush-stick", vendor:"Sheglam", product_type:"Makeup", price:2099, compare_at_price:null, available:true, image:null, body_html:"" },
  { title:"Sheglam Bold Booster Lip Plumper", handle:"sheglam-bold-booster-lip-plumper", vendor:"Sheglam", product_type:"Makeup", price:2499, compare_at_price:4000, available:true, image:null, body_html:"" },
  { title:"Dior Backstage Glow Face Palette", handle:"dior-backstage-glow-face-palette", vendor:"Dior", product_type:"Makeup", price:4499, compare_at_price:10999, available:true, image:null, body_html:"" }
];
/* ============================ end of editable CONFIG ======================= */

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const fmt = n => CONFIG.CURRENCY + " " + Number(n || 0).toLocaleString("en-PK");
const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const stripHtml = html => { const d = document.createElement("div"); d.innerHTML = html || ""; return (d.textContent || "").trim().slice(0, 600); };

let allProducts = [], live = false, activeBrand = "All", searchTerm = "", sortBy = "featured", inStockOnly = false, deferredPrompt = null;
let cart = load("skm_cart_v1", []);           // [{key, handle, title, variant, price, image, qty}]
let wishlist = load("skm_wishlist_v1", []);   // [handle]
let promoApplied = load("skm_promo_v1", false);

function load(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2200); }

/* ---------- Live products (primary) / fallback (offline) ---------- */
function normalize(p) {
  const v0 = (p.variants && p.variants[0]) || {};
  const price = parseFloat(v0.price != null ? v0.price : p.price) || 0;
  const compare = v0.compare_at_price ? parseFloat(v0.compare_at_price) : (p.compare_at_price ? parseFloat(p.compare_at_price) : null);
  const img = (p.images && p.images[0] && (p.images[0].src || p.images[0])) || p.image || null;
  return {
    title: p.title, handle: p.handle || slug(p.title), vendor: p.vendor || "",
    product_type: p.product_type || "", tags: p.tags || "",
    price, compare_at_price: compare, available: v0.available !== false && p.available !== false,
    image: img, body_html: p.body_html || "",
    variants: (p.variants || []).map(v => ({ id: v.id, title: v.title || "Default", price: parseFloat(v.price) || price,
      compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : compare, available: v.available !== false }))
  };
}
async function loadProducts() {
  setBadge("● Loading…", "");
  try {
    const res = await fetch(CONFIG.PRODUCTS_JSON, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const list = (data.products || []).map(normalize).filter(p => p.price > 0);
    if (!list.length) throw new Error("No products in feed");
    allProducts = list; live = true;
    setBadge("● Live from skincaremum.com", "live");
  } catch (e) {
    allProducts = FALLBACK_PRODUCTS.map(normalize); live = false;
    setBadge("● Offline sample — connect to load live products", "offline");
  }
  renderAll();
}
function setBadge(text, cls) { const b = $("#liveBadge"); b.textContent = text; b.className = "live-badge " + cls; }

/* ---------- Filtering / sorting / rendering ---------- */
function filtered() {
  let list = allProducts.slice();
  if (activeBrand !== "All") {
    const b = activeBrand.toLowerCase();
    list = list.filter(p => (p.vendor || "").toLowerCase().includes(b) || (p.product_type || "").toLowerCase().includes(b)
      || (p.tags || "").toLowerCase().includes(b) || (p.title || "").toLowerCase().includes(b));
  }
  if (searchTerm) { const q = searchTerm.toLowerCase(); list = list.filter(p => ((p.title + " " + p.vendor + " " + p.product_type).toLowerCase()).includes(q)); }
  if (inStockOnly) list = list.filter(p => p.available);
  if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (sortBy === "discount") list.sort((a, b) => discountPct(b) - discountPct(a));
  return list;
}
function discountPct(p) { return p.compare_at_price && p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0; }
function productImage(p, cls) {
  // Broken images are replaced by a placeholder initial via the global
  // capture-phase error listener below (no inline onerror needed).
  if (p.image) return '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" data-fallback-initial="' + esc((p.title || "S").charAt(0)) + '">';
  return '<span class="ph">' + esc((p.title || "S").charAt(0)) + "</span>";
}
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img && img.tagName === "IMG" && img.dataset.fallbackInitial) {
    const span = document.createElement("span");
    span.className = "ph"; span.textContent = img.dataset.fallbackInitial;
    img.replaceWith(span);
  }
}, true);
function cardHtml(p) {
  const off = discountPct(p), wished = wishlist.includes(p.handle);
  return '<article class="card" data-handle="' + esc(p.handle) + '">' +
    '<div class="card-img" data-open="' + esc(p.handle) + '">' + productImage(p) + "</div>" +
    '<div class="card-body"><span class="card-brand">' + esc(p.vendor || p.product_type || "SkinCare Mum") + "</span>" +
    '<div class="card-title" data-open="' + esc(p.handle) + '">' + esc(p.title) + "</div>" +
    '<div class="price-row"><span class="price">' + fmt(p.price) + "</span>" +
    (p.compare_at_price && p.compare_at_price > p.price ? '<span class="was">' + fmt(p.compare_at_price) + "</span><span class='off'>−" + off + "%</span>" : "") + "</div>" +
    (p.available ? "" : '<span class="out">Out of stock</span>') +
    '<div class="card-actions"><button class="btn btn-small" data-add="' + esc(p.handle) + '"' + (p.available ? "" : " disabled") + ">Add to Cart</button>" +
    '<button class="heart' + (wished ? " active" : "") + '" data-wish="' + esc(p.handle) + '" aria-label="Toggle wishlist">' + (wished ? "♥" : "♡") + "</button></div>" +
    "</div></article>";
}
function renderAll() {
  const list = filtered();
  $("#productGrid").innerHTML = list.map(cardHtml).join("");
  $("#featuredGrid").innerHTML = list.slice(0, 8).map(cardHtml).join("");
  const wl = allProducts.filter(p => wishlist.includes(p.handle));
  $("#wishlistGrid").innerHTML = wl.map(cardHtml).join("");
  $("#wishlistEmpty").hidden = wl.length > 0;
  $("#emptyState").hidden = list.length > 0;
  $("#resultCount").textContent = list.length + " product" + (list.length === 1 ? "" : "s") + (live ? " — live from skincaremum.com" : " — offline sample");
  $("#homeCount").textContent = "• " + allProducts.length + " products";
  renderChips(); updateBadges(); renderCart();
}
function renderChips() {
  const brands = ["All"].concat(CONFIG.BRANDS);
  const html = brands.map(b => '<button class="chip' + (activeBrand === b ? " active" : "") + '" data-brand="' + esc(b) + '">' + esc(b) + "</button>").join("");
  $("#brandChipsHome").innerHTML = html; $("#brandChipsShop").innerHTML = html;
}

/* ---------- Navigation ---------- */
function goto(view) {
  $$(".view").forEach(v => v.classList.remove("active"));
  const el = $("#view-" + view); if (el) el.classList.add("active");
  $$(".nav-item[data-nav]").forEach(b => b.classList.toggle("active", b.dataset.nav === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.addEventListener("click", e => {
  const nav = e.target.closest("[data-nav]"); if (nav) { goto(nav.dataset.nav); return; }
  const go = e.target.closest("[data-goto]"); if (go) { goto(go.dataset.goto); return; }
  const brand = e.target.closest("[data-brand]"); if (brand) { activeBrand = brand.dataset.brand; renderAll(); if (!$("#view-shop").classList.contains("active")) goto("shop"); return; }
  const add = e.target.closest("[data-add]"); if (add) { addToCart(add.dataset.add); return; }
  const wish = e.target.closest("[data-wish]"); if (wish) { toggleWish(wish.dataset.wish); return; }
  const open = e.target.closest("[data-open]"); if (open) { openProduct(open.dataset.open); return; }
  if (e.target.closest("[data-close-modal]")) { $("#productModal").hidden = true; return; }
  if (e.target.closest("[data-close-cart]")) { $("#cartDrawer").hidden = true; return; }
});
$("#navCart").addEventListener("click", () => { renderCart(); $("#cartDrawer").hidden = false; });
$("#cartBtn").addEventListener("click", () => { renderCart(); $("#cartDrawer").hidden = false; });
document.addEventListener("keydown", e => { if (e.key === "Escape") { $("#productModal").hidden = true; $("#cartDrawer").hidden = true; } });

/* ---------- Search / sort / filter ---------- */
$("#searchInput").addEventListener("input", e => { searchTerm = e.target.value.trim(); renderAll(); });
$("#sortSelect").addEventListener("change", e => { sortBy = e.target.value; renderAll(); });
$("#inStockOnly").addEventListener("change", e => { inStockOnly = e.target.checked; renderAll(); });

/* ---------- Product modal ---------- */
let modalProduct = null, modalVariant = 0, modalQty = 1;
function findProduct(handle) { return allProducts.find(p => p.handle === handle); }
function openProduct(handle) {
  const p = findProduct(handle); if (!p) return;
  modalProduct = p; modalVariant = 0; modalQty = 1;
  const off = discountPct(p);
  const variants = (p.variants && p.variants.length > 1) ? p.variants : [];
  $("#modalContent").innerHTML =
    '<div class="modal-img">' + productImage(p) + "</div>" +
    '<p class="card-brand" style="margin:12px 0 0">' + esc(p.vendor || "") + (p.product_type ? " • " + esc(p.product_type) : "") + "</p>" +
    "<h2 style='margin:4px 0'>" + esc(p.title) + "</h2>" +
    '<div class="price-row"><span class="price" id="modalPrice" style="font-size:1.3rem">' + fmt(p.price) + "</span>" +
    (p.compare_at_price ? '<span class="was">' + fmt(p.compare_at_price) + "</span><span class='off'>−" + off + "%</span>" : "") + "</div>" +
    (p.available ? "" : '<p class="out">Currently out of stock on the website.</p>') +
    (variants.length ? '<p><strong>Shade / Option:</strong></p><div class="variant-row">' + variants.map((v, i) =>
      '<button class="variant' + (i === 0 ? " active" : "") + '" data-variant="' + i + '">' + esc(v.title) + "</button>").join("") + "</div>" : "") +
    '<div class="qty-row"><button id="qtyMinus" aria-label="Decrease quantity">−</button><strong id="qtyVal">1</strong><button id="qtyPlus" aria-label="Increase quantity">+</button>' +
    '<span class="muted small">' + (p.available ? "In stock" : "Out of stock") + "</span></div>" +
    (stripHtml(p.body_html) ? '<p class="desc">' + esc(stripHtml(p.body_html)) + "</p>" : '<p class="desc muted">100% Authentic product from SkinCare Mum — Korean skincare &amp; makeup, since 2024. COD across Pakistan, free shipping above Rs 5,000.</p>') +
    '<button class="btn btn-primary btn-block" id="modalAdd"' + (p.available ? "" : " disabled") + ">Add to Cart — <span id='modalTotal'>" + fmt(p.price) + "</span></button>" +
    '<a class="btn btn-outline btn-block" href="' + CONFIG.STORE_URL + "/products/" + esc(p.handle) + '" target="_blank" rel="noopener">Buy on Website →</a>';
  $("#productModal").hidden = false;
  $$("#modalContent [data-variant]").forEach(b => b.addEventListener("click", () => {
    modalVariant = +b.dataset.variant;
    $$("#modalContent [data-variant]").forEach(x => x.classList.remove("active")); b.classList.add("active");
    const v = modalProduct.variants[modalVariant];
    $("#modalPrice").textContent = fmt(v.price); $("#modalTotal").textContent = fmt(v.price * modalQty);
  }));
  $("#qtyMinus").addEventListener("click", () => { if (modalQty > 1) { modalQty--; syncModalQty(); } });
  $("#qtyPlus").addEventListener("click", () => { modalQty++; syncModalQty(); });
  $("#modalAdd").addEventListener("click", () => { addToCart(modalProduct.handle, modalQty, modalVariant); $("#productModal").hidden = true; });
}
function syncModalQty() { $("#qtyVal").textContent = modalQty; const v = modalProduct.variants[modalVariant] || modalProduct; $("#modalTotal").textContent = fmt((v.price || modalProduct.price) * modalQty); }

/* ---------- Wishlist ---------- */
function toggleWish(handle) {
  wishlist = wishlist.includes(handle) ? wishlist.filter(h => h !== handle) : wishlist.concat(handle);
  save("skm_wishlist_v1", wishlist); renderAll();
  toast(wishlist.includes(handle) ? "Saved to wishlist ♥" : "Removed from wishlist");
}
function updateBadges() {
  const n = cart.reduce((s, i) => s + i.qty, 0);
  $("#cartCount").textContent = n;
  const nc = $("#cartCountNav"); nc.textContent = n; nc.hidden = n === 0;
  const w = $("#wishCount"); w.textContent = wishlist.length; w.hidden = wishlist.length === 0;
}

/* ---------- Cart ---------- */
function addToCart(handle, qty, variantIdx) {
  const p = findProduct(handle); if (!p || !p.available) return;
  const v = (p.variants && p.variants[variantIdx || 0]) || null;
  const key = handle + "::" + (v ? v.title : "Default");
  const existing = cart.find(i => i.key === key);
  if (existing) existing.qty += (qty || 1);
  else cart.push({ key, handle, title: p.title, variant: v ? v.title : "", price: v ? v.price : p.price, image: p.image || null, qty: qty || 1 });
  save("skm_cart_v1", cart); updateBadges(); renderCart();
  toast("Added to cart ✓");
}
function cartTotals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoApplied ? Math.round(subtotal * CONFIG.DISCOUNT_PERCENT / 100) : 0;
  const after = subtotal - discount;
  const freeShip = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD;
  return { subtotal, discount, total: after, freeShip };
}
function renderCart() {
  updateBadges();
  const box = $("#cartItems"); if (!box) return;
  if (!cart.length) { box.innerHTML = '<p class="empty">Your cart is empty. Add something you love 💕</p>'; }
  else box.innerHTML = cart.map((i, idx) =>
    '<div class="cart-item">' + (i.image ? '<img src="' + esc(i.image) + '" alt="" data-fallback-initial="' + esc(i.title.charAt(0)) + '">' : '<span class="ph">' + esc(i.title.charAt(0)) + "</span>") +
    '<div><strong>' + esc(i.title) + "</strong>" + (i.variant && i.variant !== "Default" ? '<br><span class="muted small">' + esc(i.variant) + "</span>" : "") +
    '<br><span class="muted small">' + fmt(i.price) + ' each</span>' +
    '<div class="qty"><button data-dec="' + idx + '">−</button><strong>' + i.qty + '</strong><button data-inc="' + idx + '">+</button>' +
    '<button class="remove" data-del="' + idx + '">Remove</button></div></div>' +
    "<strong>" + fmt(i.price * i.qty) + "</strong></div>").join("");
  $$("#cartItems [data-inc]").forEach(b => b.addEventListener("click", () => { cart[+b.dataset.inc].qty++; save("skm_cart_v1", cart); renderCart(); }));
  $$("#cartItems [data-dec]").forEach(b => b.addEventListener("click", () => { const it = cart[+b.dataset.dec]; it.qty--; if (it.qty <= 0) cart.splice(+b.dataset.dec, 1); save("skm_cart_v1", cart); renderCart(); }));
  $$("#cartItems [data-del]").forEach(b => b.addEventListener("click", () => { cart.splice(+b.dataset.del, 1); save("skm_cart_v1", cart); renderCart(); }));
  const t = cartTotals();
  $("#cartSubtotal").textContent = fmt(t.subtotal);
  $("#discountRow").hidden = !promoApplied || !t.discount;
  $("#cartDiscount").textContent = "− " + fmt(t.discount);
  $("#cartShipping").textContent = !cart.length ? "—" : (t.freeShip ? "FREE ✓" : "Calculated at checkout");
  $("#cartTotal").textContent = fmt(t.total);
  const remaining = Math.max(0, CONFIG.FREE_SHIPPING_THRESHOLD - t.subtotal);
  $("#shipProgress").innerHTML = t.freeShip
    ? "🎉 <strong>You've unlocked FREE shipping!</strong><div class='ship-bar'><i style='width:100%'></i></div>"
    : "Add <strong>" + fmt(remaining) + "</strong> more for FREE shipping (above " + fmt(CONFIG.FREE_SHIPPING_THRESHOLD) + ")<div class='ship-bar'><i style='width:" + Math.min(100, t.subtotal / CONFIG.FREE_SHIPPING_THRESHOLD * 100) + "%'></i></div>";
  $("#promoMsg").textContent = promoApplied ? "✓ " + CONFIG.DISCOUNT_CODE + " applied — " + CONFIG.DISCOUNT_PERCENT + "% off" : "Tip: use code " + CONFIG.DISCOUNT_CODE + " for " + CONFIG.DISCOUNT_PERCENT + "% off.";
  $("#promoInput").value = promoApplied ? CONFIG.DISCOUNT_CODE : $("#promoInput").value;
  $("#whatsappCheckout").disabled = !cart.length;
}
$("#applyPromo").addEventListener("click", () => {
  const code = $("#promoInput").value.trim().toUpperCase();
  if (code === CONFIG.DISCOUNT_CODE) { promoApplied = true; save("skm_promo_v1", true); toast("✓ " + CONFIG.DISCOUNT_CODE + " applied — 10% off"); }
  else { promoApplied = false; save("skm_promo_v1", false); toast("That code isn't valid. Try " + CONFIG.DISCOUNT_CODE); }
  renderCart();
});
$("#clearCart").addEventListener("click", () => { if (cart.length && confirm("Clear your cart?")) { cart = []; save("skm_cart_v1", cart); renderCart(); } });
$("#whatsappCheckout").addEventListener("click", () => {
  if (!cart.length) return;
  const t = cartTotals();
  const lines = ["Hello SkinCare Mum! I would like to order (from the app):", ""];
  cart.forEach(i => lines.push("• " + i.title + (i.variant && i.variant !== "Default" ? " (" + i.variant + ")" : "") + " x " + i.qty + " — " + fmt(i.price * i.qty)));
  lines.push("", "Subtotal: " + fmt(t.subtotal));
  if (t.discount) lines.push("Discount (" + CONFIG.DISCOUNT_CODE + " −" + CONFIG.DISCOUNT_PERCENT + "%): −" + fmt(t.discount));
  lines.push("Total: " + fmt(t.total), "Shipping: " + (t.freeShip ? "FREE" : "As per website"), "Payment: Cash on Delivery (COD)", "", "Name:", "Address:", "City:");
  window.open("https://wa.me/" + CONFIG.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")), "_blank");
});

/* ---------- Install (PWA) ---------- */
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferredPrompt = e;
  $("#installBtn").hidden = false; $("#installBanner").hidden = false;
});
async function doInstall() {
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("#installBtn").hidden = true; $("#installBanner").hidden = true; }
  else if (isIOS()) { $("#iosHint").hidden = false; $("#iosHint").scrollIntoView({ behavior: "smooth" }); }
  else toast("Use your browser menu → Install / Add to Home Screen");
}
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches; }
$("#installBtn").addEventListener("click", doInstall);
$("#installBannerBtn").addEventListener("click", doInstall);
$("#installBannerClose").addEventListener("click", () => { $("#installBanner").hidden = true; });
if (isIOS()) $("#iosHint").hidden = false;
$("#iosHintClose").addEventListener("click", () => { $("#iosHint").hidden = true; });

/* ---------- Service worker (only on http/https, not file://) ---------- */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* offline / file mode: app still works */ });
  });
}

/* ---------- Boot ---------- */
if (promoApplied) { /* promo restored from storage */ }
loadProducts();
