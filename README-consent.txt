CONSENT SETUP (one-time, in your AdSense account)
1. AdSense > Privacy & messaging > European regulations > create a GDPR message
   (it is a Google-certified CMP that supports the IAB TCF). Select rdjpublishers.com.
2. Publish it. Google's script (already on your pages via adsbygoogle.js) shows it to EEA/UK/CH visitors.
3. assets/consent.js keeps Google Consent Mode defaults and the footer "Cookie settings" link;
   its own banner no longer appears automatically (USE_GOOGLE_CMP = true).
Alternative: use another Google-certified CMP (e.g. CookieYes), and keep USE_GOOGLE_CMP = true.
