/* RDJ Publishers — consent handling (Google Consent Mode v2 + lightweight banner)
 * Load this BEFORE the gtag.js / adsbygoogle.js scripts on every page.
 *
 * - EEA / UK / Switzerland: analytics + ad storage default to "denied" until the visitor chooses.
 * - Everywhere else: defaults to "granted"; visitors can still opt out via "Cookie settings" in the footer.
 * - The banner is shown automatically when the browser time zone looks European (a heuristic, not
 *   geolocation). Google itself applies the region rules to the consent defaults below.
 *
 * NOTE: This is NOT a Google-certified CMP. Google requires a certified CMP to serve personalised
 * ads to EEA/UK/CH users. If you publish Google's free "Privacy & messaging" GDPR message in your
 * AdSense account, set USE_GOOGLE_CMP = true so this banner does not show twice.
 */
(function () {
  'use strict';

  var USE_GOOGLE_CMP = false;
  var KEY = 'rdj_consent_v1';
  var DAYS = 180;
  var POLICY_URL = '/privacy-policy.html';

  var REGIONS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU',
                 'MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (!window.gtag) { window.gtag = gtag; }

  function state(granted) {
    var v = granted ? 'granted' : 'denied';
    return {
      ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v,
      functionality_storage: 'granted', security_storage: 'granted'
    };
  }

  // Region-specific default (denied) + global default (granted). The more specific region rule wins.
  var eea = state(false); eea.region = REGIONS; eea.wait_for_update = 500;
  gtag('consent', 'default', eea);
  gtag('consent', 'default', state(true));

  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o.granted === 'boolean' && (Date.now() - o.t) < DAYS * 864e5) { return o; }
    } catch (e) {}
    return null;
  }
  function save(granted) {
    try { localStorage.setItem(KEY, JSON.stringify({ granted: granted, t: Date.now() })); } catch (e) {}
    gtag('consent', 'update', state(granted));
  }

  var stored = read();
  if (stored) { gtag('consent', 'update', state(stored.granted)); }

  function looksEuropean() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return /^Europe\//.test(tz) || /^Atlantic\/(Canary|Madeira|Azores|Reykjavik|Faroe)$/.test(tz);
    } catch (e) { return false; }
  }

  var CSS =
    '#rdj-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;' +
    'background:#fff;color:#0f1e1c;border:1px solid #cfe3df;border-radius:14px;padding:16px 18px;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.18);font:14px/1.5 "DM Sans",system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '#rdj-consent p{margin:0 0 12px}#rdj-consent a{color:#0b6e61;font-weight:600}' +
    '#rdj-consent .rdj-row{display:flex;gap:8px;flex-wrap:wrap}' +
    '#rdj-consent button{flex:1 1 140px;padding:10px 14px;border-radius:10px;border:1px solid #0b6e61;font:600 14px inherit;' +
    'font-family:inherit;cursor:pointer;min-height:44px}' +
    '#rdj-consent .rdj-yes{background:#0b6e61;color:#fff}#rdj-consent .rdj-no{background:#fff;color:#0b6e61}' +
    '#rdj-consent button:focus-visible{outline:3px solid #f5a623;outline-offset:2px}';

  function close() {
    var el = document.getElementById('rdj-consent');
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }

  function show() {
    if (document.getElementById('rdj-consent')) { return; }
    if (!document.getElementById('rdj-consent-css')) {
      var st = document.createElement('style'); st.id = 'rdj-consent-css'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var box = document.createElement('div');
    box.id = 'rdj-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.setAttribute('aria-label', 'Cookie consent');
    box.innerHTML =
      '<p>We use cookies for analytics and to show ads (Google Analytics and Google AdSense). ' +
      'You can accept or reject non-essential cookies; the tools work either way. ' +
      '<a href="' + POLICY_URL + '">Privacy Policy</a></p>' +
      '<div class="rdj-row"><button type="button" class="rdj-no">Reject non-essential</button>' +
      '<button type="button" class="rdj-yes">Accept all</button></div>';
    box.querySelector('.rdj-yes').onclick = function () { save(true); close(); };
    box.querySelector('.rdj-no').onclick = function () { save(false); close(); };
    document.body.appendChild(box);
  }

  // Footer "Cookie settings" link calls this so visitors can change their choice at any time.
  window.rdjOpenConsent = function () { show(); return false; };

  if (!USE_GOOGLE_CMP && !stored && looksEuropean()) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', show); }
    else { show(); }
  }
})();
