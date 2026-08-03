/**
 * nav-sidebar.js
 * Loads partials/nav-sidebar.html into every admin page and wires up
 * all interactions (collapse/expand, mobile off-canvas, profile menu,
 * logout confirmation overlay, active-link highlighting).
 *
 * Usage (bottom of each admin page, right before </body>):
 *   <script src="assets/js/nav-sidebar.js"></script>
 *   <script>
 *     NavSidebar.init({
 *       basePath: "",              // relative path prefix to project root
 *       activePage: "dashboard",   // matches data-page on a sidebar link
 *       pageTitle: "Dashboard",    // shown in the top bar
 *       user: { name: "Aarav Shah", role: "Administrator", avatarUrl: "" }
 *     });
 *   </script>
 *
 * IMPORTANT (anti-flicker): pair this with the tiny inline script that
 * must sit in <head>, BEFORE any stylesheet — see snippet at the
 * bottom of this file / admin-template.html. That inline script reads
 * the collapsed state from localStorage and applies it to <html>
 * synchronously, so there is zero layout jump on first paint.
 */

(function (window, document) {
  "use strict";

  var STORAGE_KEY = "sidebarCollapsed";

  /**
   * The sidebar + top nav markup, embedded directly as a string.
   *
   * WHY NOT FETCH partials/nav-sidebar.html anymore:
   * VS Code Live Server's auto-reload script-injector corrupts/truncates
   * HTML fragment files that don't contain <html>/<body> tags (confirmed
   * via debug logging — the response was being cut mid-file every time).
   * Embedding the template here removes the fetch entirely, so there is
   * nothing for Live Server (or any dev server) to intercept or mangle.
   *
   * To edit nav links: edit this string. Every page that includes
   * nav-sidebar.js updates automatically, exactly like before —
   * partials/nav-sidebar.html is now just a readable reference copy,
   * it is no longer loaded at runtime.
   */
  var NAV_SIDEBAR_TEMPLATE = [
'<aside id="app-sidebar" class="app-sidebar">',
'  <div class="sidebar-brand">',
'    <a href="dashboard.html" class="sidebar-brand-link" aria-label="Go to dashboard">',
'      <img src="assets/Images/company-logo.png" alt="Company logo" class="sidebar-logo-full" />',
'      <img src="assets/Images/company-logo.png" alt="Company logo" class="sidebar-logo-mark" />',
'    </a>',
'    <button type="button" id="sidebar-collapse-btn" class="sidebar-collapse-btn" aria-label="Collapse sidebar" title="Collapse sidebar">',
'      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
'    </button>',
'  </div>',
'  <nav class="sidebar-nav" aria-label="Primary">',
'    <ul class="sidebar-nav-list">',
'      <li class="sidebar-nav-item">',
'        <a href="dashboard.html" class="sidebar-nav-link" data-page="dashboard">',
'          <span class="sidebar-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="16" width="7" height="5" rx="1.5"></rect></svg></span>',
'          <span class="sidebar-nav-label">Dashboard</span>',
'          <span class="sidebar-tooltip">Dashboard</span>',
'        </a>',
'      </li>',

'      <li class="sidebar-nav-divider" role="separator"></li>',
'      <li class="sidebar-nav-heading"><span>Tools</span></li>',
'      <li class="sidebar-nav-item">',
'        <a href="qr-generator.html" class="sidebar-nav-link" data-page="qr-generator">',
'          <span class="sidebar-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><path d="M14 14h3v3h-3z"></path><path d="M20 14h1v1h-1z"></path><path d="M14 20h1v1h-1z"></path><path d="M20 20h1v1h-1z"></path></svg></span>',
'          <span class="sidebar-nav-label">QR Generator</span>',
'          <span class="sidebar-tooltip">QR Generator</span>',
'        </a>',
'      </li>',
'    </ul>',

'  </nav>',
'  <hr>',
'    <div class="text-sm m-4 text-gray-600">© 2026 Kunash Media Solutions</div>',
'  <div class="sidebar-foot">',
'    <button type="button" id="sidebar-expand-btn" class="sidebar-expand-btn" aria-label="Expand sidebar" title="Expand sidebar">',
'      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
'    </button>',
'  </div>',
'</aside>',
'<div id="sidebar-backdrop" class="sidebar-backdrop" data-close-sidebar></div>',
'<header id="app-topbar" class="app-topbar">',
'  <div class="topbar-left">',
'    <button type="button" id="mobile-menu-btn" class="icon-btn mobile-only" aria-label="Open menu">',
'      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
'    </button>',
'    <h1 id="topbar-page-title" class="topbar-page-title">Dashboard</h1>',
'  </div>',
'  <div class="topbar-right">',

'    <div id="profile-menu" class="profile-menu">',
'      <button type="button" id="profile-trigger" class="profile-trigger" aria-haspopup="true" aria-expanded="false">',
'        <span class="profile-avatar">',
'          <img id="profile-avatar-img" src="" alt="" class="profile-avatar-img hidden" />',
'          <span id="profile-avatar-fallback" class="profile-avatar-fallback">A</span>',
'        </span>',
'        <span class="profile-meta desktop-only">',
'          <span id="profile-name" class="profile-name">Admin User</span>',
'          <span id="profile-role" class="profile-role">Administrator</span>',
'        </span>',
'        <svg class="profile-caret desktop-only" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
'      </button>',
'      <div id="profile-dropdown" class="profile-dropdown" role="menu">',
'        <div class="profile-dropdown-header">',
'          <span id="profile-dropdown-name" class="profile-dropdown-name">Admin User</span>',
'          <span id="profile-dropdown-role" class="profile-dropdown-role">Administrator</span>',
'        </div>',
'        <div class="profile-dropdown-divider"></div>',
'        <div class="profile-dropdown-divider"></div>',
'        <button type="button" id="logout-trigger" class="profile-dropdown-item profile-dropdown-item-danger" role="menuitem">',
'          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
'          <span>Logout</span>',
'        </button>',
'      </div>',
'    </div>',
'  </div>',
'</header>',
'<div id="mobile-nav-panel" class="mobile-nav-panel" aria-hidden="true"></div>',
'<div id="logout-overlay" class="confirm-overlay" aria-hidden="true">',
'  <div class="confirm-overlay-backdrop" data-close-logout></div>',
'  <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-dialog-title">',
'    <div class="confirm-dialog-icon">',
'      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
'    </div>',
'    <h2 id="logout-dialog-title" class="confirm-dialog-title">Log out?</h2>',
'    <p class="confirm-dialog-text">You\'ll need to sign in again to access the admin panel.</p>',
'    <div class="confirm-dialog-actions">',
'      <button type="button" id="logout-cancel-btn" class="confirm-btn confirm-btn-secondary">No, stay</button>',
'      <button type="button" id="logout-confirm-btn" class="confirm-btn confirm-btn-danger">Yes, logout</button>',
'    </div>',
'  </div>',
'</div>'
  ].join("\n");

  var NavSidebar = {
    _config: null,

    init: function (config) {
      this._config = Object.assign(
        {
          basePath: "",
          activePage: "",
          pageTitle: document.title || "",
          user: { name: "Admin User", role: "Administrator", avatarUrl: "" },
        },
        config || {}
      );

      try {
        this._inject(NAV_SIDEBAR_TEMPLATE);
        this._applyUser();
        this._applyActiveLink();
        this._bindCollapseToggle();
        this._bindMobileNav();
        this._bindProfileMenu();
        this._bindLogoutOverlay();
        this._paintReady();
      } catch (err) {
        console.error("[nav-sidebar] failed to render:", err);
        this._paintReady();
      }
    },

    _inject: function (html) {
      // <template> is the browser-native, spec-guaranteed way to parse
      // an HTML fragment string into real elements.
      var template = document.createElement("template");
      template.innerHTML = html;
      var doc = template.content;

      var sidebarRoot = document.getElementById("sidebar-root");
      var topbarRoot = document.getElementById("topbar-root");

      var sidebar = doc.getElementById("app-sidebar");
      var backdrop = doc.getElementById("sidebar-backdrop");
      var topbar = doc.getElementById("app-topbar");
      var mobilePanel = doc.getElementById("mobile-nav-panel");
      var logoutOverlay = doc.getElementById("logout-overlay");

      if (!sidebar || !topbar) {
        throw new Error(
          "nav-sidebar partial is missing #app-sidebar or #app-topbar. " +
          "Check that partials/nav-sidebar.html at your basePath is the actual partial " +
          "(not empty, not a 404/index.html fallback). See the console warning above for the fetched content."
        );
      }

      if (sidebarRoot) {
        sidebarRoot.replaceWith(sidebar);
      } else {
        document.body.appendChild(sidebar);
      }
      if (topbarRoot) {
        topbarRoot.replaceWith(topbar);
      } else {
        document.body.appendChild(topbar);
      }

      // Elements that aren't inside either placeholder get appended to body.
      if (backdrop) document.body.appendChild(backdrop);
      if (mobilePanel) document.body.appendChild(mobilePanel);
      if (logoutOverlay) document.body.appendChild(logoutOverlay);
    },

    _paintReady: function () {
      // Double rAF ensures the browser has committed layout for the
      // injected nodes before we fade them in — avoids any flash.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.documentElement.classList.add("nav-ready");
        });
      });
    },

    /* ---------------------------------------------------------------- */
    /* User info + page title                                            */
    /* ---------------------------------------------------------------- */
    _applyUser: function () {
      var user = this._config.user || {};
      var title = this._config.pageTitle;

      var setText = function (id, value) {
        var el = document.getElementById(id);
        if (el && value) el.textContent = value;
      };

      setText("profile-name", user.name);
      setText("profile-role", user.role);
      setText("profile-dropdown-name", user.name);
      setText("profile-dropdown-role", user.role);
      setText("topbar-page-title", title);

      if (user.avatarUrl) {
        var img = document.getElementById("profile-avatar-img");
        var fallback = document.getElementById("profile-avatar-fallback");
        if (img) {
          img.src = user.avatarUrl;
          img.classList.remove("hidden");
        }
        if (fallback) fallback.style.display = "none";
      } else if (user.name) {
        var fallbackEl = document.getElementById("profile-avatar-fallback");
        if (fallbackEl) fallbackEl.textContent = user.name.trim().charAt(0).toUpperCase();
      }

      if (title) document.title = title;
    },

    _applyActiveLink: function () {
      var page = this._config.activePage;
      if (!page) return;
      var links = document.querySelectorAll(".sidebar-nav-link[data-page]");
      links.forEach(function (link) {
        if (link.getAttribute("data-page") === page) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        }
      });
    },

    /* ---------------------------------------------------------------- */
    /* Collapse / expand (desktop) — persisted in localStorage           */
    /* ---------------------------------------------------------------- */
    _bindCollapseToggle: function () {
      var collapseBtn = document.getElementById("sidebar-collapse-btn");
      var expandBtn = document.getElementById("sidebar-expand-btn");

      function setCollapsed(isCollapsed) {
        document.documentElement.classList.toggle("sidebar-collapsed", isCollapsed);
        document.documentElement.classList.toggle("sidebar-expanded", !isCollapsed);
        try {
          localStorage.setItem(STORAGE_KEY, isCollapsed ? "true" : "false");
        } catch (e) {
          /* localStorage unavailable (private mode) — state just won't persist */
        }
      }

      if (collapseBtn) {
        collapseBtn.addEventListener("click", function () {
          setCollapsed(true);
        });
      }
      if (expandBtn) {
        expandBtn.addEventListener("click", function () {
          setCollapsed(false);
        });
      }
    },

    /* ---------------------------------------------------------------- */
    /* Mobile off-canvas sidebar                                         */
    /* ---------------------------------------------------------------- */
    _bindMobileNav: function () {
      var menuBtn = document.getElementById("mobile-menu-btn");
      var backdrop = document.getElementById("sidebar-backdrop");

      function open() {
        document.documentElement.classList.add("mobile-sidebar-open");
      }
      function close() {
        document.documentElement.classList.remove("mobile-sidebar-open");
      }

      if (menuBtn) menuBtn.addEventListener("click", open);
      if (backdrop) backdrop.addEventListener("click", close);

      // Close automatically after navigating (link tap) on mobile.
      document.querySelectorAll(".sidebar-nav-link").forEach(function (link) {
        link.addEventListener("click", close);
      });

      // Esc closes mobile sidebar.
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });

      window.addEventListener("resize", function () {
        if (window.innerWidth >= 1024) close();
      });
    },

    /* ---------------------------------------------------------------- */
    /* Profile dropdown (hover on desktop, tap-toggle on touch)          */
    /* ---------------------------------------------------------------- */
    _bindProfileMenu: function () {
      var menu = document.getElementById("profile-menu");
      var trigger = document.getElementById("profile-trigger");
      if (!menu || !trigger) return;

      function setOpen(isOpen) {
        menu.classList.toggle("open", isOpen);
        trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(!menu.classList.contains("open"));
      });

      document.addEventListener("click", function (e) {
        if (!menu.contains(e.target)) setOpen(false);
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setOpen(false);
      });
    },

    /* ---------------------------------------------------------------- */
    /* Logout confirmation overlay (Yes / No)                            */
    /* ---------------------------------------------------------------- */
    _bindLogoutOverlay: function () {
      var overlay = document.getElementById("logout-overlay");
      var openTrigger = document.getElementById("logout-trigger");
      var cancelBtn = document.getElementById("logout-cancel-btn");
      var confirmBtn = document.getElementById("logout-confirm-btn");
      var closeTargets = overlay ? overlay.querySelectorAll("[data-close-logout]") : [];
      if (!overlay || !openTrigger) return;

      function openOverlay() {
        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
      function closeOverlay() {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }

      openTrigger.addEventListener("click", function () {
        // Close any open profile dropdown first, then confirm.
        var menu = document.getElementById("profile-menu");
        if (menu) menu.classList.remove("open");
        openOverlay();
      });

      closeTargets.forEach(function (el) {
        el.addEventListener("click", closeOverlay);
      });
      if (cancelBtn) cancelBtn.addEventListener("click", closeOverlay);

      if (confirmBtn) {
        confirmBtn.addEventListener("click", function () {
          // TODO: wire this to auth.js once the JWT login/session module
          // is added — e.g. Auth.logout().then(() => redirect to login).
          NavSidebar.onLogoutConfirmed();
        });
      }

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && overlay.classList.contains("open")) closeOverlay();
      });
    },

    /**
     * Placeholder hook — replace with real JWT/session logout call.
     * Kept as a separate method so auth.js can simply do:
     *   NavSidebar.onLogoutConfirmed = function () { Auth.logout(); };
     */
    onLogoutConfirmed: function () {
      console.info("[nav-sidebar] logout confirmed — wire this to auth.js");
      window.location.href = (this._config.basePath || "") + "admin-login.html";
    },
  };

  window.NavSidebar = NavSidebar;
})(window, document);