// ══════════════════════════════════════════════════════════════
//  ADMIN PASSWORD  — stored as SHA-256 hash (not plain text)
// ══════════════════════════════════════════════════════════════
const ADMIN_HASH = '26f5f8b67b8a8cf17b2a2e43dc2dea57bfdd1cf27175260280308e356ea8e99d';
async function checkPassword(input) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
// ══════════════════════════════════════════════════════════════
//  DATA STORE
//  Priority: localStorage (live edits) → embedded JSON (baked defaults)
// ══════════════════════════════════════════════════════════════
function getEmbedded() {
  try { return JSON.parse(document.getElementById('rdj-data')?.textContent ?? '{}'); }
  catch(e) { return { projects: [], categories: [], meta: { heroHeadline:'', heroSubtext:'', aboutMission:'' } }; }
}
function getProjects() {
  try {
    const s = localStorage.getItem('rdj_projects');
    return s ? JSON.parse(s) : getEmbedded().projects;
  } catch(e) { return getEmbedded().projects; }
}
function saveProjects(p) { localStorage.setItem('rdj_projects', JSON.stringify(p)); }
function getMeta() {
  try {
    const s = localStorage.getItem('rdj_meta');
    return s ? Object.assign({}, getEmbedded().meta, JSON.parse(s)) : getEmbedded().meta;
  } catch(e) { return getEmbedded().meta; }
}
function saveMeta(m) { localStorage.setItem('rdj_meta', JSON.stringify(m)); }
function getCategories() {
  try {
    const s = localStorage.getItem('rdj_categories');
    if (s) return JSON.parse(s);
    const embedded = getEmbedded().categories;
    return embedded && embedded.length ? embedded : [
      {id:'tools',name:'Tools',icon:'🔧',desc:'Handy tools built for students and everyday users'},
      {id:'games',name:'Games',icon:'🎮',desc:'Fun browser games you can play instantly'},
      {id:'utilities',name:'Utilities',icon:'⚙️',desc:'Practical utilities that make life easier'},
      {id:'fun',name:'Fun',icon:'🎉',desc:'Fun and entertaining experiences for everyone'},
      {id:'productivity',name:'Productivity',icon:'📈',desc:'Tools to help you stay organised and focused'}
    ];
  } catch(e) { return []; }
}
// ─────────────────────────────────────────────────────────────
//  Generate sitemap.xml from live projects
// ─────────────────────────────────────────────────────────────
function generateSitemapXML() {
  const projects = getProjects();
  const liveProjects = projects.filter(p => p.status === 'live' && p.url && p.url.trim() !== '');
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let urls = `
  <url>
    <loc>https://rdjpublishers.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;
  for (const p of liveProjects) {
    let lastmod = today;
    if (p.addedAt) {
      lastmod = new Date(p.addedAt).toISOString().slice(0, 10);
    }
    urls += `
  <url>
    <loc>${p.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
// ─────────────────────────────────────────────────────────────
//  Generate sitemap.html — card-based design with icons & desc
// ─────────────────────────────────────────────────────────────
function generateSitemapHTML() {
  const projects = getProjects();
  const cats     = getCategories();
  const today    = new Date().toISOString().slice(0, 10);
  const year     = new Date().getFullYear();
  function projectCard(p) {
    const lastmod   = p.addedAt ? new Date(p.addedAt).toISOString().slice(0,10) : today;
    const isImg     = p.icon && p.icon.startsWith('http');
    const iconInner = isImg
      ? `<img src="${p.icon}" alt="${p.title || ''} icon" style="width:100%;height:100%;object-fit:cover;display:block;">`
      : (p.icon || '📦');
    const badge = p.status === 'live'
      ? '<span style="font-size:.6rem;font-weight:700;background:#e7f9f0;color:#0a8a50;padding:.15rem .5rem;border-radius:100px;">● Live</span>'
      : '<span style="font-size:.6rem;font-weight:700;background:#fdf4e3;color:#c8892a;padding:.15rem .5rem;border-radius:100px;">⏳ Soon</span>';
    const href = (p.status === 'live' && p.url) ? `href="${p.url}" target="_blank"` : '';
    const tag  = (p.status === 'live' && p.url) ? 'a' : 'div';
    const raw  = (p.desc || '').replace(/\n/g,' ');
    const desc = raw.length > 110 ? raw.slice(0,110) + '…' : raw;
    const arrow = (p.status === 'live' && p.url)
      ? '<span class="arr" style="font-size:.72rem;color:#0b6e61;font-weight:700;opacity:0;">Visit →</span>'
      : '';
    return `<${tag} class="pc" ${href}>
        <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#084d44,#0d8a79);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">${iconInner}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.88rem;font-weight:700;color:#0f1e1c;line-height:1.3;margin-bottom:.25rem;">${p.title}</div>
          <div style="font-size:.74rem;color:#6b8c88;line-height:1.5;margin-bottom:.45rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${desc}</div>
          <div style="display:flex;align-items:center;gap:.5rem;">${badge}<span style="font-size:.62rem;color:#6b8c88;margin-left:auto;">${lastmod}</span>${arrow}</div>
        </div>
      </${tag}>`;
  }
  const catSections = cats.map(cat => {
    const live = projects.filter(p => p.category === cat.id && p.status === 'live' && p.url);
    if (!live.length) return '';
    const icon = (cat.icon && !cat.icon.startsWith('http')) ? cat.icon : '📁';
    return `  <section style="margin-bottom:2.6rem;">
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;padding-bottom:.7rem;border-bottom:2px solid #dde8e6;">
      <div style="width:38px;height:38px;border-radius:10px;background:#e6f4f2;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">${icon}</div>
      <h2 style="font-family:var(--serif);font-size:1.2rem;color:#0f1e1c;flex:1;">${cat.name}</h2>
      <span style="font-size:.7rem;font-weight:700;color:#0b6e61;background:#e6f4f2;padding:.2rem .65rem;border-radius:20px;">${live.length} live</span>
    </div>
    <div class="grid">${live.map(p => projectCard(p)).join('')}</div>
  </section>`;
  }).filter(Boolean).join('\n');
  const liveAll   = projects.filter(p => p.status === 'live' && p.url);
  const total     = liveAll.length + 4;
  const statsCats = cats.map(cat => {
    const n = liveAll.filter(p => p.category === cat.id).length;
    if (!n) return '';
    const icon = (cat.icon && !cat.icon.startsWith('http')) ? cat.icon + ' ' : '';
    return `<div style="flex-shrink:0;padding:.85rem 1.3rem;display:flex;flex-direction:column;align-items:center;gap:.15rem;border-right:1px solid #dde8e6;min-width:80px;"><div style="font-family:var(--serif);font-size:1.4rem;color:#0b6e61;line-height:1;">${n}</div><div style="font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#6b8c88;">${icon}${cat.name}</div></div>`;
  }).filter(Boolean).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap — RDJ Publishers</title>
  <meta name="description" content="Complete sitemap of all free tools, games, and utilities by RDJ Publishers.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://rdjpublishers.com/sitemap.html">
  <link rel="icon" href="Logo.png" type="image/png">
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{--serif:'DM Serif Display',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;}
    html{scroll-behavior:smooth;}
    body{font-family:var(--sans);background:#f4f6f6;color:#0f1e1c;line-height:1.5;min-height:100vh;}
    .mw{max-width:960px;margin:0 auto;}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.85rem;}
    .pc{background:#fff;border:1.5px solid #dde8e6;border-radius:14px;padding:1rem 1.1rem;display:flex;gap:.85rem;align-items:flex-start;text-decoration:none;color:inherit;transition:all .22s;box-shadow:0 2px 10px rgba(11,110,97,.07);}
    .pc:hover{border-color:#0b6e61;background:#f0f9f7;transform:translateY(-2px);box-shadow:0 6px 24px rgba(11,110,97,.12);}
    .pc:hover .arr{opacity:1!important;}
    .pr{background:#fff;border:1.5px solid #dde8e6;border-radius:12px;display:flex;align-items:center;gap:.9rem;padding:.75rem 1rem;text-decoration:none;color:inherit;transition:all .2s;box-shadow:0 2px 10px rgba(11,110,97,.07);margin-bottom:.55rem;}
    .pr:hover{border-color:#0b6e61;background:#f0f9f7;transform:translateX(4px);}
    @media(max-width:580px){.mw{padding-left:1rem!important;padding-right:1rem!important;}.grid{grid-template-columns:1fr;}}
  </style>
</head>
<body>
<header style="background:linear-gradient(135deg,#084d44 0%,#0d8a79 100%);position:relative;overflow:hidden;">
  <div style="position:absolute;top:-60px;right:-60px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none;"></div>
  <div style="position:absolute;bottom:-40px;left:40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none;"></div>
  <div class="mw" style="padding:2.4rem 1.6rem 2rem;position:relative;z-index:1;">
    <div style="display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:rgba(255,255,255,.55);margin-bottom:1.2rem;font-weight:500;">
      <a href="https://rdjpublishers.com/" style="color:rgba(255,255,255,.6);text-decoration:none;">RDJ Publishers</a>
      <span style="color:rgba(255,255,255,.3);">›</span>
      <span>Sitemap</span>
    </div>
    <h1 style="font-family:var(--serif);font-size:clamp(1.8rem,5vw,2.6rem);color:#fff;font-weight:400;line-height:1.15;margin-bottom:.55rem;">🗺️ Site Map</h1>
    <p style="font-size:.84rem;color:rgba(255,255,255,.6);line-height:1.65;max-width:480px;">Every tool, game, and page on RDJ Publishers — all in one place. Free, no sign-up, works in your browser.</p>
  </div>
</header>
<div style="background:#fff;border-bottom:1px solid #dde8e6;box-shadow:0 2px 10px rgba(11,110,97,.07);">
  <div class="mw" style="padding:0 1.6rem;display:flex;overflow-x:auto;scrollbar-width:none;">
    <div style="flex-shrink:0;padding:.85rem 1.3rem;display:flex;flex-direction:column;align-items:center;gap:.15rem;border-right:1px solid #dde8e6;min-width:80px;"><div style="font-family:var(--serif);font-size:1.4rem;color:#0b6e61;line-height:1;">${total}</div><div style="font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#6b8c88;">Total Pages</div></div>
    ${statsCats}
    <div style="flex-shrink:0;padding:.85rem 1.3rem;display:flex;flex-direction:column;align-items:center;gap:.15rem;min-width:80px;"><div style="font-family:var(--serif);font-size:1.4rem;color:#0b6e61;line-height:1;">100%</div><div style="font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#6b8c88;">Free</div></div>
  </div>
</div>
<main class="mw" style="padding:2rem 1.6rem 4rem;">
  <section style="margin-bottom:2.6rem;">
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;padding-bottom:.7rem;border-bottom:2px solid #dde8e6;">
      <div style="width:38px;height:38px;border-radius:10px;background:#e6f4f2;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">📄</div>
      <h2 style="font-family:var(--serif);font-size:1.2rem;color:#0f1e1c;flex:1;">Main Pages</h2>
      <span style="font-size:.7rem;font-weight:700;color:#0b6e61;background:#e6f4f2;padding:.2rem .65rem;border-radius:20px;">5 pages</span>
    </div>
    <a class="pr" href="https://rdjpublishers.com/"><span style="font-size:1.1rem;width:32px;text-align:center;flex-shrink:0;">🏠</span><div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">Home</div><div style="font-size:.72rem;color:#6b8c88;">Browse all tools, games, and categories</div></div><span style="font-size:.68rem;color:#0b6e61;background:#e6f4f2;padding:.15rem .55rem;border-radius:20px;font-weight:600;white-space:nowrap;">${today}</span></a>
    <a class="pr" href="https://rdjpublishers.com/about.html"><span style="font-size:1.1rem;width:32px;text-align:center;flex-shrink:0;">📖</span><div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">About Us</div><div style="font-size:.72rem;color:#6b8c88;">Who we are and what we build</div></div><span style="font-size:.68rem;color:#0b6e61;background:#e6f4f2;padding:.15rem .55rem;border-radius:20px;font-weight:600;white-space:nowrap;">${today}</span></a>
    <a class="pr" href="https://rdjpublishers.com/contact.html"><span style="font-size:1.1rem;width:32px;text-align:center;flex-shrink:0;">✉️</span><div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">Contact</div><div style="font-size:.72rem;color:#6b8c88;">Send us ideas, feedback, or questions</div></div><span style="font-size:.68rem;color:#0b6e61;background:#e6f4f2;padding:.15rem .55rem;border-radius:20px;font-weight:600;white-space:nowrap;">${today}</span></a>
    <a class="pr" href="https://rdjpublishers.com/privacy-policy.html"><span style="font-size:1.1rem;width:32px;text-align:center;flex-shrink:0;">🔒</span><div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">Privacy Policy</div><div style="font-size:.72rem;color:#6b8c88;">How we handle your data (we don't collect any)</div></div><span style="font-size:.68rem;color:#0b6e61;background:#e6f4f2;padding:.15rem .55rem;border-radius:20px;font-weight:600;white-space:nowrap;">${today}</span></a>
    <a class="pr" href="https://rdjpublishers.com/terms.html"><span style="font-size:1.1rem;width:32px;text-align:center;flex-shrink:0;">📜</span><div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">Terms and Conditions</div><div style="font-size:.72rem;color:#6b8c88;">Rules for using our website and tools</div></div><span style="font-size:.68rem;color:#0b6e61;background:#e6f4f2;padding:.15rem .55rem;border-radius:20px;font-weight:600;white-space:nowrap;">${today}</span></a>
  </section>
  ${catSections}
  <div style="background:#fff;border:1.5px solid #dde8e6;border-radius:12px;padding:1rem 1.2rem;display:flex;align-items:center;gap:.9rem;margin-top:.8rem;">
    <span style="font-size:1.4rem;flex-shrink:0;">📡</span>
    <div style="font-size:.8rem;color:#6b8c88;flex:1;"><strong style="color:#0f1e1c;">Looking for the machine-readable version?</strong><br>The XML sitemap is available for search engines and crawlers.</div>
    <a href="/sitemap.xml" style="font-size:.78rem;font-weight:700;color:#0b6e61;text-decoration:none;background:#e6f4f2;padding:.35rem .9rem;border-radius:8px;white-space:nowrap;transition:all .2s;">View sitemap.xml →</a>
  </div>
</main>
<footer style="border-top:1px solid #dde8e6;background:#fff;padding:1.1rem 1.2rem .9rem;text-align:center;font-size:.72rem;color:#6b8c88;">
  <div>© ${year} RDJ Publishers · All tools are free, no sign-up required.</div>
  <nav style="display:flex;gap:1.05rem;justify-content:center;margin-top:.55rem;flex-wrap:wrap;">
    <a href="https://rdjpublishers.com/" style="color:#0b6e61;text-decoration:none;font-weight:600;">Home</a>
    <a href="https://rdjpublishers.com/about.html" style="color:#0b6e61;text-decoration:none;font-weight:600;">About</a>
    <a href="https://rdjpublishers.com/contact.html" style="color:#0b6e61;text-decoration:none;font-weight:600;">Contact</a>
    <a href="https://rdjpublishers.com/privacy-policy.html" style="color:#0b6e61;text-decoration:none;font-weight:600;">Privacy</a>
    <a href="https://rdjpublishers.com/terms.html" style="color:#0b6e61;text-decoration:none;font-weight:600;">Terms</a>
    <a href="/sitemap.xml" style="color:#0b6e61;text-decoration:none;font-weight:600;">XML Sitemap</a>
  </nav>
</footer>
</body>
</html>`;
}
function saveCategories(c) { localStorage.setItem('rdj_categories', JSON.stringify(c)); }
// ══════════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════════
let currentCatId = null;
function goTo(pageId) {
  closeSidebar();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById('page-' + pageId);
  if (t) { t.classList.add('active'); window.scrollTo(0, 0); }
  document.querySelectorAll('.sb-link').forEach(l => {
    l.classList.remove('active');
    if ((l.getAttribute('onclick') || '').includes("goTo('" + pageId + "')")) l.classList.add('active');
  });
  // Keep the URL hash in sync so links are shareable & back/forward works
  if (pageId && pageId !== 'home' && window.location.hash !== '#' + pageId) {
    history.replaceState(null, '', '#' + pageId);
  } else if (pageId === 'home' && window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
// Route URL hash -> SPA page (e.g. /#privacy, /#terms, /#about, /#contact, /#cat-games)
function routeFromHash() {
  const h = (window.location.hash || '').replace('#', '').toLowerCase();
  if (h.startsWith('cat-') && h !== 'cat-view') {
    goToCat(h.slice(4));
  } else if (h && document.getElementById('page-' + h)) {
    goTo(h);
  }
}
window.addEventListener('hashchange', routeFromHash);
function goToCat(catId) {
  currentCatId = catId;
  const cats = getCategories();
  const cat = cats.find(c => c.id === catId) || {id: catId, name: catId, icon: '📁', desc: ''};
  // Populate dynamic category page
  const iconHtml = cat.icon && cat.icon.startsWith('http')
    ? `<img src="${cat.icon}" alt="${cat.name}">`
    : cat.icon;
  const catViewTopbar = document.getElementById('cat-view-topbar-brand');
  if (catViewTopbar) catViewTopbar.textContent = cat.name;
  const catViewIcon = document.getElementById('cat-view-icon');
  if (catViewIcon) catViewIcon.innerHTML = iconHtml;
  const catViewTitle = document.getElementById('cat-view-title');
  if (catViewTitle) catViewTitle.textContent = cat.name;
  const catViewDesc = document.getElementById('cat-view-desc');
  if (catViewDesc) catViewDesc.textContent = cat.desc;
  // Render projects for this category (sorted by recently added)
  const projects = getProjects()
    .filter(p => p.category === catId)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  const el = document.getElementById('cat-view-list');
  if (el) {
    el.innerHTML = projects.length
      ? projects.map(p => projectCardHTML(p)).join('')
      : '<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.85rem;grid-column:1/-1;">No projects here yet.</div>';
    requestAnimationFrame(refreshReadMoreLinks);
  }
  goTo('cat-view');
  // goTo() stamps the hash as '#cat-view'; overwrite it with the specific
  // category so a refresh (or shared link) restores the right one.
  if (window.location.hash !== '#cat-' + catId) {
    history.replaceState(null, '', '#cat-' + catId);
  }
  // Update sidebar active state for this category
  document.querySelectorAll('.sb-link').forEach(l => {
    l.classList.remove('active');
    if ((l.getAttribute('data-catid') || '') === catId) l.classList.add('active');
  });
}
function openSidebar() {
  document.getElementById('sidebar')?.classList?.add('open');
  document.getElementById('overlay')?.classList?.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList?.remove('open');
  document.getElementById('overlay')?.classList?.remove('active');
  document.body.style.overflow = '';
}
// ══════════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
// ══════════════════════════════════════════════════════════════
//  ADMIN AUTH — dynamic injection (no admin HTML in public source)
// ══════════════════════════════════════════════════════════════
let isAdmin = false;
const ADMIN_UNLOCK_KEY = 'rdj_admin_unlocked';

function isUnlocked() {
  try { return localStorage.getItem(ADMIN_UNLOCK_KEY) === '1'; }
  catch(e) { return false; }
}
function persistUnlock() {
  try { localStorage.setItem(ADMIN_UNLOCK_KEY, '1'); } catch(e){}
}
function clearUnlock() {
  try { localStorage.removeItem(ADMIN_UNLOCK_KEY); } catch(e){}
}
function setAdminDotColor(hex) {
  // Selector kept neutral — public source has no .admin-* class
  const dot = document.querySelector('.trigger-dot');
  if (dot) dot.style.background = hex || '';
}

// ══════════════════════════════════════════════════════════════
//  ADMIN STYLES — injected lazily, removed on sign-out
//  Nothing admin-related is present in the static HTML source.
//  When the owner triple-clicks the trigger dot for the first
//  time, the full admin stylesheet is appended to <head>. On
//  sign-out it is removed again so even the CSS is gone.
// ══════════════════════════════════════════════════════════════
const ADMIN_STYLES_ID = 'rdj-admin-styles';
const ADMIN_STYLES_CSS = `
/* Modal shell */
.admin-modal-wrap{position:fixed;inset:0;z-index:500;background:rgba(5,20,18,.75);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:1.25rem;}
.admin-modal-wrap.show{display:flex;animation:fadeInModal .22s ease both;}
@keyframes fadeInModal{from{opacity:0;}to{opacity:1;}}
.admin-modal{background:var(--surface);border-radius:16px;width:100%;max-width:520px;box-shadow:var(--shadow-lg);overflow:hidden;max-height:90vh;display:flex;flex-direction:column;animation:modalPop .26s cubic-bezier(.4,0,.2,1) both;}
@keyframes modalPop{from{opacity:0;transform:translateY(8px) scale(.97);}to{opacity:1;transform:none;}}
.admin-modal-head{background:linear-gradient(135deg,var(--ink) 0%,#1d3632 100%);padding:1.1rem 1.3rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:.6rem;}
.admin-modal-head .modal-title{font-family:var(--serif);font-size:1.05rem;color:#fff;line-height:1.25;}
.admin-modal-head small{font-size:.62rem;color:rgba(255,255,255,0.4);font-weight:500;display:block;margin-top:2px;}
.admin-close-btn{background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.7);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
.admin-close-btn:hover{background:rgba(255,255,255,0.18);color:#fff;}
.admin-body{padding:1.3rem;overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;}
/* Desktop — slightly wider for content management */
@media(min-width:900px){
  .admin-modal{max-width:620px;}
}
@media(min-width:1200px){
  .admin-modal{max-width:680px;}
}
/* Tablet */
@media(min-width:600px) and (max-width:899px){
  .admin-modal{max-width:88vw;}
}
/* Mobile responsive (touch-first) — moved to end of stylesheet */
/* Login */
.admin-lock-icon{font-size:2.5rem;text-align:center;margin-bottom:.5rem;}
.admin-body .modal-subtitle{font-family:var(--serif);font-size:1.1rem;text-align:center;color:var(--ink);margin-bottom:.3rem;}
.admin-body p.hint{font-size:.78rem;text-align:center;color:var(--muted);margin-bottom:1.3rem;}
.admin-input{width:100%;padding:.75rem 1rem;border:2px solid var(--border);border-radius:10px;font-family:var(--sans);font-size:.9rem;color:var(--ink);outline:none;transition:border-color .2s;margin-bottom:.8rem;}
.admin-input:focus{border-color:var(--teal);}
.admin-btn{width:100%;background:var(--teal);color:#fff;border:none;padding:.85rem;border-radius:10px;font-family:var(--sans);font-size:.9rem;font-weight:700;cursor:pointer;transition:all .2s;}
.admin-btn:hover{background:var(--teal-dark);}
.admin-err{font-size:.78rem;color:#d93025;text-align:center;margin-top:.5rem;min-height:1em;}
/* Tabs — segmented pill control */
.admin-tabs{display:flex;gap:.3rem;margin-bottom:1.15rem;overflow-x:auto;flex-wrap:nowrap;padding:5px;background:var(--bg);border:1.5px solid var(--border);border-radius:14px;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;box-shadow:inset 0 1px 2px rgba(11,110,97,0.04);}
.admin-tabs::-webkit-scrollbar{display:none;}
.admin-tab{flex:1;flex-shrink:0;min-width:0;padding:.55rem .55rem;border:none;border-radius:10px;background:transparent;font-family:var(--sans);font-size:.76rem;font-weight:600;color:var(--muted);cursor:pointer;transition:all .22s ease;white-space:nowrap;scroll-snap-align:start;text-align:center;line-height:1.2;-webkit-tap-highlight-color:transparent;}
.admin-tab:hover{color:var(--teal);}
.admin-tab.active{background:#fff;color:var(--teal);box-shadow:0 2px 8px rgba(11,110,97,0.12);font-weight:700;}
/* Form */
.admin-form-grid{display:flex;flex-direction:column;gap:.7rem;}
.admin-row{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;}
.admin-fg{display:flex;flex-direction:column;gap:.3rem;}
.admin-fg label{font-size:.65rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.07em;}
.admin-fg input,.admin-fg select,.admin-fg textarea{padding:.6rem .8rem;border:1.5px solid var(--border);border-radius:8px;background:var(--bg);font-family:var(--sans);font-size:.85rem;color:var(--ink);outline:none;transition:border-color .2s,background .2s;width:100%;}
.admin-fg input:focus,.admin-fg select:focus,.admin-fg textarea:focus{border-color:var(--teal);background:#fff;box-shadow:0 0 0 3px rgba(11,110,97,0.08);}
.admin-fg select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3e%3cpath fill='%236b8c88' d='M6 8L1 3h10z'/%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right .75rem center;padding-right:2rem;}
.admin-fg textarea{resize:vertical;min-height:72px;line-height:1.5;}
.admin-fg.full{grid-column:span 2;}
.admin-actions{display:flex;gap:.5rem;margin-top:.85rem;}
.admin-actions button{flex:1;padding:.6rem;border:none;border-radius:8px;font-family:var(--sans);font-size:.82rem;font-weight:700;cursor:pointer;transition:all .2s;}
.btn-save{background:var(--teal);color:#fff;}
.btn-save:hover{background:var(--teal-dark);transform:translateY(-1px);box-shadow:0 4px 10px rgba(11,110,97,0.25);}
.btn-cancel{background:var(--bg);color:var(--muted);border:1.5px solid var(--border)!important;}
.btn-cancel:hover{background:var(--border);}
.btn-export{background:var(--gold)!important;color:#fff!important;}
.btn-export:hover{background:#a06a15!important;transform:translateY(-1px);box-shadow:0 4px 10px rgba(200,137,42,0.3);}
/* Category filter — polished pill chips */
.cat-filter{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1.05rem;padding-bottom:.15rem;}
.cat-filter button{padding:.42rem .85rem;border:1.5px solid var(--border);border-radius:100px;font-family:var(--sans);font-size:.76rem;font-weight:600;color:var(--muted);background:var(--surface);cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;gap:.32rem;line-height:1;-webkit-tap-highlight-color:transparent;}
.cat-filter button:hover{color:var(--teal);border-color:var(--teal);background:#fff;transform:translateY(-1px);}
.cat-filter button.active{background:var(--teal);color:#fff;border-color:var(--teal);box-shadow:0 3px 10px rgba(11,110,97,0.22);}
/* Project list */
.admin-project-list{display:flex;flex-direction:column;gap:.6rem;max-height:440px;overflow-y:auto;padding:2px 4px 2px 0;margin-right:-.25rem;}
.admin-project-list::-webkit-scrollbar{width:6px;}
.admin-project-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
.admin-project-list::-webkit-scrollbar-thumb:hover{background:var(--muted);}
/* Category management */
.admin-cat-list{display:flex;flex-direction:column;gap:.6rem;max-height:440px;overflow-y:auto;margin-bottom:1rem;padding:2px 4px 2px 0;margin-right:-.25rem;}
.admin-cat-list::-webkit-scrollbar{width:6px;}
.admin-cat-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
.admin-cat-list::-webkit-scrollbar-thumb:hover{background:var(--muted);}
.admin-cat-item{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:.8rem 1rem;display:flex;align-items:center;gap:.75rem;transition:all .22s ease;cursor:default;box-shadow:0 1px 2px rgba(11,110,97,0.03);}
.admin-cat-item:hover{border-color:var(--teal);box-shadow:0 4px 16px rgba(11,110,97,0.1);transform:translateY(-1px);}
.admin-cat-item.dragging{opacity:.5;border-color:var(--teal);box-shadow:0 10px 28px rgba(11,110,97,0.25);transform:scale(0.98);}
.admin-cat-item.drag-over-top{border-top:3px solid var(--teal)!important;}
.admin-cat-item.drag-over-bottom{border-bottom:3px solid var(--teal)!important;}
.admin-cat-item .ci-icon{font-size:1.45rem;flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f4f8f7 0%,#e6f4f2 100%);border-radius:11px;border:1px solid var(--border);line-height:1;}
.admin-cat-item .ci-icon img{width:1.45rem;height:1.45rem;object-fit:contain;border-radius:6px;}
.admin-cat-item .ci-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem;}
.admin-cat-item .ci-name{font-size:.94rem;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}
.admin-cat-item .ci-id{font-size:.68rem;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;}
/* Reorder controls */
.cat-reorder-hint{font-size:.78rem;color:var(--teal);margin-bottom:.9rem;line-height:1.55;padding:.7rem .9rem;background:linear-gradient(135deg,#e6f4f2 0%,#d4ede9 100%);border-radius:12px;border-left:4px solid var(--teal);display:flex;align-items:flex-start;gap:.55rem;box-shadow:0 1px 3px rgba(11,110,97,0.06);}
.cat-reorder-hint>span:first-child{font-size:1.05rem;flex-shrink:0;line-height:1.55;}
.cat-pos{font-size:.72rem;font-weight:800;color:var(--teal);background:linear-gradient(135deg,#e6f4f2 0%,#d4ede9 100%);padding:.28rem .55rem;border-radius:8px;flex-shrink:0;min-width:30px;text-align:center;font-variant-numeric:tabular-nums;letter-spacing:.03em;line-height:1.1;border:1px solid rgba(11,110,97,0.12);}
.cat-reorder-controls{display:flex;flex-direction:column;gap:.3rem;flex-shrink:0;}
.cat-reorder-controls button{width:32px;height:28px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface);color:var(--muted);cursor:pointer;font-size:.72rem;display:flex;align-items:center;justify-content:center;transition:all .18s ease;line-height:1;padding:0;font-family:inherit;font-weight:700;-webkit-tap-highlight-color:transparent;}
.cat-reorder-controls button:hover:not(:disabled){background:var(--teal);color:#fff;border-color:var(--teal);transform:translateY(-1px);box-shadow:0 3px 8px rgba(11,110,97,0.22);}
.cat-reorder-controls button:active:not(:disabled){transform:translateY(0);box-shadow:none;}
.cat-reorder-controls button:disabled{opacity:.28;cursor:not-allowed;background:var(--bg);}
.drag-handle{cursor:grab;color:var(--muted);font-size:1.3rem;padding:.4rem .2rem;flex-shrink:0;user-select:none;transition:all .18s ease;line-height:1;letter-spacing:-.15em;-webkit-tap-highlight-color:transparent;}
.admin-cat-item:hover .drag-handle{color:var(--teal);transform:scale(1.1);}
.drag-handle:active{cursor:grabbing;color:var(--teal-dark);}
/* Edit category form */
.cat-edit-box{background:#fff;border:1.5px solid var(--teal);border-radius:10px;padding:1rem;animation:editSlide .3s ease both;}
@keyframes editSlide{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:none;}}
.cat-edit-box .cat-edit-title{font-size:.8rem;font-weight:700;color:var(--teal);margin-bottom:.65rem;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;}
.cat-edit-box .cat-edit-title span{color:var(--ink);font-weight:700;background:var(--teal-pale);padding:.15rem .5rem;border-radius:6px;font-size:.76rem;}
.cat-edit-box:empty{display:none;}
/* Icon field */
.icon-field-wrap{display:flex;flex-direction:column;gap:.4rem;}
.icon-toggle{display:flex;gap:.35rem;margin-bottom:.2rem;}
.icon-toggle button{flex:1;padding:.3rem .5rem;border:1.5px solid var(--border);border-radius:7px;font-family:var(--sans);font-size:.68rem;font-weight:600;color:var(--muted);background:var(--bg);cursor:pointer;transition:all .2s;}
.icon-toggle button.active{background:var(--teal);color:#fff;border-color:var(--teal);}
.icon-preview-wrap{display:flex;align-items:center;gap:.5rem;}
.icon-img-preview{width:38px;height:38px;border-radius:7px;object-fit:cover;border:1.5px solid var(--border);display:none;}
.icon-img-preview.visible{display:block;}
.icon-upload-label{display:inline-flex;align-items:center;gap:.35rem;padding:.4rem .75rem;background:var(--teal-pale);color:var(--teal);border-radius:7px;font-size:.72rem;font-weight:600;cursor:pointer;border:1.5px dashed var(--teal);transition:all .2s;}
.icon-upload-label:hover{background:var(--teal);color:#fff;}
.icon-gh-token-row{display:flex;flex-direction:column;gap:.3rem;margin-top:.3rem;padding:.65rem;background:var(--gold-pale);border-radius:8px;border:1.5px solid #e8c87a;}
.icon-gh-token-row label{font-size:.62rem;font-weight:700;color:#7a5c10;text-transform:uppercase;letter-spacing:.07em;}
.icon-gh-status{font-size:.7rem;color:var(--teal);margin-top:.2rem;min-height:.9em;}
/* Project item rows */
.admin-project-item{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:.85rem 1rem;display:flex;align-items:center;gap:.85rem;transition:all .22s ease;box-shadow:0 1px 2px rgba(11,110,97,0.03);}
.admin-project-item:hover{border-color:var(--teal);box-shadow:0 4px 16px rgba(11,110,97,0.1);transform:translateY(-1px);}
.pi-icon{font-size:1.45rem;flex-shrink:0;width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f4f8f7 0%,#e6f4f2 100%);border-radius:11px;border:1px solid var(--border);overflow:hidden;line-height:1;}
.pi-icon img{width:100%;height:100%;object-fit:contain;border-radius:7px;}
.pi-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.25rem;justify-content:center;}
.pi-name{font-size:.94rem;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;letter-spacing:-.005em;}
.pi-cat{font-size:.72rem;color:var(--muted);margin-top:0;display:flex;align-items:center;gap:.35rem;line-height:1.2;flex-wrap:wrap;}
.pi-cat .pi-status{display:inline-flex;align-items:center;gap:.3rem;font-size:.62rem;font-weight:700;padding:.18rem .5rem;border-radius:100px;text-transform:uppercase;letter-spacing:.05em;line-height:1;}
.pi-cat .pi-status.live{background:#e7f9f0;color:#0a8a50;}
.pi-cat .pi-status.soon{background:#fdf4e3;color:#c8892a;}
.pi-cat .pi-status::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;}
.pi-btns{display:flex;gap:.4rem;flex-shrink:0;}
.pi-btn{width:38px;height:38px;border:none;border-radius:10px;cursor:pointer;font-size:.88rem;display:flex;align-items:center;justify-content:center;transition:all .2s ease;line-height:1;-webkit-tap-highlight-color:transparent;}
.pi-btn.edit{background:var(--teal-pale);color:var(--teal);border:1.5px solid transparent;}
.pi-btn.edit:hover{background:var(--teal);color:#fff;transform:scale(1.08);box-shadow:0 4px 10px rgba(11,110,97,0.25);}
.pi-btn.del{background:#fee;color:#c0392b;border:1.5px solid transparent;}
.pi-btn.del:hover{background:#c0392b;color:#fff;transform:scale(1.08);box-shadow:0 4px 10px rgba(192,57,43,0.25);}
.admin-empty{text-align:center;padding:2.4rem 1.4rem;color:var(--muted);font-size:.85rem;background:var(--bg);border:1.5px dashed var(--border);border-radius:14px;line-height:1.55;}
.admin-empty::before{content:'📭';display:block;font-size:2rem;margin-bottom:.5rem;opacity:.5;}
.admin-empty strong{color:var(--ink);display:block;font-size:.92rem;margin-bottom:.15rem;font-weight:700;}
/* Export box */
.export-box{background:var(--gold-pale);border:1.5px solid #e8c87a;border-radius:12px;padding:1.15rem;margin-bottom:1rem;}
.export-box p{font-size:.8rem;color:#7a5c10;line-height:1.6;}
.export-box strong{color:#5a420a;display:block;margin-bottom:.3rem;font-size:.84rem;}
.export-count{font-size:.8rem;color:var(--muted);text-align:center;margin-top:.85rem;}
/* Admin mode strip (Sign Out bar) */
.admin-strip{background:linear-gradient(90deg,var(--ink),#1d3632);padding:.55rem 1.4rem;display:none;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
.admin-strip.visible{display:flex;}
.admin-strip span{font-size:.72rem;color:rgba(255,255,255,0.65);font-weight:500;}
.admin-strip button{background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.75);padding:.35rem .85rem;border-radius:7px;font-family:var(--sans);font-size:.72rem;font-weight:600;cursor:pointer;transition:all .2s;}
.admin-strip button:hover{background:rgba(255,255,255,0.2);color:#fff;}
/* Trigger dot — green when admin mode is on */
body.admin-mode .trigger-dot{box-shadow:0 0 0 2px #22c55e55;background:#22c55e;}
/* ══════════════════════════════════════════════════════════════
   MOBILE RESPONSIVE — placed at the end so it wins specificity
   ══════════════════════════════════════════════════════════════ */
@media(max-width:599px){
  /* Modal — centered floating card with margin all around (not edge-to-edge) */
  .admin-modal-wrap{padding:14px;align-items:center;justify-content:center;}
  .admin-modal{border-radius:18px;max-width:380px;width:100%;max-height:calc(100vh - 28px);animation:modalPop .26s cubic-bezier(.4,0,.2,1) both;}
  .admin-modal::before{content:'';position:absolute;top:6px;left:50%;transform:translateX(-50%);width:32px;height:3px;background:var(--border);border-radius:100px;opacity:.6;}
  /* Head bar */
  .admin-modal-head{padding:.65rem .8rem;}
  .admin-modal-head .modal-title{font-size:.92rem;}
  .admin-modal-head small{font-size:.56rem;}
  .admin-close-btn{width:30px;height:30px;font-size:.85rem;}
  .admin-body{padding:.65rem .8rem 1rem;}
  /* Forms */
  .admin-row{grid-template-columns:1fr;gap:.55rem;}
  .admin-fg.full{grid-column:auto;}
  .admin-fg label{font-size:.62rem;}
  .admin-fg input,.admin-fg select,.admin-fg textarea{padding:.62rem .8rem;font-size:.88rem;min-height:44px;}
  .admin-fg textarea{min-height:84px;}
  .admin-input{padding:.72rem .85rem;font-size:.88rem;min-height:46px;margin-bottom:.55rem;}
  .admin-form-grid{gap:.6rem;}
  /* Buttons — 44px touch targets */
  .admin-btn{min-height:44px;font-size:.88rem;padding:.8rem;}
  .admin-actions{flex-direction:column-reverse;gap:.5rem;margin-top:.75rem;}
  .admin-actions button{width:100%;min-height:44px;padding:.7rem;font-size:.84rem;}
  .btn-cancel,.btn-save,.btn-export{padding:.72rem;font-size:.84rem;}
  /* Tabs — compact horizontal scroll */
  .admin-tabs{gap:.3rem;padding:4px;margin-bottom:.8rem;border-radius:10px;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;}
  .admin-tabs::-webkit-scrollbar{display:none;}
  .admin-tab{flex:0 0 auto;padding:.5rem .7rem;font-size:.72rem;min-height:36px;border-radius:8px;white-space:nowrap;scroll-snap-align:start;}
  /* ── Project items — compact row ── */
  .admin-project-list{max-height:none;gap:.5rem;}
  .admin-project-item{padding:.65rem .75rem;gap:.6rem;}
  .admin-project-item .pi-icon{width:38px;height:38px;font-size:1.2rem;border-radius:9px;}
  .pi-name{font-size:.85rem;}
  .pi-cat{font-size:.66rem;gap:.35rem;}
  .pi-cat .pi-status{font-size:.58rem;padding:.12rem .4rem;}
  .pi-btns{gap:.35rem;}
  .pi-btn{width:34px;height:34px;font-size:.8rem;border-radius:8px;}
  /* ── Category items — single straight row on mobile ── */
  .admin-cat-list{max-height:none;gap:.5rem;}
  .admin-cat-item{padding:.6rem .75rem;gap:.5rem;align-items:center;display:flex;}
  .admin-cat-item .drag-handle{font-size:1rem;padding:.15rem .1rem;letter-spacing:-.2em;}
  .admin-cat-item .cat-pos{min-width:22px;padding:.18rem .35rem;font-size:.62rem;}
  .admin-cat-item .ci-icon{width:30px;height:30px;font-size:1rem;border-radius:8px;}
  .admin-cat-item .ci-icon img{width:1rem;height:1rem;}
  .admin-cat-item .ci-info{flex:1;min-width:0;}
  .admin-cat-item .ci-name{font-size:.82rem;line-height:1.2;}
  .admin-cat-item .ci-id{font-size:.58rem;margin-top:0;}
  .admin-cat-item .cat-reorder-controls{flex-direction:row;gap:.22rem;}
  .admin-cat-item .cat-reorder-controls button{width:28px;height:26px;font-size:.65rem;border-radius:6px;}
  .admin-cat-item .pi-btns{gap:.25rem;}
  .admin-cat-item .pi-btn{width:32px;height:32px;font-size:.8rem;border-radius:8px;}
  /* Login modal */
  .admin-lock-icon{font-size:2rem;margin-bottom:.35rem;}
  .admin-body .modal-subtitle{font-size:1rem;}
  .admin-body p.hint{font-size:.74rem;margin-bottom:1rem;}
  /* Icon toggle */
  .icon-field-wrap .icon-toggle button{padding:.5rem .45rem;min-height:40px;font-size:.7rem;}
  .icon-toggle{gap:.35rem;}
  .icon-upload-label{padding:.5rem .8rem;font-size:.74rem;min-height:40px;}
  /* Reorder hint banner — compact */
  .cat-reorder-hint{padding:.55rem .75rem;font-size:.7rem;line-height:1.45;border-radius:10px;margin-bottom:.7rem;gap:.45rem;}
  .cat-reorder-hint>span:first-child{font-size:.95rem;}
  /* Admin strip */
  .admin-strip{padding:.5rem .9rem;font-size:.7rem;flex-wrap:wrap;gap:.4rem;justify-content:center;text-align:center;}
  .admin-strip span{flex:1 1 100%;text-align:center;}
  .admin-strip button{padding:.4rem .8rem;font-size:.7rem;min-height:36px;}
  /* Category filter chips */
  .cat-filter{gap:.35rem;margin-bottom:.8rem;}
  .cat-filter button{padding:.32rem .7rem;font-size:.7rem;min-height:32px;border-radius:100px;}
  /* Export box */
  .export-box{padding:.85rem;}
  .export-box strong{font-size:.76rem;}
  .export-box p{font-size:.72rem;}
  .export-count{font-size:.72rem;margin-top:.6rem;}
  /* Empty state */
  .admin-empty{padding:1.6rem .9rem;font-size:.78rem;}
  .admin-empty strong{font-size:.84rem;}
  .admin-empty::before{font-size:1.6rem;margin-bottom:.35rem;}
  /* GH publish box */
  #gh-publish-btn{padding:.75rem;font-size:.84rem;min-height:44px;}
  #gh-token-input{padding:.72rem .85rem;font-size:.88rem;min-height:44px;}
  /* Icon preview */
  .icon-img-preview{width:42px;height:42px;}
  /* Add New Category form — tighter */
  .admin-cat-item ~ div .admin-form-grid{gap:.55rem;}
  .admin-cat-item ~ div .admin-actions{margin-top:.6rem;}
}
/* Tiny phones */
@media(max-width:380px){
  .admin-cat-item .drag-handle{font-size:.9rem;}
  .admin-cat-item .cat-pos{min-width:22px;padding:.15rem .32rem;font-size:.58rem;}
  .admin-cat-item .ci-icon{width:28px;height:28px;font-size:.95rem;border-radius:7px;}
  .admin-cat-item .ci-icon img{width:.95rem;height:.95rem;}
  .admin-cat-item .ci-name{font-size:.8rem;}
  .admin-cat-item .ci-id{font-size:.56rem;}
  .admin-cat-item .cat-reorder-controls button{width:26px;height:26px;font-size:.62rem;}
  .admin-cat-item .pi-btn{width:30px;height:30px;font-size:.76rem;}
  .pi-name{font-size:.82rem;}
  .pi-btn{width:32px;height:32px;}
  .admin-project-item .pi-icon{width:34px;height:34px;font-size:1.05rem;}
}
`;
function injectAdminStyles() {
  if (document.getElementById(ADMIN_STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = ADMIN_STYLES_ID;
  style.textContent = ADMIN_STYLES_CSS;
  document.head.appendChild(style);
}
function removeAdminStyles() {
  const el = document.getElementById(ADMIN_STYLES_ID);
  if (el) el.remove();
}

// ── Login modal (built on demand when triple-click is detected) ──
function buildLoginModal() {
  if (document.getElementById('adminLoginWrap')) return;
  // First time we touch admin — inject the full admin stylesheet.
  // (Removed on sign-out via removeAdminStyles().)
  injectAdminStyles();
  const wrap = document.createElement('div');
  wrap.className = 'admin-modal-wrap';
  wrap.id = 'adminLoginWrap';
  wrap.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-head">
        <div><div class="modal-title" role="heading" aria-level="2">Admin Access</div><small>RDJ Publishers CMS</small></div>
        <button class="admin-close-btn" onclick="closeAdminLogin()">✕</button>
      </div>
      <div class="admin-body">
        <div class="admin-lock-icon">🔐</div>
        <div class="modal-subtitle" role="heading" aria-level="3">Owner Sign In</div>
        <p class="hint">This panel is restricted to the site owner only.</p>
        <input class="admin-input" type="password" id="adminPass" placeholder="Enter your password" onkeydown="if(event.key==='Enter')doLogin()">
        <button class="admin-btn" onclick="doLogin()">Sign In</button>
        <div class="admin-err" id="adminErr"></div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}
function removeLoginModal() {
  document.getElementById('adminLoginWrap')?.remove();
}

// ── Admin panel + strip (built only after correct password) ──
function buildAdminPanel() {
  if (document.getElementById('adminPanelWrap')) return;
  // Ensure admin styles are loaded before we paint anything.
  injectAdminStyles();
  const wrap = document.createElement('div');
  wrap.className = 'admin-modal-wrap';
  wrap.id = 'adminPanelWrap';
  wrap.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-head">
        <div><div class="modal-title" role="heading" aria-level="2">Content Manager</div><small>Add · Edit · Delete · Export</small></div>
        <button class="admin-close-btn" onclick="closeAdminPanel()">✕</button>
      </div>
      <div class="admin-body">
        <!-- TABS -->
        <div class="admin-tabs">
          <button class="admin-tab" onclick="switchTab('list')">📋 Projects</button>
          <button class="admin-tab" onclick="switchTab('add')">➕ Add / Edit</button>
          <button class="admin-tab" onclick="switchTab('cats')">📁 Categories</button>
          <button class="admin-tab" onclick="switchTab('hero')">🏠 Hero Text</button>
          <button class="admin-tab" onclick="switchTab('export')">⬇️ Export</button>
        </div>
        <!-- ── LIST TAB ── -->
        <div id="tab-list" style="display: block;">
          <div class="cat-filter" id="admin-cat-filter"><button onclick="filterAdminList('all',this)">All</button></div>
          <div class="admin-project-list" id="adminProjectList"></div>
          <div class="admin-actions">
            <button class="btn-save" onclick="prepareNewProject()">➕ Add New Project</button>
          </div>
        </div>
        <!-- ── ADD / EDIT TAB ── -->
        <div id="tab-add" style="display: none;">
          <div class="admin-form-grid">
            <div class="admin-row">
              <div class="admin-fg">
                <label>Icon</label>
                <div class="icon-field-wrap">
                  <div class="icon-toggle">
                    <button id="icon-mode-emoji" class="active" onclick="setIconMode('emoji')">Emoji</button>
                    <button id="icon-mode-image" onclick="setIconMode('image')">Image</button>
                  </div>
                  <div id="icon-emoji-section">
                    <input type="text" id="f-icon" placeholder="📅" maxlength="8">
                  </div>
                  <div id="icon-image-section" style="display: none;">
                    <div class="icon-preview-wrap">
                      <img id="icon-img-preview" class="icon-img-preview" src="" alt="preview">
                      <label class="icon-upload-label">
                        📷 Choose Image
                        <input type="file" id="f-icon-file" accept="image/*" style="display:none;" onchange="onIconFileChange(event)">
                      </label>
                    </div>
                    <div class="icon-gh-token-row" id="icon-gh-token-row" style="display: none;">
                      <label>GitHub Token (needed to upload image)</label>
                      <input class="admin-input" type="password" id="f-icon-gh-token" placeholder="Paste GitHub token" style="margin-bottom:0;font-size:.8rem;padding:.5rem .7rem;">
                      <div class="icon-gh-status" id="icon-gh-status" style="color: var(--teal);"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="admin-fg">
                <label>Category</label>
                <select id="f-cat"><option value="tools">🔧 Tools</option><option value="games">🎮 Games</option><option value="fun">🎉 Fun</option><option value="productivity">📈 Productivity</option></select>
              </div>
            </div>
            <div class="admin-fg full">
              <label>Project Title</label>
              <input type="text" id="f-title" placeholder="e.g. Attendance Calculator">
            </div>
            <div class="admin-fg full">
              <label>Description</label>
              <textarea id="f-desc" placeholder="Brief description of what this project does..."></textarea>
            </div>
            <div class="admin-fg full">
              <label>Full Details (shown behind "Read more")</label>
              <textarea id="f-details" placeholder="What it is, who it's for, and how it works — 2-4 sentences. This is the longer write-up shown when a visitor clicks Read more on the card." style="min-height:110px;"></textarea>
            </div>
            <div class="admin-row">
              <div class="admin-fg">
                <label>Status</label>
                <select id="f-status">
                  <option value="live">● Live</option>
                  <option value="soon">⏳ Coming Soon</option>
                </select>
              </div>
              <div class="admin-fg">
                <label>URL (if live)</label>
                <input type="url" id="f-url" placeholder="https://...">
              </div>
            </div>
          </div>
          <input type="hidden" id="f-edit-id" value="">
          <div class="admin-actions">
            <button class="btn-cancel" onclick="cancelEdit()">← Back</button>
            <button class="btn-save" onclick="saveProject()">💾 Save Project</button>
          </div>
        </div>
        <!-- ── CATEGORIES TAB ── -->
        <div id="tab-cats" style="display: none;">
          <div class="cat-reorder-hint">
            <span style="font-size:1rem;">↕️</span>
            <span>Drag the <strong>⋮⋮</strong> handle, or use the <strong>▲ ▼</strong> buttons, to reorder how categories appear on the home page and sidebar.</span>
          </div>
          <div class="admin-cat-list" id="adminCatList"></div>
          <div id="cat-edit-wrap" style="margin-bottom:1rem;"></div>
          <div style="background:var(--bg);border-radius:10px;padding:1rem;border:1.5px solid var(--border);">
            <div style="font-size:.72rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.7rem;">➕ Add New Category</div>
            <div class="admin-form-grid">
              <div class="admin-row">
                <div class="admin-fg">
                  <label>Category ID</label>
                  <input type="text" id="nc-id" placeholder="e.g. design" maxlength="20">
                </div>
                <div class="admin-fg">
                  <label>Display Name</label>
                  <input type="text" id="nc-name" placeholder="e.g. Design">
                </div>
              </div>
              <div class="admin-row">
                <div class="admin-fg">
                  <label>Icon / Emoji</label>
                  <input type="text" id="nc-icon" placeholder="🎨" maxlength="8">
                </div>
                <div class="admin-fg">
                  <label>Description</label>
                  <input type="text" id="nc-desc" placeholder="Short description">
                </div>
              </div>
            </div>
            <div class="admin-actions" style="margin-top:.7rem;">
              <button class="btn-save" onclick="addCategory()">➕ Add Category</button>
            </div>
          </div>
        </div>
        <!-- ── HERO TEXT TAB ── -->
        <div id="tab-hero" style="display: none;">
          <div class="admin-form-grid">
            <div class="admin-fg full">
              <label>Hero Headline</label>
              <input type="text" id="h-headline" placeholder="Free Tools, One Tap Away!">
            </div>
            <div class="admin-fg full">
              <label>Hero Subtext</label>
              <input type="text" id="h-subtext" placeholder="Seamless, Fast &amp; Reliable">
            </div>
            <div class="admin-fg full">
              <label>About — Mission Text</label>
              <textarea id="h-about" style="min-height:80px;" placeholder="We build free, simple..."></textarea>
            </div>
          </div>
          <div class="admin-actions">
            <button class="btn-save" onclick="saveHero()">💾 Save Changes</button>
          </div>
        </div>
        <!-- ── EXPORT TAB ── -->
        <div id="tab-export" style="display: none;">
          <div class="export-box">
            <strong>📦 How Export Works</strong>
            <p>This downloads a complete <code>.html</code> file with all your current projects and hero text <strong>baked directly into the code</strong>. Once you push it to GitHub, everyone sees your changes — no localStorage needed.</p>
            <p style="margin-top:.5rem;">✅ <strong>Workflow:</strong> Edit in admin → Export → Replace file → Push to GitHub → Done!</p>
          </div>
          <div id="export-count" class="export-count">Ready to export: 0 projects</div>
          <div class="admin-actions" style="margin-top:.8rem;">
            <button class="btn-export" onclick="exportHTML()" style="flex:1;padding:.75rem;border:none;border-radius:9px;font-family:var(--sans);font-size:.88rem;font-weight:700;cursor:pointer;">⬇️ Download Updated HTML File</button>
          </div>
          <div style="margin-top:1.2rem;background:linear-gradient(135deg,#0f1e1c,#1d3632);border-radius:12px;padding:1.2rem;">
            <div style="font-size:.82rem;font-weight:700;color:#fff;margin-bottom:.3rem;">🚀 Publish Directly to GitHub</div>
            <div style="font-size:.72rem;color:rgba(255,255,255,0.5);margin-bottom:1rem;line-height:1.5;">Skip the download. Enter your GitHub token and this will push the updated file live instantly.</div>
            <div style="display:flex;flex-direction:column;gap:.5rem;">
              <input class="admin-input" type="password" id="gh-token-input" placeholder="Paste your GitHub token here" autocomplete="off" style="margin-bottom:0;background:#1a2e2b;border-color:rgba(255,255,255,0.15);color:#fff;">
              <button onclick="publishToGitHub()" id="gh-publish-btn" style="width:100%;padding:.75rem;background:rgb(22,163,74);color:#fff;border:none;border-radius:9px;font-family:var(--sans);font-size:.88rem;font-weight:700;cursor:pointer;">🚀 Publish to GitHub</button>
            </div>
            <div id="gh-status" style="font-size:.75rem;text-align:center;margin-top:.6rem;min-height:1em;color:rgba(255,255,255,0.6);"></div>
          </div>
        </div>
      </div><!-- /admin-body -->
    </div>`;
  document.body.appendChild(wrap);

  // Strip with Sign Out button
  const strip = document.createElement('div');
  strip.className = 'admin-strip';
  strip.id = 'adminStrip';
  strip.innerHTML = `<span>⚙️ Admin Mode Active</span><button onclick="doLogout()">Sign Out</button>`;
  document.body.appendChild(strip);
}
function removeAdminPanel() {
  document.getElementById('adminPanelWrap')?.remove();
  document.getElementById('adminStrip')?.remove();
}

// ── Triple-click trigger (wires up the neutral .trigger-dot element) ──
let dotClickCount = 0, dotClickTimer = null;
function openAdminEntry() {
  dotClickCount++;
  clearTimeout(dotClickTimer);
  if (dotClickCount >= 3) {
    dotClickCount = 0;
    if (isAdmin) openAdminPanel();
    else openAdminLogin();
  } else {
    dotClickTimer = setTimeout(() => { dotClickCount = 0; }, 600);
  }
}

// ── Login flow ──
function openAdminLogin() {
  buildLoginModal();
  document.getElementById('adminLoginWrap')?.classList?.add('show');
  const adminPass = document.getElementById('adminPass');
  if (adminPass) adminPass.value = '';
  const adminErr = document.getElementById('adminErr');
  if (adminErr) adminErr.textContent = '';
  setTimeout(() => document.getElementById('adminPass')?.focus(), 100);
}
function closeAdminLogin() {
  document.getElementById('adminLoginWrap')?.classList?.remove('show');
}
async function doLogin() {
  const pw = document.getElementById('adminPass')?.value || '';
  const hash = await checkPassword(pw);
  if (hash === ADMIN_HASH) {
    isAdmin = true;
    persistUnlock();
    closeAdminLogin();
    removeLoginModal();        // dispose login modal — no longer needed
    document.body.classList.add('admin-mode');
    buildAdminPanel();         // dynamic injection of full admin panel + strip
    document.getElementById('adminStrip')?.classList?.add('visible');
    setAdminDotColor('#22c55e');
    showToast('✅ Admin mode enabled');
    openAdminPanel();
  } else {
    const adminErr = document.getElementById('adminErr');
    if (adminErr) adminErr.textContent = 'Incorrect password. Try again.';
    const adminPass = document.getElementById('adminPass');
    if (adminPass) { adminPass.value = ''; adminPass.focus(); }
  }
}
function doLogout() {
  isAdmin = false;
  clearUnlock();
  document.body.classList.remove('admin-mode');
  removeAdminPanel();          // fully strip admin elements from the DOM
  removeLoginModal();          // also wipe any leftover login modal
  removeAdminStyles();         // purge the admin stylesheet too
  setAdminDotColor('');
  showToast('👋 Signed out of admin mode');
}

// ══════════════════════════════════════════════════════════════
//  ADMIN PANEL — tabs, list, filter, form
// ══════════════════════════════════════════════════════════════
let currentFilter = 'all';
function openAdminPanel() {
  // Build first if state was restored from localStorage (after refresh)
  buildAdminPanel();
  document.body.classList.add('admin-mode');
  document.getElementById('adminStrip')?.classList?.add('visible');
  setAdminDotColor('#22c55e');
  document.getElementById('adminPanelWrap')?.classList?.add('show');
  switchTab('list');
  loadMeta();
}
function closeAdminPanel() {
  document.getElementById('adminPanelWrap')?.classList?.remove('show');
}
function switchTab(tab) {
  ['list','add','cats','hero','export'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });
  document.querySelectorAll('.admin-tab').forEach((btn, i) => {
    btn.classList.toggle('active', ['list','add','cats','hero','export'][i] === tab);
  });
  if (tab === 'list') { renderAdminList(); renderAdminCatFilter(); }
  if (tab === 'cats') renderAdminCats();
  if (tab === 'add')  { renderCatSelect(); }
  if (tab === 'hero') loadMeta();
  if (tab === 'export') renderExportCount();
}
// Filter chips
function filterAdminList(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.cat-filter button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAdminList();
}
// Render project list (respects currentFilter)
function renderAdminList() {
  let projects = getProjects();
  if (currentFilter !== 'all') projects = projects.filter(p => p.category === currentFilter);
  const el = document.getElementById('adminProjectList');
  if (!el) return;
  if (!projects.length) {
    el.innerHTML = '<div class="admin-empty"><strong>No projects yet</strong>Click "Add New Project" to create your first one.</div>';
    return;
  }
  el.innerHTML = projects.map(p => {
    const iconEl = p.icon && p.icon.startsWith('http')
      ? `<img src="${p.icon}" alt="${p.title || ''} icon">`
      : (p.icon || '📦');
    const statusPill = p.status === 'live'
      ? '<span class="pi-status live">Live</span>'
      : '<span class="pi-status soon">Soon</span>';
    return `
    <div class="admin-project-item">
      <div class="pi-icon">${iconEl}</div>
      <div class="pi-info">
        <div class="pi-name">${p.title}</div>
        <div class="pi-cat"><span>${catLabel(p.category)}</span>${statusPill}</div>
      </div>
      <div class="pi-btns">
        <button class="pi-btn edit" title="Edit" onclick="editProject('${p.id}')">✏️</button>
        <button class="pi-btn del" title="Delete" onclick="deleteProject('${p.id}')">🗑️</button>
      </div>
    </div>
  `;
  }).join('');
}
function catLabel(c) {
  const cats = getCategories();
  const found = cats.find(x => x.id === c);
  if (found) return (found.icon && !found.icon.startsWith('http') ? found.icon + ' ' : '') + found.name;
  return c;
}
function renderAdminCatFilter() {
  const cats = getCategories();
  const wrap = document.getElementById('admin-cat-filter');
  if (!wrap) return;
  // Keep the "All" button, replace the rest
  const allBtn = wrap.querySelector('button');
  wrap.innerHTML = '';
  if (allBtn) wrap.appendChild(allBtn);
  cats.forEach(cat => {
    const btn = document.createElement('button');
    const iconHtml = cat.icon && cat.icon.startsWith('http') ? '' : (cat.icon || '');
    btn.textContent = (iconHtml ? iconHtml + ' ' : '') + cat.name;
    btn.onclick = function() { filterAdminList(cat.id, this); };
    if (currentFilter === cat.id) btn.classList.add('active');
    wrap.appendChild(btn);
  });
  if (allBtn) {
    if (currentFilter === 'all') allBtn.classList.add('active');
    else allBtn.classList.remove('active');
  }
}
function renderCatSelect() {
  const cats = getCategories();
  const sel = document.getElementById('f-cat');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon && !c.icon.startsWith('http') ? c.icon + ' ' : ''}${c.name}</option>`).join('');
  if (prev && cats.find(c => c.id === prev)) sel.value = prev;
}
function renderAdminCats() {
  const cats = getCategories();
  const el = document.getElementById('adminCatList');
  if (!el) return;
  if (!cats.length) {
    el.innerHTML = '<div class="admin-empty"><strong>No categories yet</strong>Add one below to get started.</div>';
    return;
  }
  el.innerHTML = cats.map((cat, idx) => {
    const iconHtml = cat.icon && cat.icon.startsWith('http')
      ? `<img src="${cat.icon}" alt="${cat.name}">`
      : (cat.icon || '📁');
    const isFirst = idx === 0;
    const isLast  = idx === cats.length - 1;
    return `<div class="admin-cat-item" draggable="true" data-cat-id="${cat.id}">
      <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
      <span class="cat-pos" title="Position">${idx + 1}</span>
      <div class="ci-icon">${iconHtml}</div>
      <div class="ci-info">
        <div class="ci-name">${cat.name}</div>
        <div class="ci-id">ID: ${cat.id}</div>
      </div>
      <div class="cat-reorder-controls" title="Move up/down">
        <button ${isFirst ? 'disabled' : ''} title="Move up" onclick="moveCategoryUp('${cat.id}')">▲</button>
        <button ${isLast ? 'disabled' : ''} title="Move down" onclick="moveCategoryDown('${cat.id}')">▼</button>
      </div>
      <div class="pi-btns">
        <button class="pi-btn edit" title="Edit" onclick="editCategory('${cat.id}')">✏️</button>
        <button class="pi-btn del" title="Delete" onclick="deleteCategory('${cat.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
  // Attach drag-and-drop handlers (delegated) — works on freshly painted rows
  initCatDragDrop();
  // If we're currently editing a cat, re-render its edit form (in case list refreshed)
  if (editingCatId) renderCatEditForm();
}
// ── Reorder: move category up or down by one position ──
function moveCategoryUp(id) {
  const cats = getCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx <= 0) return;
  [cats[idx - 1], cats[idx]] = [cats[idx], cats[idx - 1]];
  saveCategories(cats);
  renderAll();
  renderAdminCats();
  showToast('↥ ' + cats[idx].name + ' moved up');
}
function moveCategoryDown(id) {
  const cats = getCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1 || idx >= cats.length - 1) return;
  [cats[idx + 1], cats[idx]] = [cats[idx], cats[idx + 1]];
  saveCategories(cats);
  renderAll();
  renderAdminCats();
  showToast('↧ ' + cats[idx].name + ' moved down');
}
// ── Reorder: drag-and-drop (HTML5 native, no library) ──
let _catDragSrcId = null;
let _catDragTargetId = null;
function initCatDragDrop() {
  const list = document.getElementById('adminCatList');
  if (!list || list.dataset.dndWired === '1') return;
  list.dataset.dndWired = '1';
  list.addEventListener('dragstart', e => {
    const item = e.target.closest('.admin-cat-item');
    if (!item) return;
    _catDragSrcId = item.dataset.catId;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', _catDragSrcId); } catch(_) {}
  });
  list.addEventListener('dragend', e => {
    const item = e.target.closest('.admin-cat-item');
    if (item) item.classList.remove('dragging');
    list.querySelectorAll('.admin-cat-item').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    _catDragSrcId = null;
    _catDragTargetId = null;
  });
  list.addEventListener('dragover', e => {
    const item = e.target.closest('.admin-cat-item');
    if (!item || !_catDragSrcId || item.dataset.catId === _catDragSrcId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Decide insert position based on cursor Y relative to item midpoint
    const r = item.getBoundingClientRect();
    const isAbove = (e.clientY - r.top) < r.height / 2;
    list.querySelectorAll('.admin-cat-item').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    item.classList.add(isAbove ? 'drag-over-top' : 'drag-over-bottom');
    _catDragTargetId = item.dataset.catId;
    _catDropAbove = isAbove;
  });
  list.addEventListener('dragleave', e => {
    const item = e.target.closest('.admin-cat-item');
    if (item) item.classList.remove('drag-over-top', 'drag-over-bottom');
  });
  list.addEventListener('drop', e => {
    e.preventDefault();
    if (!_catDragSrcId || !_catDragTargetId || _catDragSrcId === _catDragTargetId) return;
    const cats = getCategories();
    const srcIdx = cats.findIndex(c => c.id === _catDragSrcId);
    const tgtIdx = cats.findIndex(c => c.id === _catDragTargetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = cats.splice(srcIdx, 1);
    // Recompute target index AFTER removal (src may have been before tgt)
    const newTgtIdx = cats.findIndex(c => c.id === _catDragTargetId);
    const insertAt = (_catDropAbove ? newTgtIdx : newTgtIdx + 1);
    cats.splice(insertAt, 0, moved);
    saveCategories(cats);
    renderAll();
    renderAdminCats();
    showToast('↕️ Reordered');
  });
}
let _catDropAbove = true;
let editingCatId = null;
function editCategory(id) {
  editingCatId = id;
  renderAdminCats();
  renderCatEditForm();
  // Scroll the edit form into view
  setTimeout(() => {
    const form = document.getElementById('cat-edit-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}
function renderCatEditForm() {
  const wrap = document.getElementById('cat-edit-wrap');
  if (!wrap) return;
  if (!editingCatId) { wrap.innerHTML = ''; return; }
  const cats = getCategories();
  const cat = cats.find(c => c.id === editingCatId);
  if (!cat) { wrap.innerHTML = ''; editingCatId = null; return; }
  const iconIsImg = cat.icon && cat.icon.startsWith('http');
  wrap.innerHTML = `
    <div style="background:var(--bg);border-radius:10px;padding:1rem;border:1.5px solid var(--border);">
      <div style="font-size:.72rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.7rem;">✏️ Edit Category</div>
      <div id="cat-edit-form" class="cat-edit-box">
        <div class="cat-edit-title">Editing: <span>${cat.name}</span></div>
      <div class="admin-form-grid">
        <div class="admin-row">
          <div class="admin-fg">
            <label>Category ID (locked)</label>
            <input type="text" id="ec-id" value="${cat.id}" disabled style="opacity:.6;cursor:not-allowed;">
          </div>
          <div class="admin-fg">
            <label>Display Name</label>
            <input type="text" id="ec-name" value="${cat.name.replace(/"/g,'&quot;')}" maxlength="40">
          </div>
        </div>
        <div class="admin-row">
          <div class="admin-fg">
            <label>Icon / Emoji</label>
            <input type="text" id="ec-icon" value="${iconIsImg ? '' : (cat.icon || '').replace(/"/g,'&quot;')}" maxlength="8" placeholder="🔧">
          </div>
          <div class="admin-fg">
            <label>Description</label>
            <input type="text" id="ec-desc" value="${(cat.desc || '').replace(/"/g,'&quot;')}" placeholder="Short description">
          </div>
        </div>
        ${iconIsImg ? `<div class="admin-fg full"><label>Current Image</label><div style="display:flex;align-items:center;gap:.7rem;"><img src="${cat.icon}" alt="${cat.name} icon" style="width:36px;height:36px;border-radius:8px;object-fit:contain;border:1.5px solid var(--border);display:block;"><span style="font-size:.7rem;color:var(--muted);">${cat.icon}</span></div></div>` : ''}
      </div>
      <div class="admin-actions" style="margin-top:.7rem;">
        <button class="btn-cancel" onclick="cancelEditCategory()">← Cancel</button>
        <button class="btn-save" onclick="saveEditCategory()">💾 Save Changes</button>
      </div>
      </div>
    </div>`;
}
function saveEditCategory() {
  if (!editingCatId) return;
  const cats = getCategories();
  const idx = cats.findIndex(c => c.id === editingCatId);
  if (idx === -1) return;
  const name = (document.getElementById('ec-name')?.value || '').trim();
  let icon   = (document.getElementById('ec-icon')?.value || '').trim();
  const desc = (document.getElementById('ec-desc')?.value || '').trim();
  if (!name) { showToast('⚠️ Display name is required'); return; }
  // If user cleared the icon field, keep existing (since img icons are hidden in input)
  if (!icon) icon = cats[idx].icon;
  cats[idx] = { ...cats[idx], name, icon, desc };
  saveCategories(cats);
  editingCatId = null;
  renderAll();
  renderAdminCats();
  showToast('✅ Category "' + name + '" updated!');
}
function cancelEditCategory() {
  editingCatId = null;
  renderCatEditForm();
}
function addCategory() {
  const id   = (document.getElementById('nc-id')?.value || '').trim().toLowerCase().replace(/\s+/g,'-');
  const name = (document.getElementById('nc-name')?.value || '').trim();
  const icon = (document.getElementById('nc-icon')?.value || '').trim() || '📁';
  const desc = (document.getElementById('nc-desc')?.value || '').trim();
  if (!id || !name) { showToast('⚠️ ID and Name are required'); return; }
  const cats = getCategories();
  if (cats.find(c => c.id === id)) { showToast('⚠️ Category ID already exists'); return; }
  cats.push({ id, name, icon, desc });
  saveCategories(cats);
  renderAll();
  renderAdminCats();
  const ncId = document.getElementById('nc-id');
  if (ncId) ncId.value = '';
  const ncName = document.getElementById('nc-name');
  if (ncName) ncName.value = '';
  const ncIcon = document.getElementById('nc-icon');
  if (ncIcon) ncIcon.value = '';
  const ncDesc = document.getElementById('nc-desc');
  if (ncDesc) ncDesc.value = '';
  showToast('✅ Category "' + name + '" added!');
}
function deleteCategory(id) {
  if (!confirm('Delete this category? Projects in it will keep their category ID but the category won\'t appear in menus.')) return;
  const cats = getCategories().filter(c => c.id !== id);
  saveCategories(cats);
  renderAll();
  renderAdminCats();
  showToast('🗑️ Category deleted');
}
// Open add tab with empty form (preserve category filter as default category)
function prepareNewProject() {
  clearForm();
  renderCatSelect();
  const fCat = document.getElementById('f-cat');
  if (currentFilter !== 'all' && fCat) fCat.value = currentFilter;
  switchTab('add');
}
function editProject(id) {
  const p = getProjects().find(x => x.id === id);
  if (!p) return;
  renderCatSelect();
  // Detect if icon is image URL or emoji
  if (p.icon && p.icon.startsWith('http')) {
    setIconMode('image');
    const imgPreview = document.getElementById('icon-img-preview');
    if (imgPreview) { imgPreview.src = p.icon; imgPreview.classList.add('visible'); }
    pendingIconUrl = p.icon;
  } else {
    setIconMode('emoji');
    const fIcon = document.getElementById('f-icon');
    if (fIcon) fIcon.value = p.icon;
  }
  const fCat = document.getElementById('f-cat');
  if (fCat) fCat.value = p.category;
  const fTitle = document.getElementById('f-title');
  if (fTitle) fTitle.value = p.title;
  const fDesc = document.getElementById('f-desc');
  if (fDesc) fDesc.value = p.desc;
  const fDetails = document.getElementById('f-details');
  if (fDetails) fDetails.value = p.details || '';
  const fStatus = document.getElementById('f-status');
  if (fStatus) fStatus.value = p.status;
  const fUrl = document.getElementById('f-url');
  if (fUrl) fUrl.value = p.url || '';
  const fEditId = document.getElementById('f-edit-id');
  if (fEditId) fEditId.value = p.id;
  switchTab('add');
}
function deleteProject(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  const projects = getProjects().filter(p => p.id !== id);
  saveProjects(projects);
  renderAll();
  renderAdminList();
  showToast('🗑️ Project deleted');
}
function cancelEdit() { clearForm(); switchTab('list'); }
function clearForm() {
  ['f-icon','f-title','f-desc','f-details','f-url','f-edit-id'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const fCat = document.getElementById('f-cat');
  if (fCat) fCat.value = getCategories()[0]?.id || 'tools';
  const fStatus = document.getElementById('f-status');
  if (fStatus) fStatus.value = 'live';
  setIconMode('emoji');
  pendingImageFile = null;
  pendingIconUrl   = null;
  const preview = document.getElementById('icon-img-preview');
  if (preview) { preview.src = ''; preview.classList.remove('visible'); }
  const ghTokenRow = document.getElementById('icon-gh-token-row');
  if (ghTokenRow) ghTokenRow.style.display = 'none';
  const ghStatus = document.getElementById('icon-gh-status');
  if (ghStatus) ghStatus.textContent = '';
}
function saveProject() {
  // Determine icon
  let icon;
  const iconMode = document.getElementById('icon-mode-emoji')?.classList?.contains('active') ? 'emoji' : 'image';
  if (iconMode === 'image') {
    if (pendingImageFile) {
      // Need to upload image first
      uploadIconAndSave();
      return;
    }
    icon = pendingIconUrl || '📦';
  } else {
    icon = document.getElementById('f-icon')?.value?.trim() || '📦';
  }
  _doSaveProject(icon);
}
async function uploadIconAndSave() {
  const token = document.getElementById('f-icon-gh-token')?.value?.trim() || '';
  const statusEl = document.getElementById('icon-gh-status');
  if (!token) {
    const ghTokenRow = document.getElementById('icon-gh-token-row');
    if (ghTokenRow) ghTokenRow.style.display = 'block';
    if (statusEl) { statusEl.textContent = '⚠️ Enter your GitHub token to upload the image.'; statusEl.style.color = '#d93025'; }
    return;
  }
  if (statusEl) { statusEl.style.color = 'var(--teal)'; statusEl.textContent = '⏳ Uploading image…'; }
  try {
    const ext = pendingImageFile.name.split('.').pop();
    const fileName = 'images/icon-' + Date.now() + '.' + ext;
    const OWNER = 'rdjpublishers', REPO = 'rdjpublishers.com';
    const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${fileName}`;
    // Read file as base64
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(pendingImageFile);
    });
    // Upload to GitHub
    const putRes = await fetch(API, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add icon image — ${new Date().toLocaleString()}`,
        content: base64
      })
    });
    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || 'Upload failed: ' + putRes.status);
    }
    const result = await putRes.json();
    const rawUrl = result.content.download_url;
    if (statusEl) statusEl.textContent = '✅ Image uploaded!';
    pendingImageFile = null;
    pendingIconUrl = rawUrl;
    const imgPreview = document.getElementById('icon-img-preview');
    if (imgPreview) imgPreview.src = rawUrl;
    setTimeout(() => { _doSaveProject(rawUrl); }, 600);
  } catch(err) {
    if (statusEl) { statusEl.style.color = '#d93025'; statusEl.textContent = '❌ ' + err.message; }
  }
}
function _doSaveProject(icon) {
  const cat    = document.getElementById('f-cat')?.value || '';
  const title  = document.getElementById('f-title')?.value?.trim() || '';
  const desc   = document.getElementById('f-desc')?.value?.trim() || '';
  const details = document.getElementById('f-details')?.value?.trim() || '';
  const status = document.getElementById('f-status')?.value || 'live';
  const url    = document.getElementById('f-url')?.value?.trim() || '';
  const editId = document.getElementById('f-edit-id')?.value || '';
  if (!title) { showToast('⚠️ Title is required'); return; }
  let projects = getProjects();
  if (editId) {
    projects = projects.map(p => p.id === editId ? { ...p, icon, category:cat, title, desc, details, status, url } : p);
    showToast('✅ Project updated!');
  } else {
    projects.push({ id:'p'+Date.now(), addedAt: Date.now(), icon, category:cat, title, desc, details, status, url });
    showToast('✅ Added to ' + catLabel(cat) + '!');
  }
  saveProjects(projects);
  renderAll();
  switchTab('list');
  clearForm();
}
// Hero / meta
function loadMeta() {
  const m = getMeta();
  const hHeadline = document.getElementById('h-headline');
  if (hHeadline) hHeadline.value = m.heroHeadline;
  const hSubtext = document.getElementById('h-subtext');
  if (hSubtext) hSubtext.value = m.heroSubtext;
  const hAbout = document.getElementById('h-about');
  if (hAbout) hAbout.value = m.aboutMission;
}
function saveHero() {
  const m = {
    heroHeadline: document.getElementById('h-headline')?.value || '',
    heroSubtext:  document.getElementById('h-subtext')?.value || '',
    aboutMission: document.getElementById('h-about')?.value || ''
  };
  saveMeta(m);
  applyMeta();
  showToast('✅ Hero & About text updated!');
}
// ══════════════════════════════════════════════════════════════
//  EXPORT — rewrites the embedded JSON block, downloads file
// ══════════════════════════════════════════════════════════════
function renderExportCount() {
  const projects = getProjects();
  const live = projects.filter(p => p.status === 'live').length;
  const soon = projects.filter(p => p.status === 'soon').length;
  const exportCountEl = document.getElementById('export-count');
  if (exportCountEl) exportCountEl.textContent =
    'Ready to export: ' + projects.length + ' projects (' + live + ' live, ' + soon + ' coming soon)';
}
function buildCleanHTML() {
  // ── Step 1: Snapshot then clean the DOM directly ──
  // Admin elements are now dynamically added, so we look them up by id /
  // class — they may not exist (logged-out export) or may exist with full
  // content (logged-in export). Either way the exported file must end up
  // admin-clean.
  const panelWrap   = document.getElementById('adminPanelWrap');
  const loginWrap   = document.getElementById('adminLoginWrap');
  const adminStrip  = document.getElementById('adminStrip');
  const adminDot    = document.querySelector('.trigger-dot');
  const publishBtn  = document.getElementById('gh-publish-btn');
  const ghStatus    = document.getElementById('gh-status');
  const tabExport   = document.getElementById('tab-export');
  const tabAdd      = document.getElementById('tab-add');
  const tabCats     = document.getElementById('tab-cats');
  const tabHero     = document.getElementById('tab-hero');
  const tabList     = document.getElementById('tab-list');

  // Snapshot admin-state so we can restore after capture.
  const panelWasOpen  = panelWrap  && panelWrap.classList.contains('show');
  const loginWasOpen  = loginWrap  && loginWrap.classList.contains('show');
  const stripVisible  = adminStrip && adminStrip.classList.contains('visible');
  const dotBg         = adminDot   ? adminDot.style.background : '';
  const bodyAdminMode = document.body.classList.contains('admin-mode');
  const btnLabel      = publishBtn ? publishBtn.textContent : '';
  const btnDisabled   = publishBtn ? publishBtn.disabled : false;
  const statusText    = ghStatus   ? ghStatus.textContent : '';
  const statusColor   = ghStatus   ? ghStatus.style.color : '';
  const tabExportDisp = tabExport ? tabExport.style.display : '';
  const tabAddDisp    = tabAdd    ? tabAdd.style.display    : '';
  const tabCatsDisp   = tabCats   ? tabCats.style.display   : '';
  const tabHeroDisp   = tabHero   ? tabHero.style.display   : '';
  const tabListDisp   = tabList   ? tabList.style.display   : '';
  const activeAdminTabs = Array.from(document.querySelectorAll('.admin-tab.active'));

  // Snapshot parent + nextSibling of admin elements so we can detach and
  // re-insert them at exactly the same spot after the capture.
  const panelParent   = panelWrap  && panelWrap.parentNode;
  const panelNext     = panelWrap  && panelWrap.nextSibling;
  const loginParent   = loginWrap  && loginWrap.parentNode;
  const loginNext     = loginWrap  && loginWrap.nextSibling;
  const stripParent   = adminStrip && adminStrip.parentNode;
  const stripNext     = adminStrip && adminStrip.nextSibling;
  const dotParent     = adminDot   && adminDot.parentNode;
  const dotNext       = adminDot   && adminDot.nextSibling;

  // Detach admin elements so they are NOT captured by outerHTML. The
  // exported public HTML will be completely admin-clean.
  if (panelWrap)  panelWrap.remove();
  if (loginWrap)  loginWrap.remove();
  if (adminStrip) adminStrip.remove();
  // For the trigger dot: temporarily neutralise any admin styling on it
  // but keep the element itself in source (it's the owner-only trigger).
  // If the dot happens to live inside an element we also want to keep,
  // we don't remove it — only strip its inline admin background.
  if (adminDot)   adminDot.style.background = '';
  document.body.classList.remove('admin-mode');
  if (publishBtn) { publishBtn.disabled = false; publishBtn.textContent = '🚀 Publish to GitHub'; }
  // gh-publish-btn / gh-status live inside the (now-detached) tab-export,
  // so we don't need to touch them — they're gone from the captured DOM.

  // ── Step 2: Capture clean HTML and update embedded data ──
  const projects   = getProjects();
  const meta       = getMeta();
  const categories = getCategories();
  const newData    = JSON.stringify({ projects, meta, categories }, null, 2);

  let html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

  html = html.replace(
    /(<script[^>]*id="rdj-data"[^>]*>)[\s\S]*?(<\/script>)/,
    '$1\n' + newData + '\n$2'
  );

  // ── Step 3: Restore DOM so the owner's session is unaffected ──
  if (panelParent) {
    if (panelNext) panelParent.insertBefore(panelWrap, panelNext);
    else panelParent.appendChild(panelWrap);
    if (panelWasOpen) panelWrap.classList.add('show');
  }
  if (loginParent) {
    if (loginNext) loginParent.insertBefore(loginWrap, loginNext);
    else loginParent.appendChild(loginWrap);
    if (loginWasOpen) loginWrap.classList.add('show');
  }
  if (stripParent) {
    if (stripNext) stripParent.insertBefore(adminStrip, stripNext);
    else stripParent.appendChild(adminStrip);
    if (stripVisible) adminStrip.classList.add('visible');
  }
  if (adminDot && dotBg) adminDot.style.background = dotBg;
  if (bodyAdminMode) document.body.classList.add('admin-mode');
  if (publishBtn)  { publishBtn.disabled = btnDisabled; publishBtn.textContent = btnLabel; }
  if (ghStatus)    { ghStatus.textContent = statusText; ghStatus.style.color = statusColor; }
  if (tabExport) tabExport.style.display = tabExportDisp;
  if (tabAdd)    tabAdd.style.display    = tabAddDisp;
  if (tabCats)   tabCats.style.display   = tabCatsDisp;
  if (tabHero)   tabHero.style.display   = tabHeroDisp;
  if (tabList)   tabList.style.display   = tabListDisp;
  activeAdminTabs.forEach(b => b.classList.add('active'));

  // tab-* tabs live inside panelWrap, so they were also detached above.
  // The restore above re-inserted panelWrap with all its children intact,
  // so the tab display snapshot/restore is actually only relevant if the
  // user re-opened the panel during the capture window — harmless either way.
  return html;
}

function exportHTML() {
  const html = buildCleanHTML();
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'index.html';
  a.click();
  showToast('✅ HTML file downloaded!');
}
// ══════════════════════════════════════════════════════════════
//  PUBLISH TO GITHUB — pushes updated index.html directly
// ══════════════════════════════════════════════════════════════
async function publishToGitHub() {
  const token = document.getElementById('gh-token-input')?.value?.trim() || '';
  const statusEl = document.getElementById('gh-status');
  const btn = document.getElementById('gh-publish-btn');
  if (!token) {
    if (statusEl) { statusEl.textContent = '⚠️ Please enter your GitHub token first.'; statusEl.style.color = '#f87171'; }
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Publishing…'; }

  const OWNER = 'rdjpublishers', REPO = 'rdjpublishers.com';
  const commitMsg = `Update site — ${new Date().toLocaleString()}`;

  // Get current SHA for a file (returns null if it doesn't exist yet)
  async function getFileSHA(file) {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${file}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Could not fetch ${file}: ${res.status}`);
    return (await res.json()).sha;
  }

  // Push one file to GitHub
  async function pushFile(file, textContent, sha) {
    const encoded = btoa(unescape(encodeURIComponent(textContent)));
    const body = { message: commitMsg, content: encoded };
    if (sha) body.sha = sha;
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${file}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || `Push failed for ${file}: ${res.status}`); }
  }

  const setStatus = (msg, color) => {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color || 'rgba(255,255,255,0.6)'; }
  };

  try {
    // 1 / 3 — index.html
    setStatus('⏳ Pushing index.html… (1/3)');
    await pushFile('index.html', buildCleanHTML(), await getFileSHA('index.html'));

    // 2 / 3 — sitemap.html
    setStatus('⏳ Pushing sitemap.html… (2/3)');
    await pushFile('sitemap.html', generateSitemapHTML(), await getFileSHA('sitemap.html'));

    // 3 / 3 — sitemap.xml
    setStatus('⏳ Pushing sitemap.xml… (3/3)');
    await pushFile('sitemap.xml', generateSitemapXML(), await getFileSHA('sitemap.xml'));

    setStatus('✅ All 3 files published!', '#4ade80');
    showToast('✅ Published to GitHub!');
  } catch(err) {
    setStatus('❌ ' + err.message, '#f87171');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Publish to GitHub'; }
  }
}

// ══════════════════════════════════════════════════════════════
//  RENDER ALL — updates every dynamic section on the page
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  APPLY META — updates hero text and about text on page
// ══════════════════════════════════════════════════════════════
function applyMeta() {
  const m = getMeta();
  const heroHeadline = document.getElementById('hero-headline');
  if (heroHeadline) heroHeadline.innerHTML = (m.heroHeadline || '').replace(/\n/g, '<br>');
  const heroSubtext = document.getElementById('hero-subtext');
  if (heroSubtext) {
    heroSubtext.textContent = m.heroSubtext || '';
    heroSubtext.classList.add('clamped');
  }
  const heroReadMoreBtn = document.getElementById('heroReadMoreBtn');
  if (heroReadMoreBtn) heroReadMoreBtn.textContent = 'Read more';
  const aboutMission = document.getElementById('about-mission-text');
  if (aboutMission) aboutMission.textContent = m.aboutMission || '';
}
function toggleHeroSubtext() {
  const p = document.getElementById('hero-subtext');
  const btn = document.getElementById('heroReadMoreBtn');
  if (!p || !btn) return;
  const expanded = p.classList.toggle('clamped') === false;
  btn.textContent = expanded ? 'Read less' : 'Read more';
}
function renderAll() {
  applyMeta();
  const projects = getProjects();
  const cats = getCategories();
  // Category grid on home page
  const catGrid = document.getElementById('home-cat-grid');
  if (catGrid) {
    catGrid.innerHTML = cats.map(cat => {
      const iconEl = cat.icon && cat.icon.startsWith('http')
        ? `<img src="${cat.icon}" alt="${cat.name} icon" style="width:1.2rem;height:1.2rem;object-fit:contain;border-radius:3px;vertical-align:middle;">`
        : (cat.icon || '📁');
      return `<div class="cat-card" onclick="goToCat('${cat.id}')">
        <div class="cat-icon">${iconEl}</div>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-arrow">›</div>
      </div>`;
    }).join('');
  }
  // Render sidebar Browse links
  const sbLinks = document.getElementById('sb-cat-links');
  if (sbLinks) {
    sbLinks.innerHTML = cats.map(cat => {
      const ic = cat.icon && cat.icon.startsWith('http')
        ? `<img src="${cat.icon}" alt="${cat.name} icon" style="width:1rem;height:1rem;object-fit:contain;border-radius:3px;vertical-align:middle;">`
        : (cat.icon || '📁');
      return `<button class="sb-link" data-catid="${cat.id}" onclick="goToCat('${cat.id}')"><span class="ic">${ic}</span> ${cat.name}</button>`;
    }).join('');
  }
  // If currently viewing a category page, refresh it
  if (currentCatId) {
    const catViewEl = document.getElementById('page-cat-view');
    if (catViewEl && catViewEl.classList.contains('active')) {
      goToCat(currentCatId);
    }
  }
  // Popular section — sorted by most recently added, live first, up to 8 (scrolls on mobile)
  const sortedProjects = [...projects].sort((a,b) => (b.addedAt||0)-(a.addedAt||0));
  const popular = [...sortedProjects.filter(p => p.status==='live'), ...sortedProjects.filter(p => p.status==='soon')].slice(0,8);
  const homePopular = document.getElementById('homePopular');
  if (homePopular) homePopular.innerHTML = popular.map(p => popCardHTML(p)).join('');
  // Stats
  const statEl = document.getElementById('stat-projects');
  if (statEl) statEl.textContent = projects.filter(p => p.status==='live').length + '+';
}
function projectCardHTML(p) {
  const isLive = p.status === 'live';
  const tag    = isLive
    ? '<span class="live-badge">● Live</span><span class="visit-link">Visit →</span>'
    : '<span class="soon-badge">⏳ Coming Soon</span>';
  const open  = (isLive && p.url) ? `<a class="app-card" href="${p.url}" target="_blank">` : `<div class="app-card${isLive ? '' : ' dim'}">`;
  const close = (isLive && p.url) ? '</a>' : '</div>';
  const isImgIcon = p.icon && p.icon.startsWith('http');
  const thumbAttrs = isImgIcon ? '' : '';
  const thumbContent = isImgIcon
    ? `<img src="${p.icon}" alt="${p.title || ''} icon">`
    : (p.icon || '📦');
  const fullText = [p.desc, p.details].filter(Boolean).join(' ');
  const descHTML = fullText
    ? `<div class="app-card-desc" id="desc-${p.id}">${fullText}</div><span class="read-more-link" id="rm-${p.id}" style="display:none" onclick="event.preventDefault();event.stopPropagation();openDescModal('${p.id}')">Read more</span>`
    : '';
  return `${open}
    <div class="app-card-thumb"${thumbAttrs}>${thumbContent}</div>
    <div class="app-card-body">
      <div class="app-card-title">${p.title}</div>
      ${descHTML}
      <div class="app-card-foot">${tag}</div>
    </div>
  ${close}`;
}
function refreshReadMoreLinks() {
  document.querySelectorAll('.app-card-desc').forEach(el => {
    const link = document.getElementById('rm-' + el.id.replace('desc-', ''));
    if (!link) return;
    link.style.display = (el.scrollHeight > el.clientHeight + 1) ? 'inline-block' : 'none';
  });
}
window.addEventListener('resize', () => { clearTimeout(window._rmResizeT); window._rmResizeT = setTimeout(refreshReadMoreLinks, 150); });
function openDescModal(id) {
  const p = getProjects().find(pr => pr.id === id);
  if (!p) return;
  const fullText = [p.desc, p.details].filter(Boolean).join(' ');
  const isImgIcon = p.icon && p.icon.startsWith('http');
  const thumbEl = document.getElementById('descModalThumb');
  thumbEl.className = 'desc-modal-thumb' + (isImgIcon ? ' has-img' : '');
  thumbEl.innerHTML = isImgIcon ? `<img src="${p.icon}" alt="${p.title || ''} icon">` : (p.icon || '📦');
  document.getElementById('descModalTitle').textContent = p.title || '';
  document.getElementById('descModalText').textContent = fullText;
  document.getElementById('descModalWrap')?.classList?.add('show');
}
function closeDescModal() {
  document.getElementById('descModalWrap')?.classList?.remove('show');
}
function popCardHTML(p) {
  const isLive = p.status === 'live';
  const attrs  = (isLive && p.url)
    ? `onclick="window.open('${p.url}','_blank')" style="cursor:pointer"`
    : 'style="pointer-events:none;opacity:.55"';
  const isImgIcon = p.icon && p.icon.startsWith('http');
  const thumbClass = isImgIcon ? 'pop-thumb has-img' : 'pop-thumb';
  const thumbContent = isImgIcon
    ? `<img src="${p.icon}" alt="${p.title || ''} icon">`
    : (p.icon || '📦');
  return `<div class="pop-card" ${attrs}>
    <div class="${thumbClass}">${thumbContent}</div>
    <div class="pop-info">
      <div class="pop-cat">${catLabel(p.category)}</div>
      <div class="pop-title">${p.title}</div>
      <span class="pop-tag${isLive ? '' : ' soon'}">${isLive ? '● Live' : '⏳ Coming Soon'}</span>
    </div>
  </div>`;
}
// ══════════════════════════════════════════════════════════════
//  CONTACT FORM — Web3Forms submission
// ══════════════════════════════════════════════════════════════
async function submitContactForm() {
  const name    = document.getElementById('cf-name')?.value?.trim() || '';
  const email   = document.getElementById('cf-email')?.value?.trim() || '';
  const subject = document.getElementById('cf-subject')?.value?.trim() || '';
  const message = document.getElementById('cf-message')?.value?.trim() || '';
  const errEl   = document.getElementById('cf-err');
  if (errEl) errEl.style.display = 'none';
  if (!name || !email || !message) {
    if (errEl) { errEl.textContent = 'Please fill in your name, email, and message.'; errEl.style.display = 'block'; }
    return;
  }
  const btn = document.querySelector('.submit-btn');
  if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: 'b8e73ebb-4cd4-45ae-aa44-5a9725856c03',
        name, email, subject, message
      })
    });
    const data = await res.json();
    if (data.success) {
      const cformFields = document.getElementById('cform-fields');
      if (cformFields) cformFields.style.display = 'none';
      const cformSuccess = document.getElementById('cform-success');
      if (cformSuccess) cformSuccess.style.display = 'block';
    } else {
      throw new Error('Server error');
    }
  } catch(e) {
    if (errEl) { errEl.textContent = 'Failed to send. Please email us directly at rdjpublishers@gmail.com'; errEl.style.display = 'block'; }
    if (btn) { btn.textContent = 'Send Message ✉️'; btn.disabled = false; }
  }
}
// ══════════════════════════════════════════════════════════════
//  ICON MODE TOGGLE & IMAGE UPLOAD STATE
// ══════════════════════════════════════════════════════════════
let pendingImageFile = null;
let pendingIconUrl   = null;
function setIconMode(mode) {
  const emojiBtn  = document.getElementById('icon-mode-emoji');
  const imageBtn  = document.getElementById('icon-mode-image');
  const emojiSec  = document.getElementById('icon-emoji-section');
  const imageSec  = document.getElementById('icon-image-section');
  if (mode === 'emoji') {
    emojiBtn?.classList?.add('active');
    imageBtn?.classList?.remove('active');
    if (emojiSec) emojiSec.style.display = '';
    if (imageSec) imageSec.style.display = 'none';
  } else {
    imageBtn?.classList?.add('active');
    emojiBtn?.classList?.remove('active');
    if (emojiSec) emojiSec.style.display = 'none';
    if (imageSec) imageSec.style.display = '';
  }
}
function onIconFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  pendingImageFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('icon-img-preview');
    if (preview) { preview.src = ev.target.result; preview.classList.add('visible'); }
  };
  reader.readAsDataURL(file);
  const ghTokenRow = document.getElementById('icon-gh-token-row');
  if (ghTokenRow) ghTokenRow.style.display = 'block';
  const ghStatus = document.getElementById('icon-gh-status');
  if (ghStatus) { ghStatus.textContent = '📎 Image selected — enter GitHub token and click Save to upload.'; ghStatus.style.color = 'var(--teal)'; }
}
// ══════════════════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════════════════
function onSearchInput(val) {
  const q = val.trim().toLowerCase();
  const box = document.getElementById('search-results');
  if (!box) return;
  if (!q) { box.classList.remove('show'); box.innerHTML = ''; return; }
  const projects = getProjects();
  const cats = getCategories();
  const results = projects.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.desc && p.desc.toLowerCase().includes(q))
  );
  if (!results.length) {
    box.innerHTML = '<div class="search-no-results">No results for "<strong>' + val + '</strong>"</div>';
  } else {
    box.innerHTML = results.map(p => {
      const cat = cats.find(c => c.id === p.category);
      const catName = cat ? cat.name : p.category;
      const iconEl = p.icon && p.icon.startsWith('http')
        ? `<img src="${p.icon}" alt="${p.title || ''} icon">`
        : `<span>${p.icon || '📦'}</span>`;
      const attrs = (p.status === 'live' && p.url)
        ? `href="${p.url}" target="_blank"`
        : `onclick="goToCat('${p.category}')"`;
      return `<a class="search-result-item" ${attrs}>
        <div class="sri-icon">${iconEl}</div>
        <div class="sri-info">
          <div class="sri-title">${p.title}</div>
          <div class="sri-cat">${catName}</div>
        </div>
        <span class="sri-badge ${p.status === 'live' ? 'live' : 'soon'}">${p.status === 'live' ? '● Live' : '⏳ Soon'}</span>
      </a>`;
    }).join('');
  }
  box.classList.add('show');
}
function hideSearch() {
  document.getElementById('search-results')?.classList?.remove('show');
}
// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  applyMeta();
  renderAll();
  renderCatSelect();
  routeFromHash();

  // Wire up the triple-click trigger on the (otherwise empty) trigger dot.
  // The dot itself is just a tiny gold circle in the topbar — no admin
  // text, id, or onclick attribute is present in the public HTML.
  const adminDot = document.querySelector('.trigger-dot');
  if (adminDot) {
    adminDot.addEventListener('click', openAdminEntry);
  }

  // Restore unlock state: if the owner was already signed in, keep admin
  // mode accessible across refresh. The panel is NOT auto-opened — the
  // owner still triple-clicks the dot to open it (no password needed).
  if (isUnlocked()) {
    isAdmin = true;
    document.body.classList.add('admin-mode');
    setAdminDotColor('#22c55e');
    // Pre-build admin panel so it's instantly available, but keep it closed.
    buildAdminPanel();
    document.getElementById('adminStrip')?.classList?.add('visible');
  }
});
