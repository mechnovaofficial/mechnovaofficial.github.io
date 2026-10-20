(function () {
  "use strict";

  // Analytics is optional and loads only after the visitor accepts it.
  const MEASUREMENT_ID = "G-RQMMNJX9P2";
  const CONSENT_KEY = "mechnova_analytics_consent_v1";
  let memoryChoice = null;
  let analyticsLoaded = false;
  let banner = null;

  function getChoice() {
    try {
      const saved = window.localStorage.getItem(CONSENT_KEY);
      if (saved) return saved;
    } catch (_) {
      // Try session storage if persistent storage is unavailable.
    }
    try {
      const sessionSaved = window.sessionStorage.getItem(CONSENT_KEY);
      if (sessionSaved) return sessionSaved;
    } catch (_) {
      // Fall back to the in-memory choice for this page.
    }
    return memoryChoice;
  }

  function saveChoice(choice) {
    memoryChoice = choice;
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
    } catch (_) {
      // Persistent storage may be disabled by the browser.
    }
    try {
      window.sessionStorage.setItem(CONSENT_KEY, choice);
    } catch (_) {
      // Keep the selection in memory if all browser storage is disabled.
    }
  }

  function loadAnalytics() {
    if (analyticsLoaded || getChoice() !== "accepted") return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    script.onerror = function () {
      analyticsLoaded = false;
      console.warn("MechNova Analytics script could not load.");
    };
    document.head.appendChild(script);
  }

  window.mechnovaTrackEvent = function (eventName, parameters) {
    if (getChoice() !== "accepted") return;
    loadAnalytics();
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, parameters || {});
    }
  };

  function removeBanner() {
    if (banner && banner.isConnected) banner.remove();
    banner = null;
  }

  function showConsentBanner(force) {
    if (!document.body || banner) return;
    if (!force && getChoice()) return;

    const current = getChoice();
    const wrap = document.createElement("section");
    wrap.id = "mechnovaAnalyticsConsent";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-labelledby", "mechnovaAnalyticsTitle");
    wrap.setAttribute("aria-describedby", "mechnovaAnalyticsDescription");
    wrap.innerHTML =
      '<div class="mn-consent-copy">' +
        '<strong id="mechnovaAnalyticsTitle">Help improve MechNova?</strong>' +
        '<p id="mechnovaAnalyticsDescription">Optional analytics helps us understand page visits, promo-code copy clicks, video clicks and gear picks. No analytics tag loads unless you accept. You can change this choice later.</p>' +
        '<a href="/privacy-policy.html">Read the Privacy Policy</a>' +
      '</div>' +
      '<div class="mn-consent-actions">' +
        '<button type="button" class="mn-consent-accept">Accept analytics</button>' +
        '<button type="button" class="mn-consent-decline">Decline</button>' +
      '</div>';

    const style = document.createElement("style");
    style.textContent =
      '#mechnovaAnalyticsConsent{position:fixed;z-index:100000;left:16px;bottom:16px;width:min(480px,calc(100vw - 32px));display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:16px;border:1px solid #27658a;border-radius:15px;background:linear-gradient(145deg,#0b2339,#071321);color:#f2f8ff;box-shadow:0 16px 50px #0009;font:13px/1.55 Inter,Arial,sans-serif}' +
      '#mechnovaAnalyticsConsent .mn-consent-copy{min-width:0}' +
      '#mechnovaAnalyticsConsent strong{display:block;margin-bottom:5px;color:#8deaff;font-size:14px}' +
      '#mechnovaAnalyticsConsent p{margin:0 0 7px;color:#c2d4e2;font-size:12px;line-height:1.55}' +
      '#mechnovaAnalyticsConsent a{color:#8deaff;font-size:11px;font-weight:700;text-underline-offset:3px}' +
      '#mechnovaAnalyticsConsent .mn-consent-actions{display:flex;gap:8px;flex-wrap:wrap}' +
      '#mechnovaAnalyticsConsent button{min-height:38px;padding:9px 13px;border:1px solid #356481;border-radius:9px;background:#142b40;color:#eef8ff;font:700 12px Inter,Arial,sans-serif;cursor:pointer}' +
      '#mechnovaAnalyticsConsent .mn-consent-accept{border-color:#67e5ff;background:linear-gradient(100deg,#42d7f4,#a1eeff);color:#062031}' +
      '#mechnovaAnalyticsConsent button:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
      '@media(min-width:620px){#mechnovaAnalyticsConsent{grid-template-columns:minmax(0,1fr) auto;align-items:center}#mechnovaAnalyticsConsent .mn-consent-actions{flex-direction:column}}' +
      '@media(max-width:619px){#mechnovaAnalyticsConsent{left:8px;bottom:calc(8px + env(safe-area-inset-bottom));width:calc(100vw - 16px);max-height:42dvh;overflow-y:auto;padding:12px;border-radius:12px;gap:8px}#mechnovaAnalyticsConsent p{font-size:11px;line-height:1.4;margin-bottom:5px}#mechnovaAnalyticsConsent .mn-consent-actions{display:flex;flex-direction:row;gap:7px}#mechnovaAnalyticsConsent button{flex:1;min-height:36px;padding:8px 9px}}' +
      '@media(prefers-reduced-motion:reduce){#mechnovaAnalyticsConsent *{animation:none!important;transition:none!important}}';

    wrap.appendChild(style);
    document.body.appendChild(wrap);
    banner = wrap;

    wrap.querySelector(".mn-consent-accept").addEventListener("click", function () {
      saveChoice("accepted");
      removeBanner();
      loadAnalytics();
    });
    wrap.querySelector(".mn-consent-decline").addEventListener("click", function () {
      saveChoice("declined");
      removeBanner();
      if (typeof window.gtag === "function") {
        window.gtag("consent", "update", { analytics_storage: "denied" });
      }
    });
    if (current === "accepted") {
      wrap.querySelector(".mn-consent-accept").textContent = "Keep analytics on";
    } else if (current === "declined") {
      wrap.querySelector(".mn-consent-decline").textContent = "Keep analytics off";
    }
  }

  window.mechnovaManageAnalyticsConsent = function () {
    showConsentBanner(true);
    if (banner) {
      const accept = banner.querySelector(".mn-consent-accept");
      const decline = banner.querySelector(".mn-consent-decline");
      if (getChoice() === "accepted") accept.textContent = "Keep analytics on";
      if (getChoice() === "declined") decline.textContent = "Keep analytics off";
      banner.scrollIntoView({ block: "nearest" });
    }
  };

  document.addEventListener("click", function (event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const copyButton = target.closest(".promo-code-copy");
    if (copyButton) {
      const card = copyButton.closest(".code-card");
      const codeName = card && card.querySelector(".code-name");
      const grid = copyButton.closest("#allPlayersGrid,#newPlayersGrid,#expiredGrid");
      window.mechnovaTrackEvent("promo_code_copy_click", {
        promo_code: codeName ? codeName.textContent.trim() : "",
        player_type: grid && grid.id === "newPlayersGrid" ? "new_player" :
          grid && grid.id === "allPlayersGrid" ? "all_players" : "unknown"
      });
    }

    const affiliateCard = target.closest(".special-affiliate-card,.affiliate-card");
    const productLink = affiliateCard && target.closest("a[href]");
    if (affiliateCard && productLink) {
      const title = affiliateCard.querySelector("strong,h2,h3");
      window.mechnovaTrackEvent("affiliate_product_click", {
        product_name: title ? title.textContent.trim().slice(0, 100) : "Gaming gear",
        link_url: productLink.href || ""
      });
      return;
    }

    const link = target.closest("a[href]");
    if (link && /(?:^|\/)affiliate\.html(?:[?#]|$)/i.test(link.getAttribute("href") || "")) {
      window.mechnovaTrackEvent("affiliate_page_click", { link_url: link.href });
    }

    const videoLink = target.closest("#videos a.video-card,a[href*='youtube.com'],a[href*='youtu.be']");
    if (videoLink) {
      window.mechnovaTrackEvent("youtube_video_click", {
        video_title: (videoLink.querySelector("strong") || videoLink).textContent.trim().slice(0, 100),
        link_url: videoLink.href
      });
    }

    const packCard = target.closest("#packShowcase .showcase-pack-card");
    if (packCard) {
      const name = packCard.querySelector(".showcase-pack-name");
      const group = packCard.closest(".pack-showcase-group");
      window.mechnovaTrackEvent("pack_card_click", {
        pack_name: name ? name.textContent.trim().slice(0, 100) : "Unknown pack",
        pack_type: group && group.classList.contains("starter-showcase") ? "starter" :
          group && group.classList.contains("bonus-showcase") ? "bonus" : "unknown"
      });
    }

    const faqSummary = target.closest(".mn-faq-item summary,.faq-entry summary");
    if (faqSummary) {
      window.mechnovaTrackEvent("faq_question_click", {
        question: faqSummary.textContent.trim().slice(0, 120)
      });
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    const manageButton = document.getElementById("manageAnalyticsConsent");
    if (manageButton) {
      manageButton.addEventListener("click", window.mechnovaManageAnalyticsConsent);
    }
  });

  if (getChoice() === "accepted") loadAnalytics();
  else if (!getChoice()) showConsentBanner(false);
})();