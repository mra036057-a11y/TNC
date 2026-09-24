import { BackgroundKeepAlive } from '../services/backgroundKeepAlive';
import { playFridayReturnChime } from './fridaySounds';

export interface ResolvedAppAction {
  appName: string;
  title: string;
  description: string;
  badge: string;
  targetUrl: string;       // Web fallback
  nativeUri: string;       // App custom URI scheme (e.g. vnd.youtube:, whatsapp:, market:)
  androidIntent: string;   // Native Android Intent URI
  isNativeApp: boolean;
}

/**
 * Resolves user requests to native Android/iOS intents and app schemes.
 */
export function resolveMobileAppAction(
  appName: string,
  query?: string,
  action?: string
): ResolvedAppAction {
  const normApp = (appName || '').trim().toLowerCase();
  const normQuery = (query || '').trim();
  const isDownload =
    action === 'download' ||
    /download|install/i.test(appName) ||
    /download|install/i.test(normQuery);

  // 1. Google Play Store (Always Web Link, NEVER native app)
  // CRITICAL: ONLY match if Boss explicitly said 'Play Store' or 'PlayStore', or explicit download/install.
  // NEVER match generic searches or when platform is unspecified!
  const isExplicitPlayStore =
    normApp.includes('play store') ||
    normApp.includes('playstore') ||
    (normApp === 'store' && !normApp.includes('google') && !normApp.includes('chrome')) ||
    (isDownload && (normApp.includes('play') || normApp.includes('store') || normApp.includes('app') || normApp.includes('game')));

  if (isExplicitPlayStore) {
    const psUrl = normQuery
      ? `https://play.google.com/store/search?q=${encodeURIComponent(normQuery)}&c=apps`
      : 'https://play.google.com/store/apps';
    return {
      appName: 'Play Store',
      title: normQuery ? `Play Store: ${normQuery}` : 'Google Play Store Web',
      description: normQuery
        ? `Searching "${normQuery}" on Play Store Web`
        : 'Opening Play Store Web in Chrome',
      badge: 'Play Store Web',
      targetUrl: psUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(psUrl, true),
      isNativeApp: false, // Critical: Always web link, NEVER native app!
    };
  }

  // 2. YouTube (Always Web Link as instructed by Boss, NEVER native app)
  if (normApp.includes('youtube') || normApp.includes('video') || normApp.includes('yt')) {
    const ytWebUrl = normQuery
      ? `https://m.youtube.com/results?search_query=${encodeURIComponent(normQuery)}`
      : 'https://m.youtube.com';
    return {
      appName: 'YouTube',
      title: normQuery ? `YouTube: ${normQuery}` : 'YouTube Web',
      description: normQuery
        ? `Searching "${normQuery}" on YouTube web link`
        : 'Opening YouTube web link in Chrome',
      badge: 'YouTube Web Link',
      targetUrl: ytWebUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(ytWebUrl, true),
      isNativeApp: false, // Critical: Always false so Friday opens the web link and can return seamlessly!
    };
  }

  // 3. WhatsApp (Always Web Link, NEVER native app)
  if (normApp.includes('whatsapp') || normApp.includes('chat') || normApp.includes('msg')) {
    const waUrl = normQuery
      ? `https://web.whatsapp.com/send?text=${encodeURIComponent(normQuery)}`
      : 'https://web.whatsapp.com';
    return {
      appName: 'WhatsApp',
      title: normQuery ? `WhatsApp: ${normQuery}` : 'WhatsApp Web',
      description: normQuery
        ? `Opening WhatsApp Web to send "${normQuery}"`
        : 'Opening WhatsApp Web in Chrome',
      badge: 'WhatsApp Web',
      targetUrl: waUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(waUrl, true),
      isNativeApp: false,
    };
  }

  // 4. Google Maps (Always Web Link, NEVER native app)
  if (normApp.includes('map') || normApp.includes('navigation') || normApp.includes('location')) {
    const mapsUrl = normQuery
      ? `https://www.google.com/maps/search/${encodeURIComponent(normQuery)}`
      : 'https://www.google.com/maps';
    return {
      appName: 'Google Maps',
      title: normQuery ? `Maps: ${normQuery}` : 'Google Maps Web',
      description: `Opening Google Maps Web in Chrome`,
      badge: 'Google Maps Web',
      targetUrl: mapsUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(mapsUrl, true),
      isNativeApp: false,
    };
  }

  // 5. Spotify (Always Web Link, NEVER native app)
  if (normApp.includes('spotify') || normApp.includes('music') || normApp.includes('song') || normApp.includes('gaana')) {
    const spotifyUrl = normQuery
      ? `https://open.spotify.com/search/${encodeURIComponent(normQuery)}`
      : 'https://open.spotify.com';
    return {
      appName: 'Spotify',
      title: normQuery ? `Spotify: ${normQuery}` : 'Spotify Web Player',
      description: `Opening Spotify Web Player in Chrome`,
      badge: 'Spotify Web',
      targetUrl: spotifyUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(spotifyUrl, true),
      isNativeApp: false,
    };
  }

  // 6. Instagram (Always Web Link, NEVER native app)
  if (normApp.includes('instagram') || normApp.includes('insta')) {
    const instaUrl = normQuery
      ? `https://www.instagram.com/explore/tags/${encodeURIComponent(normQuery.replace(/\s+/g, ''))}`
      : 'https://www.instagram.com';
    return {
      appName: 'Instagram',
      title: normQuery ? `Instagram: ${normQuery}` : 'Instagram Web',
      description: `Opening Instagram Web in Chrome`,
      badge: 'Instagram Web',
      targetUrl: instaUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(instaUrl, true),
      isNativeApp: false,
    };
  }

  // 7. Calculator (Always Web Calculator, NEVER native app)
  if (normApp.includes('calculator') || normApp.includes('hisab') || normApp.includes('calc')) {
    const calcUrl = 'https://www.google.com/search?q=calculator';
    return {
      appName: 'Calculator',
      title: 'Web Calculator',
      description: 'Opening online interactive calculator in Chrome',
      badge: 'Web Calculator',
      targetUrl: calcUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(calcUrl, true),
      isNativeApp: false,
    };
  }

  // 8. Camera / Photos (Always Web, NEVER native app)
  if (normApp.includes('camera') || normApp.includes('photo') || normApp.includes('selfie')) {
    const camUrl = 'https://photos.google.com';
    return {
      appName: 'Photos / Camera',
      title: 'Google Photos Web',
      description: 'Opening Google Photos Web in Chrome',
      badge: 'Web App',
      targetUrl: camUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(camUrl, true),
      isNativeApp: false,
    };
  }

  // 9. Gallery / Photos (Always Web, NEVER native app)
  if (normApp.includes('gallery') || normApp.includes('photos')) {
    const galUrl = 'https://photos.google.com';
    return {
      appName: 'Gallery',
      title: 'Google Photos Web',
      description: 'Opening Google Photos Web in Chrome',
      badge: 'Web App',
      targetUrl: galUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(galUrl, true),
      isNativeApp: false,
    };
  }

  // 10. Settings (Google Account Settings Web, NEVER native app)
  if (normApp.includes('setting')) {
    const setUrl = 'https://myaccount.google.com';
    return {
      appName: 'Settings',
      title: 'Google Account Settings',
      description: 'Opening Google Account Settings Web in Chrome',
      badge: 'Web App',
      targetUrl: setUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(setUrl, true),
      isNativeApp: false,
    };
  }

  // 11. PhonePe (Always Web, NEVER native app)
  if (normApp.includes('phonepe') || normApp.includes('phone pe')) {
    const ppUrl = 'https://www.phonepe.com';
    return {
      appName: 'PhonePe',
      title: 'PhonePe Web',
      description: 'Opening PhonePe Web Portal in Chrome',
      badge: 'Web App',
      targetUrl: ppUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(ppUrl, true),
      isNativeApp: false,
    };
  }

  // 12. Google Pay / GPay (Always Web, NEVER native app)
  if (normApp.includes('google pay') || normApp.includes('gpay') || normApp.includes('g pay')) {
    const gpUrl = 'https://pay.google.com';
    return {
      appName: 'Google Pay',
      title: 'Google Pay Web',
      description: 'Opening Google Pay Web in Chrome',
      badge: 'Web App',
      targetUrl: gpUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(gpUrl, true),
      isNativeApp: false,
    };
  }

  // 13. Paytm (Always Web, NEVER native app)
  if (normApp.includes('paytm')) {
    const paytmUrl = 'https://paytm.com';
    return {
      appName: 'Paytm',
      title: 'Paytm Web',
      description: 'Opening Paytm Web in Chrome',
      badge: 'Web App',
      targetUrl: paytmUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(paytmUrl, true),
      isNativeApp: false,
    };
  }

  // 14. Telegram (Always Web, NEVER native app)
  if (normApp.includes('telegram') || normApp.includes('tg')) {
    const tgUrl = 'https://web.telegram.org';
    return {
      appName: 'Telegram',
      title: 'Telegram Web',
      description: 'Opening Telegram Web in Chrome',
      badge: 'Web App',
      targetUrl: tgUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(tgUrl, true),
      isNativeApp: false,
    };
  }

  // 15. Explicit Website / Domain or URL detection (e.g. google.com, wikipedia.org, https://...)
  const isDirectUrl = /^https?:\/\//i.test(normApp) || /^https?:\/\//i.test(normQuery);
  const domainPattern = /([a-z0-9-]+\.(com|in|org|net|io|co|ai|gov|edu|me|info|biz|tv|app))/i;
  const domainMatch = normApp.match(domainPattern) || normQuery.match(domainPattern);

  if (isDirectUrl || domainMatch) {
    let rawTarget = isDirectUrl
      ? (normApp.startsWith('http') ? normApp : normQuery)
      : (domainMatch ? domainMatch[0] : normApp);
    if (!/^https?:\/\//i.test(rawTarget)) {
      rawTarget = 'https://' + rawTarget;
    }
    const hostAndPath = rawTarget.replace(/^https?:\/\//i, '');
    const siteLabel = domainMatch ? domainMatch[1] : 'Website';

    return {
      appName: siteLabel,
      title: normQuery ? `${siteLabel}: ${normQuery}` : siteLabel,
      description: `Opening website ${rawTarget} in Chrome / Browser`,
      badge: 'Website',
      targetUrl: rawTarget,
      nativeUri: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`,
      androidIntent: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`,
      isNativeApp: false,
    };
  }

  // 16. Wikipedia
  if (normApp.includes('wikipedia') || normApp.includes('wiki')) {
    const q = normQuery || normApp.replace(/wikipedia|wiki/gi, '').trim();
    const targetUrl = q
      ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`
      : 'https://en.wikipedia.org';
    const hostAndPath = targetUrl.replace(/^https?:\/\//i, '');
    return {
      appName: 'Wikipedia',
      title: q ? `Wikipedia: ${q}` : 'Wikipedia',
      description: 'Opening Wikipedia in Chrome / Browser',
      badge: 'Website',
      targetUrl,
      nativeUri: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`,
      androidIntent: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`,
      isNativeApp: false,
    };
  }

  // 17. News Websites (Aaj Tak, NDTV, BBC, etc.)
  if (normApp.includes('aajtak') || normApp.includes('aaj tak') || normApp.includes('news')) {
    const q = normQuery;
    const targetUrl = q ? `https://www.aajtak.in/search?q=${encodeURIComponent(q)}` : 'https://www.aajtak.in';
    const hostAndPath = targetUrl.replace(/^https?:\/\//i, '');
    return {
      appName: 'Aaj Tak News',
      title: q ? `Aaj Tak: ${q}` : 'Aaj Tak News Website',
      description: 'Opening Aaj Tak news in Chrome / Browser',
      badge: 'Website',
      targetUrl,
      nativeUri: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`,
      androidIntent: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`,
      isNativeApp: false,
    };
  }

  // 18. Cricket Websites (Cricbuzz, ESPNcricinfo)
  if (normApp.includes('cricbuzz') || normApp.includes('cricket') || normApp.includes('score')) {
    const targetUrl = 'https://www.cricbuzz.com';
    const hostAndPath = 'www.cricbuzz.com';
    return {
      appName: 'Cricbuzz',
      title: 'Cricbuzz Live Cricket',
      description: 'Opening Cricbuzz in Chrome / Browser',
      badge: 'Website',
      targetUrl,
      nativeUri: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`,
      androidIntent: `intent://${hostAndPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`,
      isNativeApp: false,
    };
  }

  // 19. Generic Website Keywords ("website kholo", "koi website open karo", "web portal")
  if (
    normApp.includes('website') ||
    normApp.includes('site') ||
    normApp.includes('web') ||
    normApp.includes('portal') ||
    normApp.includes('link') ||
    normApp.includes('page')
  ) {
    const cleanedTarget = normApp
      .replace(/website|site|web|portal|link|page|kholo|open|chalu|karo|dikhao/gi, '')
      .trim();
    const effectiveQuery = normQuery || cleanedTarget;

    if (effectiveQuery) {
      const q = encodeURIComponent(effectiveQuery);
      return {
        appName: cleanedTarget ? `${cleanedTarget} Website` : 'Website Search',
        title: `Search: ${effectiveQuery}`,
        description: `Opening "${effectiveQuery}" website in Chrome / Browser`,
        badge: 'Website',
        targetUrl: `https://www.google.com/search?q=${q}`,
        nativeUri: `intent://www.google.com/search?q=${q}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`,
        androidIntent: `intent://www.google.com/search?q=${q}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`,
        isNativeApp: false,
      };
    }

    // Default: Open Google homepage
    return {
      appName: 'Web Browser',
      title: 'Google Web Portal',
      description: 'Opening website in Chrome / Browser',
      badge: 'Website',
      targetUrl: 'https://www.google.com',
      nativeUri: 'intent://www.google.com#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end',
      androidIntent: 'intent://www.google.com#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end',
      isNativeApp: false,
    };
  }

  // 20. Chrome / Google Search
  if (normApp.includes('google') || normApp.includes('chrome') || normApp.includes('search') || normApp.includes('browser')) {
    const q = normQuery || normApp.replace(/google|chrome|search|browser/gi, '').trim();
    if (q) {
      const qEnc = encodeURIComponent(q);
      return {
        appName: 'Google',
        title: `Google: ${q}`,
        description: `Searching Google for "${q}" in Chrome`,
        badge: 'Website',
        targetUrl: `https://www.google.com/search?q=${qEnc}`,
        nativeUri: `intent://www.google.com/search?q=${qEnc}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`,
        androidIntent: `intent://www.google.com/search?q=${qEnc}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`,
        isNativeApp: false,
      };
    }
    return {
      appName: 'Google',
      title: 'Google Search Portal',
      description: 'Opening Google in Chrome / Browser',
      badge: 'Website',
      targetUrl: 'https://www.google.com',
      nativeUri: 'intent://www.google.com#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end',
      androidIntent: 'intent://www.google.com#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end',
      isNativeApp: false,
    };
  }

  // 21. Default Search / Web Navigation (ALWAYS GOOGLE CHROME, NEVER PLAY STORE UNLESS EXPLICITLY DOWNLOAD)
  const cleanedName = appName.replace(/app|open|kholo|chalu|karo|website|search|dhoondho/gi, '').trim() || appName;
  const targetQuery = normQuery || cleanedName;
  
  if (isDownload) {
    const downloadQuery = targetQuery || 'Apps';
    const psUrl = `https://play.google.com/store/search?q=${encodeURIComponent(downloadQuery)}&c=apps`;
    return {
      appName: 'Play Store',
      title: `Play Store: ${downloadQuery}`,
      description: `Searching "${downloadQuery}" on Play Store Web`,
      badge: 'Play Store Web',
      targetUrl: psUrl,
      nativeUri: '',
      androidIntent: buildAndroidIntentUrl(psUrl, true),
      isNativeApp: false,
    };
  }

  // DEFAULT FOR ANY GENERAL SEARCH: GOOGLE IN CHROME
  const qEnc = encodeURIComponent(targetQuery || 'Google');
  const googleSearchUrl = targetQuery
    ? `https://www.google.com/search?q=${qEnc}`
    : 'https://www.google.com';

  return {
    appName: 'Google Chrome',
    title: targetQuery ? `Google: ${targetQuery}` : 'Google Chrome',
    description: targetQuery
      ? `Searching "${targetQuery}" on Google in Chrome`
      : 'Opening Google in Chrome',
    badge: 'Chrome Search',
    targetUrl: googleSearchUrl,
    nativeUri: '',
    androidIntent: buildAndroidIntentUrl(googleSearchUrl, true),
    isNativeApp: false, // Critical: Always web link, NEVER native app!
  };
}

/**
 * Windows / tabs opened by Friday
 */
const trackedWindows: Window[] = [];

export function trackOpenedWindow(win: Window | null) {
  if (win && !win.closed) {
    trackedWindows.push(win);
  }
}

/**
 * Closes any opened tabs / windows and returns focus to the Friday AI tab
 */
export function returnToFridayTab(): { closedCount: number } {
  let closedCount = 0;
  for (let i = trackedWindows.length - 1; i >= 0; i--) {
    const win = trackedWindows[i];
    try {
      if (win && !win.closed) {
        win.close();
        closedCount++;
      }
    } catch (e) {
      console.warn('[Friday] Error closing child tab:', e);
    }
  }
  trackedWindows.length = 0;

  // Signal service worker to focus Friday client immediately
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'FOCUS_FRIDAY' });
    } catch {}
  }

  // Broadcast to all opened child preview tabs to close themselves
  try {
    const bc = new BroadcastChannel('friday_system_channel');
    bc.postMessage({ action: 'RETURN_TO_FRIDAY', timestamp: Date.now() });
    setTimeout(() => {
      try { bc.close(); } catch {}
    }, 400);
  } catch (bcErr) {
    console.warn('[Friday] BroadcastChannel error:', bcErr);
  }

  // 1. Play unmistakable futuristic return chime & power chord
  try {
    playFridayReturnChime();
  } catch (err) {
    console.warn('[Friday] Return sound error:', err);
  }

  // 2. Bring current window to front in Chrome if permitted
  try {
    window.focus();
  } catch {}

  // 3. Trigger high-priority return notification on Android Chrome
  try {
    BackgroundKeepAlive.getInstance().showReturnNotification();
  } catch {}

  // 4. Haptic vibration feedback
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 150]);
    } catch {}
  }

  return { closedCount };
}

/**
 * Constructs an Android Intent URI for any URL to open in Chrome or the default Android browser.
 * This is crucial for Android WebViews (like HopWeb) where window.open('_blank') is blocked.
 */
export function buildAndroidIntentUrl(webUrl: string, preferChrome = false): string {
  if (!webUrl) return '';
  const trimmed = webUrl.trim();
  if (
    trimmed.startsWith('intent:') ||
    trimmed.startsWith('market:') ||
    trimmed.startsWith('vnd.') ||
    trimmed.startsWith('whatsapp:') ||
    trimmed.startsWith('spotify:') ||
    trimmed.startsWith('geo:')
  ) {
    return trimmed;
  }

  const match = trimmed.match(/^(https?):\/\/(.*)$/i);
  const scheme = match ? match[1].toLowerCase() : 'https';
  const hostAndPath = match ? match[2] : trimmed.replace(/^\/\//, '');

  if (preferChrome) {
    // Explicit Chrome browser package on Android with VIEW action, BROWSABLE category, and FLAG_ACTIVITY_NEW_TASK
    return `intent://${hostAndPath}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;launchFlags=0x10000000;end`;
  }
  // Generic browsable VIEW intent for Android OS with FLAG_ACTIVITY_NEW_TASK
  return `intent://${hostAndPath}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;launchFlags=0x10000000;end`;
}

/**
 * Checks if the current environment is an Android device or Android WebView
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

/**
 * Opens web destinations or searches in a new browser tab/window without navigating away
 * from the Friday AI tab, ensuring Friday remains connected and talking seamlessly.
 * Specially optimized for Google Chrome on Android & Desktop.
 */
export function launchMobileApp(action: {
  appName?: string;
  nativeUri?: string;
  androidIntent?: string;
  targetUrl?: string;
  url?: string;
  isNativeApp?: boolean;
}): { opened: boolean; url: string; androidIntent?: string } {
  const fallbackUrl = action.targetUrl || action.url || 'https://www.google.com';
  const isAndroid = isAndroidDevice();

  // CRITICAL MANDATE FROM BOSS:
  // ALWAYS open the web link / web view in Chrome browser!
  // NEVER open native installed apps (no market://, whatsapp://, native APK packages).
  action.isNativeApp = false;

  console.log('[Friday Universal Launcher] Launching Web Link:', action.appName || 'Destination', {
    targetUrl: fallbackUrl,
    isAndroid,
    isNativeApp: false,
  });

  // 1. Post notification for Home Screen / Background launches (1-tap access on Android)
  try {
    BackgroundKeepAlive.getInstance().showLaunchNotification(
      action.appName || 'Website',
      fallbackUrl,
      false
    );
  } catch (errNotif) {
    console.warn('[Friday Launcher] Notification alert failed:', errNotif);
  }

  let opened = false;

  // Determine best Android Chrome Intent for Android devices
  const intentUri = buildAndroidIntentUrl(fallbackUrl, true);

  // 2. FOR ALL WEBSITES & APPS (Always Web Link in Chrome):
  // Primary Strategy in Chrome: Open in named reusable window/tab 'FridayBrowsingView'
  // This ensures window reference is retained so returnToFridayTab can close it instantly!
  try {
    // Re-use named tab 'FridayBrowsingView' or open
    const newTab = window.open(fallbackUrl, 'FridayBrowsingView');
    if (newTab && !newTab.closed) {
      opened = true;
      trackOpenedWindow(newTab);
    }
  } catch (err) {
    console.warn('[Friday Launcher] window.open failed:', err);
  }

  // Fallback for Chrome popup blockers / strict WebViews: anchor click targeting FridayBrowsingView
  if (!opened) {
    try {
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.target = 'FridayBrowsingView';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      opened = true;
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 300);
    } catch (err2) {
      console.warn('[Friday Launcher] Fallback anchor click failed:', err2);
    }
  }

  // 3. Android Chrome Intent Fallback if browser blocked popup and device is Android
  if (!opened && isAndroid) {
    try {
      const intentLink = document.createElement('a');
      intentLink.href = intentUri;
      intentLink.style.display = 'none';
      document.body.appendChild(intentLink);
      intentLink.click();
      opened = true;
      setTimeout(() => {
        if (intentLink.parentNode) intentLink.parentNode.removeChild(intentLink);
      }, 300);
    } catch (errIntent) {
      console.warn('[Friday Launcher] Chrome Intent anchor click failed:', errIntent);
    }
  }

  // 4. Final Fallback anchor click
  if (!opened) {
    try {
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.target = 'FridayBrowsingView';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      opened = true;
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 300);
    } catch (err2) {
      console.warn('[Friday Launcher] Final fallback anchor click failed:', err2);
    }
  }

  // 5. If trigger occurred while document was hidden (user on Home Screen),
  // queue action so it immediately pops up the second Chrome is re-focused
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    setPendingBackgroundLaunch({
      appName: action.appName || 'Website',
      url: fallbackUrl,
      intentUri,
      isNativeApp: !!action.isNativeApp,
      timestamp: Date.now(),
    });
  }

  return { opened, url: fallbackUrl, androidIntent: intentUri };
}

export interface PendingBackgroundLaunch {
  appName: string;
  url: string;
  intentUri: string;
  isNativeApp: boolean;
  timestamp: number;
}

let activePendingLaunch: PendingBackgroundLaunch | null = null;

export function setPendingBackgroundLaunch(launch: PendingBackgroundLaunch) {
  activePendingLaunch = launch;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('friday-background-launch-queued', { detail: launch })
    );
  }
}

export function getPendingBackgroundLaunch(): PendingBackgroundLaunch | null {
  if (!activePendingLaunch) return null;
  // Expire after 2 minutes
  if (Date.now() - activePendingLaunch.timestamp > 120000) {
    activePendingLaunch = null;
    return null;
  }
  return activePendingLaunch;
}

export function clearPendingBackgroundLaunch() {
  activePendingLaunch = null;
}

