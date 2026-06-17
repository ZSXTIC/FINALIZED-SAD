
const root = document.querySelector("#app");

const service = createSupabaseService(APP_CONFIG);

const state = {
  theme: inferPreferredTheme(),
  isLoading: true,
  sessionUser: null,
  data: {
    categories: [],
    products: [],
    orders: [],
    notifications: [],
    users: [],
    feedbacks: []
  },
  ui: {
    portal: "user",
    authMode: "signin",
    catalogCategory: "all",
    showroomCategory: "all",
    catalogSearch: "",
    showroomSearch: "",
    userTab: "showroom",
    adminTab: "overview",
    activeSection: "introduction",
    previousSection: "introduction",
    orderModalProductId: null,
    paymentOrderId: null,
    productEditor: null,
    expandedAdminOrderId: null,
    expandedUserOrderId: null,
    orderChatMessages: [],
    reportMonth: todayMonthValue(),
    resetContext: null,
    flash: null,
    cart: [],
    isCartModalOpen: false,
    selectedCartItemIds: []
  }
};

const STATUS_TONES = {
  pending_review: "warning",
  approved_waiting_payment: "accent",
  paid_confirmed: "success",
  in_production: "accent",
  shipped: "info",
  delivered: "success",
  rejected: "danger"
};

const PAYMENT_TONES = {
  awaiting_approval: "warning",
  awaiting_payment: "accent",
  paid: "success",
  not_applicable: "muted"
};

function inferPreferredTheme() {
  const saved = localStorage.getItem('theme_preference');
  if (saved) return saved;
  return "light";
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme_preference', theme);
}

function normalizeSession(session) {
  if (!session) {
    return null;
  }

  return session.user || session;
}

function triggerFlash(message, tone = "info") {
  state.ui.flash = {
    id: uid("flash"),
    message,
    tone
  };
  render();
}

function clearFlash() {
  state.ui.flash = null;
  render();
}

function getCategoryMap() {
  return new Map(state.data.categories.map((category) => [category.id, category]));
}

function getProductById(productId) {
  return state.data.products.find((product) => product.id === productId) || null;
}

function getOrderById(orderId) {
  return state.data.orders.find((order) => order.id === orderId) || null;
}

function getDisplayAnalytics() {
  return deriveAnalytics({
    products: state.data.products,
    orders: state.data.orders
  });
}

function getUserScopedAnalytics() {
  return deriveAnalytics({
    products: state.data.products,
    orders: state.data.orders
  });
}

function filteredProducts(mode = "public") {
  const categoryId = mode === "public" ? state.ui.catalogCategory : state.ui.showroomCategory;
  const query = (mode === "public" ? state.ui.catalogSearch : state.ui.showroomSearch).trim().toLowerCase();
  const analytics = getDisplayAnalytics();

  return state.data.products
    .filter((product) => categoryId === "all" || product.categoryId === categoryId)
    .filter((product) => {
      if (!query) {
        return true;
      }

      const haystack = `${product.name} ${product.description} ${product.sustainabilityNote}`.toLowerCase();
      return haystack.includes(query);
    })
    .map((product) => ({
      ...product,
      isTopSeller: analytics.topSellerId === product.id
    }));
}

function activeOrdersForUser() {
  return state.data.orders
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function adminOrders() {
  return state.data.orders
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function makeOrderNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `INF-${now.getFullYear()}-${month}${day}-${suffix}`;
}

function formatStatusPill(status, toneMap = STATUS_TONES) {
  return `<span class="status-pill status-pill--${toneMap[status] || "muted"}">${escapeHtml(
    toSentenceCase(status)
  )}</span>`;
}

function renderFlash() {
  if (!state.ui.flash) {
    return "";
  }

  return `
    <aside class="flash flash--${state.ui.flash.tone}">
      <p>${escapeHtml(state.ui.flash.message)}</p>
      <button type="button" class="icon-button" data-action="dismiss-flash" aria-label="Dismiss message">×</button>
    </aside>
  `;
}

function renderHeader() {
  const session = state.sessionUser;
  
  let globalUnreadCount = 0;
  if (session && state.ui.allOrderMessages && state.data?.orders) {
    const chatOrders = session.role === "admin" ? state.data.orders : state.data.orders.filter(o => o.userId === session.id);
    chatOrders.forEach(o => {
      const oMsgs = state.ui.allOrderMessages.filter(m => m.orderId === o.id);
      const seenCount = parseInt(localStorage.getItem('chat_seen_' + o.id) || '0', 10);
      globalUnreadCount += Math.max(0, oMsgs.length - seenCount);
    });
  }

  return `
    <header class="site-header">
      <div class="brand-lockup brand-lockup--solo" data-action="reload-page" style="cursor: pointer;">
        <div class="brand-mark brand-mark--hero">
          <img src="./src/assets/logo.png" alt="Infinitee Studio Apparel Enterprise logo" />
        </div>
      </div>
      
      <!-- Section Navigation -->
      ${renderSectionNavigation()}
      
      <div class="header-actions">
        ${session ? `
        <button type="button" class="icon-button" data-action="toggle-global-chat" title="Open Global Chat" style="margin-right: 0.5rem; position: relative; width: auto; padding: 0 16px; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span style="font-size: 0.9rem; font-weight: 500;">Customer Service</span>
          ${globalUnreadCount > 0 ? `<span class="global-unread-badge" style="position: absolute; top: -4px; right: -4px; background: var(--danger); color: white; font-size: 0.7rem; font-weight: bold; border-radius: 999px; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${globalUnreadCount > 9 ? '9+' : globalUnreadCount}</span>` : ''}
        </button>
        ${session?.role !== "admin" ? `
        <button type="button" class="icon-button" data-action="toggle-cart" title="View Cart" style="margin-right: 0.5rem; position: relative; width: auto; padding: 0 16px; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <span style="font-size: 0.9rem; font-weight: 500;">Cart</span>
          ${(state.ui.cart?.length || 0) > 0 ? `<span style="position: absolute; top: -4px; right: -4px; background: var(--danger); color: #fff; font-size: 0.7rem; font-weight: bold; border-radius: 999px; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${state.ui.cart.length}</span>` : ''}
        </button>
        ` : ""}
        ` : ""}
        <button type="button" class="theme-toggle icon-button" data-action="toggle-theme" title="${state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}" style="width: auto; padding: 0 14px; gap: 6px;">
          ${state.theme === "dark" ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`}
          <span style="font-size: 0.85rem; font-weight: 500;">${state.theme === "dark" ? "Light" : "Dark"}</span>
        </button>
        ${
          session
            ? `
              <div class="session-pill" data-action="navigate-user-tab" data-tab="account" style="cursor: pointer;" title="Open Account Settings">
                <strong>${escapeHtml(session.fullName)}</strong>
                <span>${escapeHtml(session.role)}</span>
              </div>
              <button type="button" class="ghost-button" data-action="sign-out">Sign out</button>
            `
            : `
              <button type="button" class="ghost-button" data-action="navigate-section" data-section="login">Login portal</button>
            `
        }
      </div>
    </header>
  `;
}

function renderHero() {
  const analytics = getDisplayAnalytics();

  return `
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">Infinitee Studio Apparel Enterprise</p>
        <h2>Luxury printwear ordering with a sharper studio experience.</h2>
        <p class="hero-description">
          <strong>Future Direction</strong><br>
          In the future, infinitee studio aims to build a larger platform where more young creators can take part in apparel design, brand building, and product creation.<br><br>
          Through a structured system, we want to help people move from "having an idea" to "owning a brand."<br><br>
          <strong>Vision</strong><br>
          To become a platform that helps young creators turn ideas into brands.<br><br>
          <strong>Mission</strong><br>
          1. To provide simple and effective apparel design and production solutions<br>
          2. To help young creators build their own brands<br>
          3. To build a platform that can grow and scale over time
        </p>
        <div class="hero-actions">
          ${!state.sessionUser ? `
            <button type="button" class="primary-button" data-action="navigate-section" data-section="browsing">Explore the collection</button>
            <button type="button" class="secondary-button" data-action="navigate-section" data-section="login">Enter the portal</button>
          ` : `
            <button type="button" class="primary-button" data-action="navigate-section" data-section="workspace">Go to Workspace</button>
          `}
        </div>
      </div>
      <div class="hero-showcase">
        <div class="showcase-panel">
          <div class="showcase-glow"></div>
          <img class="hero-editorial" src="./src/assets/editorial-wave.jpeg" alt="Infinitee editorial showcase" />
          <div class="showcase-features">
            <div class="feature-card">
              <div class="feature-icon">🎨</div>
              <h4>Custom Design</h4>
              <p>Upload your artwork or create custom designs with our easy-to-use tools</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">👕</div>
              <h4>Quality Apparel</h4>
              <p>Premium materials and professional printing for lasting impressions</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🚀</div>
              <h4>Fast Delivery</h4>
              <p>Quick turnaround times with reliable shipping to your doorstep</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderEditorialSection() {
  return `
    <section class="editorial-section">
      <article class="editorial-feature editorial-feature--wide">
        <div class="editorial-copy">
          <p class="eyebrow">Studio direction</p>
          <h2>Built with a cleaner fashion presentation and stronger visual hierarchy.</h2>
          <p>
            The interface now leans into a more image-led apparel website rhythm with oversized frames,
            monochrome editorial surfaces, and larger visual anchors so the brand feels more premium.
          </p>
        </div>
        <img src="./src/assets/top-pic.jpg" alt="Editorial fashion composition for Infinitee PrintFlow DB" style="width: 100%; height: 100%; min-height: 24rem; object-fit: cover; object-position: center; border-radius: 28px; border: 1px solid var(--line); margin: 0;" />
      </article>
      <div class="editorial-grid">
        <article class="editorial-feature">
          <img src="./src/assets/bottom-pic.jpg" alt="Collection presentation and grid showcase" style="width: 100%; min-height: 100%; object-fit: cover; object-position: center; border-radius: 28px; border: 1px solid var(--line);" />
        </article>
        <article class="editorial-feature editorial-feature--copy">
          <p class="eyebrow">Visual commerce</p>
          <h3>Designed to feel closer to a real apparel brand website</h3>
          <p>
            Larger images, stronger contrast blocks, cleaner spacing, and more intentional visual storytelling
            help the platform feel less like a plain dashboard and more like a polished studio product.
          </p>
          <div class="hero-note">
            <span>Image-led storytelling</span>
            <span>Sharper product focus</span>
            <span>Cleaner dark and light modes</span>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderCapabilityStrip() {
  return `
    <section class="capability-strip">
      <article>
        <h3>Customer-first storefront</h3>
        <p>Category browsing, size clarity, product storytelling, and a premium shopping rhythm.</p>
      </article>
      <article>
        <h3>Approval-led custom design flow</h3>
        <p>Upload artwork, explain the concept, wait for moderation, and pay only after approval.</p>
      </article>
      <article>
        <h3>Admin intelligence</h3>
        <p>Track order health, manage products, identify top sellers, and print monthly summaries fast.</p>
      </article>
    </section>
  `;
}

function renderCompanyHistory() {
  return `
    <section class="company-history">
      <div class="history-content">
        <h2>Our Story</h2>
        <p class="history-subtitle">From humble beginnings to custom apparel excellence</p>
        <div class="history-timeline">
          <div class="history-item">
            <div class="history-year">2021</div>
            <div class="history-details">
              <h3>Foundation</h3>
              <p>Infinitee Studio was established in 2021 and is officially registered under the Companies Commission of Malaysia (SSM).</p>
            </div>
          </div>
          <div class="history-item">
            <div class="history-year">2021-Present</div>
            <div class="history-details">
              <h3>Our Journey</h3>
              <p>We started with design and apparel printing, focusing on T-shirt printing and custom apparel for local teams and emerging brands.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderCatalogCard(product, mode = "public") {
  const isLoggedInUser = state.sessionUser?.role === "user";
  const isAdmin = state.sessionUser?.role === "admin";
  const category = getCategoryMap().get(product.categoryId);

  return `
    <article class="product-card">
      <div class="product-card__media" style="cursor: pointer;" data-action="${isAdmin ? 'open-product-editor' : isLoggedInUser ? 'open-order-modal' : 'jump-auth'}" data-product-id="${product.id}" title="${isAdmin ? 'Edit Product' : 'Preview Product'}">
        ${product.isTopSeller ? `<span class="spotlight-badge">Top seller</span>` : ""}
        ${renderProductMedia(product)}
      </div>
      <div class="product-card__body">
        <div class="product-card__meta">
          <span>${escapeHtml(category?.name || "Apparel")}</span>
          <strong>${formatCurrency(product.price)}</strong>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-card__chips">
          ${product.sizes.map((size) => `<span>${escapeHtml(size)}</span>`).join("")}
        </div>
        <div class="product-card__footer">
          <small>${escapeHtml(product.leadTime)}</small>
          <button
            type="button"
            class="${mode === "showroom" ? "primary-button" : "secondary-button"}"
            data-action="${isAdmin ? "open-product-editor" : isLoggedInUser ? "open-order-modal" : "jump-auth"}"
            data-product-id="${product.id}"
          >
            ${isAdmin ? "Edit Product" : isLoggedInUser ? "Place order" : "Login to order"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderCatalogSection() {
  const products = filteredProducts("public");

  return `
    <section class="content-section" id="catalog-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Available collection</p>
          <h2>Browse studio-ready apparel and merchandising items</h2>
        </div>
        <form class="filter-form" data-form="catalog-filter">
          <label>
            <span>Category</span>
            <select name="category">
              <option value="all">All categories</option>
              ${state.data.categories
                .map(
                  (category) => `
                    <option value="${category.id}" ${state.ui.catalogCategory === category.id ? "selected" : ""}>
                      ${escapeHtml(category.name)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Search</span>
            <input name="query" value="${escapeHtml(state.ui.catalogSearch)}" placeholder="Search items or styles" />
          </label>
          <button type="submit" class="secondary-button">Apply</button>
        </form>
      </div>
      <div class="catalog-grid">
        ${products.map((product) => renderCatalogCard(product)).join("")}
      </div>
    </section>
  `;
}

function renderWorkflowSection() {
  return `
    <section class="workflow-section" id="workflow-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Integrated problem-solving strategy</p>
          <h2>How the PrintFlow journey works</h2>
        </div>
      </div>
      <div class="workflow-grid">
        <article>
          <span>01</span>
          <h3>Discover or customize</h3>
          <p>Customers can choose a ready-made product or propose a custom design with artwork upload.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Moderate responsibly</h3>
          <p>Admins review designs for quality, ethics, and sensitivity before any payment is collected.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Approve with clarity</h3>
          <p>Accepted orders receive an ETA, while rejected orders include a transparent, reasonable explanation.</p>
        </article>
        <article>
          <span>04</span>
          <h3>Pay and fulfill</h3>
          <p>Users complete card payment, receive notifications, and admins track fulfillment to completion.</p>
        </article>
      </div>
    </section>
  `;
}

function renderAuthPanel() {
  const portalLabel = state.ui.portal === "admin" ? "Admin portal" : "User portal";
  const isResetMode = state.ui.authMode === "reset";
  const showOtpStep = false;
  const adminPortal = state.ui.portal === "admin";

  return `
    <section class="portal-shell content-section" id="portal-section" style="position: relative;">

      <div class="portal-intro">
        <p class="eyebrow">Secure access</p>
        <h2>Dual login system for customers and administrators</h2>
        <p>
          Users can create accounts, browse products, submit custom design requests, and follow their order lifecycle.
          Administrators get a structured operations workspace with approvals, analytics, and reporting tools.
        </p>
        <div class="portal-switch">
          <button
            type="button"
            class="${classNames("secondary-button", state.ui.portal === "user" && "is-active")}"
            data-action="set-portal"
            data-portal="user"
          >
            User
          </button>
          <button
            type="button"
            class="${classNames("secondary-button", state.ui.portal === "admin" && "is-active")}"
            data-action="set-portal"
            data-portal="admin"
          >
            Admin
          </button>
        </div>
        ${
          `
            <div class="credential-card">
              <h3>Secure account access</h3>
              <p>Customers can sign in, create an account, reset their password, and continue managing orders and design submissions in one place.</p>
            </div>
          `
        }
      </div>
      <div class="portal-card">
        <div class="portal-card__tabs">
          <button type="button" class="${state.ui.authMode === "signin" ? "is-active" : ""}" data-action="set-auth-mode" data-mode="signin">Login</button>
        </div>
        <div class="portal-card__body">
          <p class="eyebrow">${escapeHtml(portalLabel)}</p>
          ${
            adminPortal
              ? `<p class="muted-copy">Admin accounts are curated through role promotion, so this portal is strictly for authorized sign-in and password recovery.</p>`
              : ""
          }
          ${
            state.ui.authMode === "signin"
              ? `
                <form data-form="signin">
                  <label>
                    <span>Email</span>
                    <input name="email" type="email" placeholder="name@example.com" required />
                  </label>
                  <label>
                    <span>Password</span>
                    <input name="password" type="password" placeholder="Enter password" required />
                  </label>
                  <button type="submit" class="primary-button">Login to ${escapeHtml(portalLabel)}</button>
                  <button type="button" class="ghost-button" data-action="close-login" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem; margin-top: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back to home
                  </button>
                  ${adminPortal ? "" : `<p class="auth-switch">Forgot password? <button type="button" class="link-button" data-action="set-auth-mode" data-mode="reset">Reset here</button></p>`}
                  <p class="auth-switch">Don't have an account? <button type="button" class="link-button" data-action="set-auth-mode" data-mode="register">Create one</button></p>
                </form>
              `
              : ""
          }
          ${
            state.ui.authMode === "register"
              ? `
                <form data-form="register">
                  <label>
                    <span>Full name</span>
                    <input name="fullName" placeholder="Enter your full name" required />
                  </label>
                  <label>
                    <span>Email</span>
                    <input name="email" type="email" placeholder="name@example.com" required />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input name="phone" placeholder="+60 ..." required />
                  </label>
                  <label>
                    <span>Password</span>
                    <input name="password" type="password" placeholder="Create password" required minlength="6" />
                  </label>
                  <label>
                    <span>Confirm password</span>
                    <input name="confirmPassword" type="password" placeholder="Repeat password" required minlength="6" />
                  </label>
                  <button type="submit" class="primary-button">Create user account</button>
                  <button type="button" class="ghost-button" data-action="close-login" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem; margin-top: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back to home
                  </button>
                  <p class="auth-switch">Already have an account? <button type="button" class="link-button" data-action="set-auth-mode" data-mode="signin">Login</button></p>
                </form>
              `
              : ""
          }
          ${
            isResetMode
              ? `
                <form data-form="${showOtpStep ? "reset-confirm" : "reset-request"}">
                  <label>
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value="${escapeHtml(state.ui.resetContext?.email || "")}"
                      ${showOtpStep ? "readonly" : ""}
                      required
                    />
                  </label>
                  ${
                    showOtpStep
                      ? `
                        <label>
                          <span>OTP code</span>
                          <input name="code" inputmode="numeric" placeholder="Enter 6-digit code" required />
                        </label>
                        <label>
                          <span>New password</span>
                          <input name="newPassword" type="password" placeholder="Create a new password" required minlength="6" />
                        </label>
                        <label>
                          <span>Confirm password</span>
                          <input name="confirmPassword" type="password" placeholder="Repeat the new password" required minlength="6" />
                        </label>
                      `
                      : ""
                  }
                  <button type="submit" class="primary-button">
                    ${showOtpStep ? "Confirm reset" : "Request reset"}
                  </button>
                </form>
                ${
                  showOtpStep
                    ? `
                      <div class="otp-panel">
                        <strong>Verification code</strong>
                        <span>${escapeHtml(state.ui.resetContext?.code || "------")}</span>
                        <p>Use the verification code above to complete the password reset process.</p>
                      </div>
                    `
                  : ""
                }
              `
              : ""
          }
        </div>
    </section>
  `;
}

function renderSectionNavigation() {
  if (state.sessionUser && state.sessionUser.role === "admin") {
    return "";
  }
  return `
    <nav class="section-nav">
      <button type="button" class="section-nav-btn ${state.ui.activeSection === 'introduction' ? 'is-active' : ''}" data-action="navigate-section" data-section="introduction">
        Introduction
      </button>
      ${state.sessionUser ? `
      <button type="button" class="section-nav-btn ${state.ui.activeSection === 'workspace' && state.ui.userTab === 'showroom' ? 'is-active' : ''}" data-action="navigate-user-tab" data-tab="showroom">
        Browse
      </button>
      <button type="button" class="section-nav-btn ${state.ui.activeSection === 'workspace' && state.ui.userTab === 'orders' ? 'is-active' : ''}" data-action="navigate-user-tab" data-tab="orders">
        Order History
      </button>
      <button type="button" class="section-nav-btn ${state.ui.activeSection === 'workspace' && state.ui.userTab === 'design' ? 'is-active' : ''}" data-action="navigate-user-tab" data-tab="design">
        Design Lab
      </button>
      ` : `
      <button type="button" class="section-nav-btn ${state.ui.activeSection === 'browsing' ? 'is-active' : ''}" data-action="navigate-section" data-section="browsing">
        Browse
      </button>
      <button type="button" class="section-nav-btn" data-action="navigate-section" data-section="design-lab">
        Design Lab
      </button>
      `}
      <button type="button" class="section-nav-btn ${state.ui.activeSection === 'workflow' ? 'is-active' : ''}" data-action="navigate-section" data-section="workflow">
        Workflow
      </button>
      ${state.sessionUser ? `
      <button type="button" class="section-nav-btn ${state.ui.activeSection === 'feedback' ? 'is-active' : ''}" data-action="navigate-section" data-section="feedback">
        Feedback
      </button>
      ` : ""}
    </nav>
  `;
}

function renderFeedbackSection() {
  return `
    <div class="portal-shell content-section" id="feedback-section">
      <div class="portal-intro">
        <p class="eyebrow">We value your opinion</p>
        <h2>Help us improve Infinitee PrintFlow DB</h2>
        <p>
          Your feedback is essential for us to create the best custom apparel platform. Share your thoughts, report issues, or suggest new features.
        </p>
        <div class="hero-note">
          <span>Your voice matters</span>
          <span>Every feedback helps us serve you better</span>
          <span>Continuous improvement is our commitment</span>
        </div>
      </div>
      
      <div class="split-layout">
        <div class="portal-card">
          <h3>Send us your feedback</h3>
          <form data-form="feedback">
            <div style="margin-bottom: 30px;">
              <label>
                <span>Your name</span>
                <input name="name" placeholder="Enter your name" required />
              </label>
            </div>
            <div style="margin-bottom: 30px;">
              <label>
                <span>Email address</span>
                <input name="email" type="email" placeholder="your.email@example.com" required />
              </label>
            </div>
            <div style="margin-bottom: 30px;">
              <label>
                <span>Feedback type</span>
                <select name="type" required>
                  <option value="">Select feedback type</option>
                  <option value="general">General feedback</option>
                  <option value="bug">Bug report</option>
                  <option value="feature">Feature request</option>
                  <option value="improvement">Improvement suggestion</option>
                  <option value="complaint">Complaint</option>
                  <option value="compliment">Compliment</option>
                </select>
              </label>
            </div>
            <div style="margin-bottom: 30px;">
              <label>
                <span>Subject</span>
                <input name="subject" placeholder="Brief description of your feedback" required />
              </label>
            </div>
            <div style="margin-bottom: 30px;">
              <label>
                <span>Your message</span>
                <input name="message" type="text" placeholder="Please share your detailed feedback here..." required />
              </label>
            </div>
            <div style="margin-bottom: 30px;">
              <label>
                <span>Priority</span>
                <select name="priority">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
            </div>
            <button type="submit" class="primary-button" style="margin-top: 2rem;">Send Feedback</button>
          </form>
        </div>
        
        <div class="portal-card">
          <h3>Other ways to reach us</h3>
          <div class="contact-info">
            <article>
              <h4>Email Support</h4>
              <p>ryankanginnchin@gmail.com</p>
              <p>We respond within 24 hours</p>
            </article>
            <article>
              <h4>Phone Support</h4>
              <p>+60189480830</p>
              <p>Mon-Fri, 9AM-6PM EST</p>
            </article>
            <article>
              <h4>Live Chat</h4>
              <p>Available on weekdays</p>
              <p>Instant help for urgent issues</p>
            </article>
            <article>
              <h4>Visit Us</h4>
              <p>Infinitee Studio</p>
              <p>Ipoh, Perak</p>
            </article>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPublicLanding() {
  const activeSection = state.ui.activeSection;
  
  return `
    <main class="page-shell">
      ${activeSection === 'introduction' ? `
        <section id="introduction-section" class="content-section">
          ${renderHero()}
          ${renderCapabilityStrip()}
          ${renderCompanyHistory()}
        </section>
      ` : ''}
      
      ${activeSection === 'browsing' ? `
        <section id="browsing-section" class="content-section">
          ${renderEditorialSection()}
          ${renderCatalogSection()}
        </section>
      ` : ''}
      
      ${activeSection === 'workflow' ? `
        <section id="workflow-section" class="content-section">
          ${renderWorkflowSection()}
        </section>
      ` : ''}
      
      ${activeSection === 'design-lab' ? `
        <section id="design-lab-section" class="content-section">
          ${renderDesignLab()}
        </section>
      ` : ''}
      
      ${activeSection === 'login' ? `
        <section id="login-section" class="content-section">
          ${renderAuthPanel()}
        </section>
      ` : ''}
      
      ${activeSection === 'feedback' ? `
        <section id="feedback-section" class="content-section">
          ${renderFeedbackSection()}
        </section>
      ` : ''}
    </main>
  `;
}

function renderUserSummary() {
  const analytics = getUserScopedAnalytics();
  const unreadNotifications = state.data.notifications.filter((notification) => !notification.read).length;

  return `
    <section class="dashboard-summary">
      <article>
        <span>Orders submitted</span>
        <strong>${state.data.orders.length}</strong>
      </article>
      <article>
        <span>Awaiting approval</span>
        <strong>${analytics.pendingApprovals}</strong>
      </article>
      <article>
        <span>Awaiting payment</span>
        <strong>${analytics.awaitingPayment}</strong>
      </article>
    </section>
  `;
}

function renderUserTabs() {
  return ""; // Removed as per user request to move them to header
}

function renderUserShowroom() {
  const products = filteredProducts("showroom");

  return `
    <section class="content-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">User showroom</p>
          <h2>Order ready-made apparel or start a custom project</h2>
        </div>
        <form class="filter-form" data-form="showroom-filter">
          <label>
            <span>Category</span>
            <select name="category">
              <option value="all">All categories</option>
              ${state.data.categories
                .map(
                  (category) => `
                    <option value="${category.id}" ${state.ui.showroomCategory === category.id ? "selected" : ""}>
                      ${escapeHtml(category.name)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Search</span>
            <input name="query" value="${escapeHtml(state.ui.showroomSearch)}" placeholder="Search the showroom" />
          </label>
          <button type="submit" class="secondary-button">Apply</button>
        </form>
      </div>
      <div class="catalog-grid">
        ${products.map((product) => renderCatalogCard(product, "showroom")).join("")}
      </div>
    </section>
  `;
}

function renderChatMessagesList(messages) {
  if (messages.length === 0) {
    return '<p class="muted-copy" style="text-align: center;">No messages yet. Start the conversation!</p>';
  }
  return messages.map(m => `
    <div class="chat-message ${m.userId === state.sessionUser.id ? 'is-own' : 'is-other'}">
      <div class="chat-message-meta">
        <span>${escapeHtml(m.senderName)}</span>
        <span>${formatDate(m.createdAt)}</span>
      </div>
      <div class="chat-bubble">${escapeHtml(m.message)}</div>
    </div>
  `).join('');
}

function renderChatBox(orderId) {
  const messages = state.ui.orderChatMessages;
  return `
    <div class="chat-container">
      <div class="chat-header">Order Collaboration Chat</div>
      <div class="chat-messages" id="chat-messages-${orderId}">
        ${messages === null 
          ? '<p class="muted-copy" style="text-align: center;">Loading messages...</p>' 
          : renderChatMessagesList(messages)}
      </div>
      <form class="chat-input-area" data-action="submit-chat-message" data-order-id="${orderId}">
        <input type="text" name="message" placeholder="Type a message..." required autocomplete="off" />
        <button type="submit" class="primary-button">Send</button>
      </form>
    </div>
  `;
}

function renderUserOrders() {
  const orders = activeOrdersForUser();

  if (!orders.length) {
    return `
      <section class="content-section empty-state">
        <h2>No orders yet</h2>
        <p>Your submitted orders will appear here once you place one from the showroom or the design lab.</p>
      </section>
    `;
  }

  const standardOrders = orders.filter(o => o.orderType !== 'custom_design');
  const customOrders = orders.filter(o => o.orderType === 'custom_design');

  const renderOrderList = (orderList) => `
    <div style="overflow-x: auto; background: var(--surface-1); border: 1px solid var(--line); border-radius: var(--radius-md);">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--line); background: var(--surface-soft); color: var(--text-2);">
            <th style="padding: 0.85rem 1rem; font-weight: 500;">Order #</th>
            <th style="padding: 0.85rem 1rem; font-weight: 500;">Product</th>
            <th style="padding: 0.85rem 1rem; font-weight: 500;">Details</th>
            <th style="padding: 0.85rem 1rem; font-weight: 500;">Status</th>
            <th style="padding: 0.85rem 1rem; font-weight: 500; text-align: right;">Total</th>
            <th style="padding: 0.85rem 1rem; font-weight: 500; text-align: center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${orderList
            .map(
              (order) => `
                <tr style="border-bottom: 1px solid var(--line);">
                  <td style="padding: 1rem; font-family: var(--font-mono); font-size: 0.85rem;">${escapeHtml(order.orderNumber)}</td>
                  <td style="padding: 1rem; vertical-align: top;">
                    <strong style="display: block; margin-bottom: 0.2rem; font-size: 0.95rem;">${escapeHtml(order.productName)}</strong>
                    ${order.designDescription ? `<div style="font-size: 0.8rem; color: var(--text-2); margin-top: 0.3rem;"><strong>Note:</strong> ${escapeHtml(order.designDescription)}</div>` : ""}
                    ${order.adminNote ? `<div style="font-size: 0.8rem; color: var(--text-2); margin-top: 0.3rem;"><strong>Admin:</strong> ${escapeHtml(order.adminNote)}</div>` : ""}
                  </td>
                  <td style="padding: 1rem; color: var(--text-2); vertical-align: top;">
                    ${escapeHtml(order.size)}${order.color ? ` · ${escapeHtml(order.color)}` : ""}
                    <br>Qty ${order.quantity}
                  </td>
                  <td style="padding: 1rem; vertical-align: top;">
                    <div style="display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-start;">
                      ${formatStatusPill(order.status)}
                      ${formatStatusPill(order.paymentStatus, PAYMENT_TONES)}
                      ${order.etaText ? `<span style="font-size: 0.75rem; color: var(--text-2); margin-top: 0.2rem;">${escapeHtml(order.etaText)}</span>` : ""}
                      ${order.rejectionReason ? `<span style="font-size: 0.75rem; color: var(--danger); margin-top: 0.2rem;">${escapeHtml(order.rejectionReason)}</span>` : ""}
                    </div>
                  </td>
                  <td style="padding: 1rem; text-align: right; font-weight: 600; vertical-align: top;">
                    ${formatCurrency(order.totalPrice)}
                  </td>
                  <td style="padding: 1rem; text-align: center; vertical-align: top;">
                    <div style="display: flex; flex-direction: column; gap: 0.4rem; align-items: center;">
                      <button type="button" class="secondary-button" data-action="toggle-user-order" data-order-id="${order.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; width: 100%; white-space: nowrap;">
                        ${state.ui.expandedUserOrderId === order.id ? "Hide Chat" : "Chat"}
                      </button>
                      ${
                        order.status === "approved_waiting_payment" && order.orderType === "custom_design"
                          ? `
                            <button type="button" class="primary-button" data-action="open-payment-modal" data-order-id="${order.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; width: 100%; white-space: nowrap;">
                              Pay
                            </button>
                          `
                          : ""
                      }
                    </div>
                  </td>
                </tr>
                ${state.ui.expandedUserOrderId === order.id ? `
                  <tr style="border-bottom: 1px solid var(--line);">
                    <td colspan="6" style="padding: 1.5rem; background: var(--surface-soft);">
                      ${renderChatBox(order.id)}
                    </td>
                  </tr>
                ` : ""}
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  return `
    <section style="width: 100%;">
      <div style="flex: 1; min-width: 0;">
        ${standardOrders.length ? `
          <div id="standard-orders-section" class="content-section" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="margin: 0; font-family: var(--font-display);">Your Orders</h3>
              <button type="button" class="secondary-button" onclick="const other = document.getElementById('custom-orders-section'); if(other) other.style.display='none'; window.print(); if(other) other.style.display='block';" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print
              </button>
            </div>
            ${renderOrderList(standardOrders)}
          </div>
        ` : ''}

        ${customOrders.length ? `
          <div id="custom-orders-section" class="content-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="margin: 0; font-family: var(--font-display);">Your Design</h3>
              <button type="button" class="secondary-button" onclick="const other = document.getElementById('standard-orders-section'); if(other) other.style.display='none'; window.print(); if(other) other.style.display='block';" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print
              </button>
            </div>
            ${renderOrderList(customOrders)}
          </div>
        ` : ''}
      </div>
    </section>
  `;
}

function renderNotifications() {
  if (!state.data.notifications.length) {
    return `<p class="muted-copy">No notifications yet.</p>`;
  }

  return state.data.notifications
    .map(
      (notification) => `
        <article class="notification-item ${notification.read ? "" : "notification-item--unread"}">
          <div>
            <strong>${escapeHtml(notification.title)}</strong>
            <p>${escapeHtml(notification.message)}</p>
            <small>${formatDate(notification.createdAt)}</small>
          </div>
          ${
            !notification.read
              ? `<button type="button" class="secondary-button" data-action="mark-notification" data-notification-id="${notification.id}">Mark as read</button>`
              : ""
          }
        </article>
      `
    )
    .join("");
}

function renderDesignLab() {
  if (!state.sessionUser) {
    return `
      <section class="content-section" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; text-align: center;">
        <h2 style="margin-bottom: 1rem; font-family: var(--font-display);">Login is required</h2>
        <p style="color: var(--text-2); margin-bottom: 2rem;">You must be logged in to access the Design Lab.</p>
        <button type="button" class="primary-button" data-action="navigate-section" data-section="login">Go to Login</button>
      </section>
    `;
  }

  return `
    <section class="split-layout">
      <div class="content-section">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Design suggestion studio</p>
            <h2>Upload custom apparel concepts for admin review</h2>
          </div>
        </div>
        <form class="stack-form" data-form="custom-order">
          <div class="form-grid">
            <label>
              <span>Base product</span>
              <select name="productId" required>
                ${state.data.products
                  .map(
                    (product) => `
                      <option value="${product.id}">
                        ${escapeHtml(product.name)} · ${formatCurrency(product.price)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label>
              <span>Size</span>
              <input name="size" placeholder="M, L, XL..." required />
            </label>
            <label>
              <span>Color</span>
              <input name="color" placeholder="e.g. Pink, Blue (Optional)" />
            </label>
            <label>
              <span>Quantity</span>
              <input name="quantity" type="number" min="1" value="1" required />
            </label>
            <label>
              <span>Design title</span>
              <input name="designTitle" placeholder="Campaign Tee 2026" required />
            </label>
          </div>
          <label>
            <span>Design description</span>
            <textarea name="designDescription" rows="4" placeholder="Describe the artwork, placement, colors, and intent." required></textarea>
          </label>
          <label>
            <span>Upload concept image</span>
            <input name="designFile" type="file" accept="image/*" required />
          </label>
          <button type="submit" class="primary-button">Submit custom design request</button>
        </form>
      </div>
      <aside class="content-section content-section--muted">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Responsible submission rules</p>
            <h2>Quality, accessibility, and ethical safeguards</h2>
          </div>
        </div>
        <ul class="bullet-list">
          <li>Do not upload hateful, explicit, plagiarized, or legally sensitive content.</li>
          <li>Use clear, high-resolution visuals so admins can review the concept accurately.</li>
          <li>Made-to-order approval helps avoid unnecessary inventory waste.</li>
          <li>Payment only opens after approval, keeping the process transparent for customers.</li>
        </ul>
      </aside>
    </section>
  `;
}

function renderAccountTab() {
  const user = state.sessionUser;

  return `
    <section class="content-section" style="max-width: 500px; margin: 0 auto; width: 100%;">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Profile settings</p>
          <h2>Keep your account information current</h2>
        </div>
      </div>
      <form class="stack-form" data-form="profile">
        <label>
          <span>Full name</span>
          <input name="fullName" value="${escapeHtml(user.fullName)}" required />
        </label>
        <label>
          <span>Email</span>
          <input value="${escapeHtml(user.email)}" readonly />
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" value="${escapeHtml(user.phone || "")}" required />
        </label>
        <button type="submit" class="primary-button">Save profile</button>
      </form>
    </section>
  `;
}

function renderUserWorkspace() {
  let activePanel = "";

  switch (state.ui.userTab) {
    case "orders":
      activePanel = renderUserOrders();
      break;
    case "design":
      activePanel = renderDesignLab();
      break;
    case "account":
      activePanel = renderAccountTab();
      break;
    case "showroom":
    default:
      activePanel = renderUserShowroom();
      break;
  }

  return `
    <main class="page-shell workspace-shell">
      ${state.ui.userTab !== 'account' ? `
      <section class="workspace-hero">
        <div>
          <p class="eyebrow">Customer workspace</p>
          <h2>Welcome back, ${escapeHtml(state.sessionUser.fullName)}</h2>
          <p>Track requests, pay approved orders, and collaborate on custom apparel concepts with the studio team.</p>
        </div>
      </section>
      ${state.ui.userTab !== 'orders' ? renderEditorialSection() : ''}
      ${renderUserSummary()}
      ` : ''}
      ${renderUserTabs()}
      ${activePanel}
    </main>
  `;
}

function renderAdminSummary() {
  const analytics = getDisplayAnalytics();
  const report = getMonthlyReport(state.data.orders, state.ui.reportMonth);

  return `
    <section class="dashboard-summary">
      <article>
        <span>Total paid revenue</span>
        <strong>${formatCurrency(analytics.totalRevenue)}</strong>
      </article>
      <article>
        <span>Pending approvals</span>
        <strong>${analytics.pendingApprovals}</strong>
      </article>
      <article>
        <span>Active fulfillment</span>
        <strong>${analytics.activeOrders}</strong>
      </article>
      <article>
        <span>Monthly orders</span>
        <strong>${report.orderCount}</strong>
      </article>
    </section>
  `;
}

function renderAdminTabs() {
  return `
    <div class="workspace-tabs">
        <button type="button" class="${state.ui.adminTab === "overview" ? "is-active" : ""}" data-action="set-admin-tab" data-tab="overview">Overview</button>
        <button type="button" class="${state.ui.adminTab === "products" ? "is-active" : ""}" data-action="set-admin-tab" data-tab="products">Products</button>
        <button type="button" class="${state.ui.adminTab === "orders" ? "is-active" : ""}" data-action="set-admin-tab" data-tab="orders">Design Approval</button>
        <button type="button" class="${state.ui.adminTab === "report" ? "is-active" : ""}" data-action="set-admin-tab" data-tab="report">Order Management</button>
        <button type="button" class="${state.ui.adminTab === "feedbacks" ? "is-active" : ""}" data-action="set-admin-tab" data-tab="feedbacks">Customer Feedbacks</button>
      </div>
  `;
}

function renderTopSellerList() {
  const analytics = getDisplayAnalytics();
  if (!analytics.bestSellers.length) {
    return `<p class="muted-copy">No paid orders yet.</p>`;
  }

  return `
    <div class="metric-list">
      ${analytics.bestSellers
        .slice(0, 5)
        .map(
          (item, index) => `
            <article>
              <span>${index + 1}. ${escapeHtml(item.productName)}</span>
              <strong>${item.quantity} units</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderFeedbacksPanel() {
  const feedbacks = state.data.feedbacks || [];
  
  if (feedbacks.length === 0) {
    return `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5; margin-bottom: 1rem;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <h3>No Feedbacks Yet</h3>
        <p>When customers submit feedback, it will appear here.</p>
      </div>
    `;
  }

  return `
    <div style="background: var(--surface-1); border-radius: var(--radius-lg); border: 1px solid var(--line); overflow: hidden;">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: var(--surface-soft); border-bottom: 1px solid var(--line); text-align: left;">
            <th style="padding: 1rem; font-weight: 600; font-size: 0.85rem; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em;">Date</th>
            <th style="padding: 1rem; font-weight: 600; font-size: 0.85rem; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em;">Customer</th>
            <th style="padding: 1rem; font-weight: 600; font-size: 0.85rem; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em;">Type / Subject</th>
            <th style="padding: 1rem; font-weight: 600; font-size: 0.85rem; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em;">Message</th>
          </tr>
        </thead>
        <tbody>
          ${feedbacks.map(fb => `
            <tr style="border-bottom: 1px solid var(--line); transition: background 0.2s ease;">
              <td style="padding: 1rem; color: var(--text-2); font-size: 0.9rem; white-space: nowrap;">
                ${new Date(fb.createdAt).toLocaleDateString()}
              </td>
              <td style="padding: 1rem;">
                <div style="font-weight: 500;">${escapeHtml(fb.userName)}</div>
                <div style="font-size: 0.85rem; color: var(--text-3);">${escapeHtml(fb.userEmail)}</div>
              </td>
              <td style="padding: 1rem;">
                <span class="status-pill status-pill--${fb.type === 'bug' ? 'danger' : fb.type === 'feature' ? 'info' : 'muted'}">${escapeHtml(toSentenceCase(fb.type))}</span>
                <div style="margin-top: 0.5rem; font-weight: 500;">${escapeHtml(fb.subject)}</div>
                <div style="margin-top: 0.2rem; font-size: 0.85rem; color: var(--text-3);">Rating: ${fb.rating}/5</div>
              </td>
              <td style="padding: 1rem; font-size: 0.9rem; color: var(--text-1); max-width: 300px;">
                <div style="white-space: pre-wrap;">${escapeHtml(fb.message)}</div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderOverviewPanel() {
  const analytics = getDisplayAnalytics();
  const latestOrders = adminOrders().slice(0, 4);

  return `
    <section class="split-layout">
      <div class="content-section">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Operations overview</p>
            <h2>Revenue, best sellers, and approval workload</h2>
          </div>
        </div>
        <div class="overview-grid">
          <article class="metric-panel">
            <h3>Best sellers</h3>
            ${renderTopSellerList()}
          </article>
          <article class="metric-panel">
            <h3>Fulfillment pulse</h3>
            <div class="metric-stack">
              <div><span>Awaiting payment</span><strong>${analytics.awaitingPayment}</strong></div>
              <div><span>In production</span><strong>${adminOrders().filter((order) => order.status === "in_production").length}</strong></div>
              <div><span>Shipped</span><strong>${adminOrders().filter((order) => order.status === "shipped").length}</strong></div>
            </div>
          </article>
        </div>
      </div>
      <aside class="content-section">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Recent requests</p>
            <h2>Latest order activity</h2>
          </div>
        </div>
        <div class="metric-list">
          ${latestOrders
            .map(
              (order) => `
                <article>
                  <span>${escapeHtml(order.orderNumber)} · ${escapeHtml(order.productName)}</span>
                  <strong>${escapeHtml(toSentenceCase(order.status))}</strong>
                </article>
              `
            )
            .join("")}
        </div>
      </aside>
    </section>
  `;
}

function renderProductsPanel() {
  return `
    <section class="content-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Product management</p>
          <h2>Add, edit, or remove collection items</h2>
        </div>
        <button type="button" class="primary-button" data-action="open-product-editor">Add new product</button>
      </div>
      <div class="catalog-grid">
        ${state.data.products
          .map(
            (product) => `
              <article class="product-card">
                <div class="product-card__media" style="cursor: pointer;" data-action="open-order-modal" data-product-id="${product.id}" title="Click to preview customer view">${renderProductMedia(product)}</div>
                <div class="product-card__body">
                  <div class="product-card__meta">
                    <span>${escapeHtml(getCategoryMap().get(product.categoryId)?.name || "Apparel")}</span>
                    <strong>${formatCurrency(product.price)}</strong>
                  </div>
                  <h3>${escapeHtml(product.name)}</h3>
                  <p>${escapeHtml(product.description)}</p>
                  <div class="product-card__chips">
                    <span>Stock: ${product.stock}</span>
                    ${product.featured ? `<span>Featured</span>` : ""}
                  </div>
                  <div class="product-card__footer">
                    <button type="button" class="secondary-button" data-action="edit-product" data-product-id="${product.id}">Edit</button>
                    <button type="button" class="ghost-button ghost-button--danger" data-action="delete-product" data-product-id="${product.id}">Delete</button>
                  </div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderOrderAdminForm(order) {
  const usersById = new Map(state.data.users.map((user) => [user.id, user]));
  const owner = usersById.get(order.userId);

  return `
    <article class="order-card product-card ${state.ui.expandedAdminOrderId === order.id ? "order-card--expanded" : ""}">
      <div class="product-card__media">
      ${
        order.designImageUrl
          ? `<img class="design-preview" style="object-fit: cover;" src="${escapeHtml(order.designImageUrl)}" alt="Submitted custom design preview" />`
          : (getProductById(order.productId)?.imageUrl
            ? `<img class="design-preview" style="object-fit: cover; background: #fff;" src="${escapeHtml(getProductById(order.productId).imageUrl)}" alt="${escapeHtml(order.productName)}" />`
            : renderProductIllustration({ id: `${order.id}-admin`, name: order.productName, visualKey: order.visualKey }))
      }
        <div class="spotlight-badge">${formatStatusPill(order.status)}</div>
      </div>
      <div class="product-card__body">
        <div class="order-card__header" style="flex-direction: column; align-items: flex-start; gap: 0;">
          <p class="eyebrow">${escapeHtml(order.orderNumber)}</p>
          <h3 style="font-size: 1.1rem; line-height: 1.2;">${escapeHtml(order.productName)}</h3>
        </div>
        <div class="product-card__meta">
          <span>${escapeHtml(owner?.fullName || order.userId)}</span>
          <span>${escapeHtml(order.orderType)}</span>
          <span style="width: 100%;">Size: ${escapeHtml(order.size)}${order.color ? `, Color: ${escapeHtml(order.color)}` : ""}</span>
          <span>${formatCurrency(order.totalPrice)}</span>
          <span style="width: 100%;">${formatStatusPill(order.paymentStatus, PAYMENT_TONES)}</span>
        </div>
        <div style="background: var(--surface-soft); padding: 0.75rem; border-radius: var(--radius-sm); margin-top: 0.5rem; font-size: 0.85rem; border: 1px solid var(--line);">
          ${order.designDescription ? `<div style="margin-bottom: 0.5rem;"><strong style="color: var(--text-2); display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.2rem;">Customer Comment:</strong> ${escapeHtml(order.designDescription)}</div>` : ''}
          ${order.adminNote ? `<div><strong style="color: var(--text-2); display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.2rem;">Admin Note:</strong> ${escapeHtml(order.adminNote)}</div>` : ''}
          ${!order.designDescription && !order.adminNote ? `<div style="color: var(--text-muted); font-style: italic;">No additional context provided.</div>` : ''}
        </div>
        <div class="product-card__footer" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
          ${order.status === 'pending_review' ? `
          <div style="display: flex; gap: 0.5rem; width: 100%;">
            <button type="button" class="primary-button" data-action="accept-design-order" data-order-id="${order.id}" style="flex: 1;">
              Accept
            </button>
            <button type="button" class="ghost-button" data-action="reject-design-order" data-order-id="${order.id}" style="flex: 1; color: #d32f2f; border: 1px solid #d32f2f; background: transparent;">
              Reject
            </button>
          </div>
          ` : ''}
          <button type="button" class="secondary-button" data-action="toggle-admin-order" data-order-id="${order.id}" style="width: 100%;">
            ${state.ui.expandedAdminOrderId === order.id ? "Hide controls" : "Review order"}
          </button>
        </div>
        ${
          state.ui.expandedAdminOrderId === order.id
            ? `
            <form class="stack-form order-admin-form" data-form="admin-order-update" data-order-id="${order.id}">
              <div class="form-grid">
                <label>
                  <span>Status</span>
                  <select name="status">
                    ${[
                      "pending_review",
                      "approved_waiting_payment",
                      "paid_confirmed",
                      "in_production",
                      "shipped",
                      "delivered",
                      "rejected"
                    ]
                      .map(
                        (value) => `
                          <option value="${value}" ${order.status === value ? "selected" : ""}>
                            ${escapeHtml(toSentenceCase(value))}
                          </option>
                        `
                      )
                      .join("")}
                  </select>
                </label>
                <label>
                  <span>Payment status</span>
                  <select name="paymentStatus">
                    ${["awaiting_approval", "awaiting_payment", "paid", "not_applicable"]
                      .map(
                        (value) => `
                          <option value="${value}" ${order.paymentStatus === value ? "selected" : ""}>
                            ${escapeHtml(toSentenceCase(value))}
                          </option>
                        `
                      )
                      .join("")}
                  </select>
                </label>
              </div>
              <label>
                <span>ETA or delivery note</span>
                <input name="etaText" value="${escapeHtml(order.etaText || "")}" placeholder="Estimated delivery: 5 working days" />
              </label>
              <label>
                <span>Admin note</span>
                <textarea name="adminNote" rows="3" placeholder="Provide helpful status context">${escapeHtml(order.adminNote || "")}</textarea>
              </label>
              <label>
                <span>Rejection reason</span>
                <textarea name="rejectionReason" rows="2" placeholder="Required if rejected">${escapeHtml(order.rejectionReason || "")}</textarea>
              </label>
              <button type="submit" class="primary-button">Save order update</button>
            </form>
            ${renderChatBox(order.id)}
          `
          : ""
      }
      </div>
    </article>
  `;
}

function renderOrdersPanel() {
  return `
    <section class="content-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Design Approval</p>
          <h2>Review incoming design requests and collaborate with customers</h2>
        </div>
      </div>
        <div class="product-grid">
          ${adminOrders().filter(o => o.orderType === 'custom_design').map((order) => renderOrderAdminForm(order)).join("")}
        </div>
    </section>
  `;
}



function renderReportPanel() {
  const report = getMonthlyReport(state.data.orders, state.ui.reportMonth);

  return `
    <section class="content-section report-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Order management</p>
          <h2>Generate a month-level view of performance and best sellers</h2>
        </div>
        <form class="report-toolbar" data-form="report-filter">
          <label>
            <span>Reporting month</span>
            <input type="month" name="month" value="${escapeHtml(state.ui.reportMonth)}" required />
          </label>
          <button type="submit" class="secondary-button">Load report</button>
          <button type="button" class="primary-button" data-action="print-report">Print report</button>
        </form>
      </div>
      <div class="report-sheet" id="report-sheet" data-month="${escapeHtml(state.ui.reportMonth)}">
        <div class="dashboard-summary">
          <article>
            <span>Total transactions</span>
            <strong>${report.orderCount}</strong>
          </article>
          <article>
            <span>Total value</span>
            <strong>${formatCurrency(report.totalRevenue)}</strong>
          </article>
          <article>
            <span>Paid orders</span>
            <strong>${report.paidCount}</strong>
          </article>
          <article>
            <span>Best seller</span>
            <strong>${escapeHtml(report.bestSeller?.name || "No sales yet")}</strong>
          </article>
        </div>
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                report.filtered.length
                  ? report.filtered
                      .map((order) => {
                        const user = state.data.users.find((entry) => entry.id === order.userId);
                        return `
                          <tr>
                            <td>${escapeHtml(order.orderNumber)}</td>
                            <td>${escapeHtml(user?.fullName || order.userId)}</td>
                            <td>${escapeHtml(order.productName)}${order.orderType === 'custom_design' ? ' (Design)' : ''}</td>
                            <td>${escapeHtml(toSentenceCase(order.status))}</td>
                            <td>${escapeHtml(toSentenceCase(order.paymentStatus))}</td>
                            <td>${formatCurrency(order.totalPrice)}</td>
                          </tr>
                        `;
                      })
                      .join("")
                  : `
                    <tr>
                      <td colspan="6">No transactions for this month.</td>
                    </tr>
                  `
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderAdminWorkspace() {
  let activePanel = "";

  switch (state.ui.adminTab) {
    case "products":
      activePanel = renderProductsPanel();
      break;
    case "orders":
      activePanel = renderOrdersPanel();
      break;
    case "report":
      activePanel = renderReportPanel();
      break;
    case "feedbacks":
      activePanel = renderFeedbacksPanel();
      break;
    case "overview":
    default:
      activePanel = renderOverviewPanel();
      break;
  }

  return `
    <main class="page-shell workspace-shell">
      <section class="workspace-hero">
        <div>
          <p class="eyebrow">Admin command center</p>
          <h2>Monitor the full apparel workflow from catalog to monthly reporting</h2>
          <p>Manage products, review design-led orders, issue ETAs, and surface the top-selling items of the month.</p>
        </div>
      </section>
      ${renderEditorialSection()}
      ${renderAdminSummary()}
      ${renderAdminTabs()}
      ${activePanel}
    </main>
  `;
}

function renderOrderModal() {
  if (!state.ui.orderModalProductId) {
    return "";
  }

  const product = getProductById(state.ui.orderModalProductId);

  if (!product) {
    return "";
  }

  return `
    <div class="modal-backdrop">
      <div class="modal-shell">
        <button type="button" class="icon-button modal-close" data-action="close-modal" aria-label="Close order form">×</button>
        <div class="modal-shell__grid">
          <div id="main-product-media" style="position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--color-surface); width: 100%;">
            ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; display: block;" />` : `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${renderProductIllustration(product)}</div>`}
          </div>
          <div>
            <p class="eyebrow">${escapeHtml(getCategoryMap().get(product.categoryId)?.name || "Apparel")}</p>
            <h2>${escapeHtml(product.name)}</h2>
            <p>${escapeHtml(product.description)}</p>
            ${product.specs && Object.keys(product.specs).length > 0 ? `
              <div style="margin-top: 1.5rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 12px; font-size: 0.95rem; color: var(--color-foreground);">
                ${product.specs.size ? `
                <div style="display: flex; gap: 12px; align-items: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-muted);"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"/><path d="M6 6v4"/><path d="M10 6v4"/><path d="M14 6v4"/><path d="M18 6v4"/></svg>
                  <span>${escapeHtml(product.specs.size)}</span>
                </div>` : ''}
                ${product.specs.weight ? `
                <div style="display: flex; gap: 12px; align-items: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-muted);"><rect x="4" y="5" width="16" height="14" rx="2" ry="2"/><path d="M12 9v2"/><path d="M12 15h.01"/><path d="M8 15h.01"/><path d="M16 15h.01"/></svg>
                  <span>${escapeHtml(product.specs.weight)}</span>
                </div>` : ''}
                ${product.specs.material ? `
                <div style="display: flex; gap: 12px; align-items: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-muted);"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
                  <span>${escapeHtml(product.specs.material)}</span>
                </div>` : ''}
                ${product.specs.weave ? `
                <div style="display: flex; gap: 12px; align-items: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                  <span>${escapeHtml(product.specs.weave)}</span>
                </div>` : ''}
                ${product.specs.colors ? `
                <div style="display: flex; gap: 12px; align-items: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-muted);"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                  <span>${escapeHtml(product.specs.colors)}</span>
                </div>` : ''}
              </div>
            ` : ""}
            <p class="lead-copy">${formatCurrency(product.price)}</p>
            ${product.colors && product.colors.length > 0 ? `
              <div style="display: flex; gap: 8px; margin-bottom: 1rem; overflow-x: auto;">
                ${product.imageUrl ? `
                  <img src="${escapeHtml(product.imageUrl)}" alt="Default" title="Default" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border); cursor: pointer;" onclick="document.querySelector('#main-product-media').innerHTML = '<img src=\\'${escapeHtml(product.imageUrl)}\\' style=\\'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; display: block;\\' />'" />
                ` : ""}
                ${product.colors.filter(c => c.imageUrl).map(c => `
                  <img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.name)}" title="${escapeHtml(c.name)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border); cursor: pointer;" onclick="document.querySelector('#main-product-media').innerHTML = '<img src=\\'${escapeHtml(c.imageUrl)}\\' style=\\'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; display: block;\\' />'" />
                `).join("")}
              </div>
            ` : ""}
            <form class="stack-form" data-form="standard-order" data-product-id="${product.id}">
              <div class="form-grid">
                ${product.colors && product.colors.length > 0 ? `
                <label>
                  <span>Color</span>
                  <select name="color" required onchange="window.handleColorChange('${product.id}', this.value)">
                    ${product.colors.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("")}
                  </select>
                </label>
                ` : ""}
                <label>
                  <span id="color-stock-label-${product.id}">Size (In stock: ${escapeHtml((product.colors?.[0]?.sizes?.[0]?.stock) ?? 0)})</span>
                  <select name="size" id="size-select-${product.id}" required onchange="window.handleSizeChange('${product.id}', this)">
                    ${(product.colors?.[0]?.sizes || (product.sizes || []).map(s => ({name: s, stock: 0}))).map(s => `<option value="${escapeHtml(s.name)}" data-stock="${escapeHtml(s.stock ?? 0)}" ${s.stock <= 0 ? 'disabled' : ''}>${escapeHtml(s.name)}${s.stock <= 0 ? ' (Out of stock)' : ''}</option>`).join("")}
                  </select>
                </label>
              </div>
              ${state.sessionUser?.role !== "admin" ? `
              <label>
                <span>Quantity</span>
                <input id="qty-input-${product.id}" name="quantity" type="number" min="1" value="1" max="${escapeHtml((product.colors?.[0]?.sizes?.[0]?.stock) ?? '')}" required />
              </label>
              <label>
                <span>Notes for admin</span>
                <textarea name="notes" rows="3" placeholder="Optional instructions or event details"></textarea>
              </label>
              <input type="hidden" name="actionType" id="actionType-${product.id}" value="cart">
              <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="submit" class="primary-button" style="flex: 1;" onclick="document.getElementById('actionType-${product.id}').value='checkout'">Place Order</button>
                <button type="submit" class="secondary-button" style="flex: 1;" onclick="document.getElementById('actionType-${product.id}').value='cart'">Add to Cart</button>
              </div>
              ` : `
              <div style="margin-top: 1rem; padding: 1rem; background: var(--color-background-soft); border-radius: 8px; text-align: center;">
                <p style="color: var(--color-muted); font-size: 0.9rem;">Admin Preview Mode</p>
              </div>
              `}
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGlobalChatModal() {
  if (!state.ui.globalChatOpen) return "";
  
  const session = state.sessionUser;
  if (!session) return "";

  let chatOrders = [];
  if (state.data && state.data.orders) {
    if (session.role === "admin") {
      chatOrders = state.data.orders;
    } else {
      chatOrders = state.data.orders.filter(o => o.userId === session.id);
    }
  }

  chatOrders.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  const activeOrderId = state.ui.globalChatActiveOrderId;
  const activeOrder = activeOrderId ? chatOrders.find(o => o.id === activeOrderId) : null;

  return `
    <div class="modal-backdrop" style="align-items: center; justify-content: center; padding: 2rem; z-index: 9999; backdrop-filter: blur(8px); background: rgba(0,0,0,0.6);">
      <div class="modal-shell global-chat-modal" style="width: 90vw; max-width: 1000px; height: 80vh; max-height: 800px; display: flex; flex-direction: row; padding: 0; overflow: hidden; background: var(--surface-0); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
        
        <div class="chat-sidebar" style="width: 320px; border-right: 1px solid var(--line); display: flex; flex-direction: column; background: var(--surface-1);">
          <div style="padding: 1rem; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Customer Service
            </h3>
            <button type="button" class="icon-button modal-close" data-action="toggle-global-chat" style="position: static; padding: 0.2rem;">x</button>
          </div>
          <div class="chat-list" style="overflow-y: auto; flex: 1;">
            ${chatOrders.length === 0 ? '<p class="muted-copy" style="padding: 1rem; text-align: center;">No orders found.</p>' : ''}
            ${chatOrders.map(o => {
              const oMsgs = state.ui.allOrderMessages?.filter(m => m.orderId === o.id) || [];
              const seenCount = parseInt(localStorage.getItem('chat_seen_' + o.id) || '0', 10);
              const unreadCount = Math.max(0, oMsgs.length - seenCount);
              const lastMsg = oMsgs.length > 0 ? oMsgs[oMsgs.length - 1] : null;
              let senderText = session.role === "admin" && state.data.users ? (state.data.users.find(u => u.id === (o.userId || o.user_id))?.fullName || "Customer") : "Studio Team";
              if (lastMsg) {
                senderText = lastMsg.senderName;
                if (lastMsg.userId === session.id) senderText = "Me";
              }
              return `
              <div class="chat-list-item ${activeOrderId === o.id ? 'is-active' : ''}" data-action="select-global-chat-order" data-order-id="${o.id}" style="padding: 1rem; border-bottom: 1px solid var(--line); cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem; background: ${activeOrderId === o.id ? 'var(--surface-hover)' : 'transparent'}; border-left: ${activeOrderId === o.id ? '3px solid var(--accent)' : '3px solid transparent'}; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${escapeHtml(o.orderNumber || o.order_number)}</strong>
                  ${unreadCount > 0 ? `<div class="unread-badge" style="background: var(--danger); color: white; font-size: 0.7rem; font-weight: bold; border-radius: 999px; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; line-height: 1;">${unreadCount > 9 ? '9+' : unreadCount}</div>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px;">
                  <span style="font-size: 0.85rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${escapeHtml(o.productName || o.product_name || "Custom Order")}</span>
                  <span style="font-size: 0.75rem; color: var(--text-3); font-weight: 500;">${escapeHtml(senderText)}</span>
                </div>
              </div>
            `}).join("")}
          </div>
        </div>

        <div class="chat-main" id="chat-main-container" style="flex: 1; display: flex; flex-direction: column; background: var(--surface-0);">
          ${renderGlobalChatRightPane()}
        </div>
      </div>
    </div>
  `;
}

function renderGlobalChatRightPane() {
  const session = state.sessionUser;
  let chatOrders = [];
  if (state.data && state.data.orders) {
    if (session.role === "admin") {
      chatOrders = state.data.orders;
    } else {
      chatOrders = state.data.orders.filter(o => o.userId === session.id);
    }
  }
  const activeOrderId = state.ui.globalChatActiveOrderId;
  const activeOrder = activeOrderId ? chatOrders.find(o => o.id === activeOrderId) : null;

  if (!activeOrder) {
    return `
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--text-2);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.5;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <p>Select a conversation from the left to start messaging.</p>
      </div>
    `;
  }

  return `
    <div style="padding: 1rem; border-bottom: 1px solid var(--line); background: var(--surface-1);">
      <h3 style="margin: 0; font-size: 1.1rem;">${escapeHtml(activeOrder.orderNumber || activeOrder.order_number)} - ${escapeHtml(activeOrder.productName || activeOrder.product_name)}</h3>
    </div>
    <div style="flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; height: 100%;">
      ${renderChatBox(activeOrder.id)}
    </div>
  `;
}

function renderPaymentModal() {
  if (!state.ui.paymentOrderId) {
    return "";
  }

  let orderTitle = "";
  let orderTotal = 0;
  let orderIdRaw = state.ui.paymentOrderId;

  if (state.ui.paymentState === 'success' || state.ui.paymentState === 'processing') {
    if (state.ui.paymentSuccessData) {
      orderTitle = state.ui.paymentSuccessData.title;
      orderTotal = state.ui.paymentSuccessData.totalPrice;
    }
  } else {
    let order;
    if (state.ui.paymentOrderId === "pending") {
      order = state.ui.pendingOrderPayload;
    } else if (state.ui.paymentOrderId === "cart") {
      const selectedItemIds = state.ui.selectedCartItemIds || [];
      const selectedItems = (state.ui.cart || []).filter(item => selectedItemIds.includes(item.id));
      order = {
        productName: `Cart Checkout (${selectedItems.length} items)`,
        totalPrice: selectedItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)
      };
    } else {
      order = getOrderById(state.ui.paymentOrderId);
    }

    if (!order || (state.ui.paymentOrderId === "cart" && (state.ui.cart.length === 0 || order.totalPrice === 0))) {
      return "";
    }
    orderTitle = order.productName;
    orderTotal = order.totalPrice;
    orderIdRaw = order.id || "pending";
  }

  return `
    <div class="modal-backdrop">
      <div class="modal-shell payment-modal" style="max-width: 600px;">
        <button type="button" class="icon-button modal-close" data-action="close-modal" aria-label="Close payment form">x</button>
        
        <div class="payment-modal__header" style="text-align: left; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <p class="eyebrow">Checkout</p>
            <h2 style="margin: 0;">${escapeHtml(orderTitle)}</h2>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: var(--text-2); font-size: 0.9rem;">Total Amount</p>
            <strong style="font-size: 1.4rem; color: var(--primary);">${formatCurrency(orderTotal)}</strong>
          </div>
        </div>

        <div class="payment-modal__body" style="padding: 1.5rem;">
          ${state.ui.paymentState === 'processing' ? `
            <div style="text-align: center; padding: 3rem 1.5rem;">
              <div class="payment-processing-spinner"></div>
              <h3 style="margin-bottom: 0.5rem; font-family: var(--font-display);">Processing Payment</h3>
              <p style="color: var(--text-2);">Please wait while we confirm your transaction...</p>
            </div>
          ` : state.ui.paymentState === 'success' ? `
            <div style="text-align: center; padding: 2rem 1.5rem;">
              <svg class="payment-success-icon" viewBox="0 0 52 52">
                <circle class="payment-success-icon__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="payment-success-icon__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
              <h3 style="margin-bottom: 0.5rem; font-family: var(--font-display); color: var(--success);">Payment Successful!</h3>
              <p style="color: var(--text-2); margin-bottom: 2rem;">Your transaction has been completed.</p>
              
              <div style="background: var(--surface-soft); padding: 1.5rem; border-radius: 12px; text-align: left; margin-bottom: 2rem; border: 1px solid var(--line);">
                <p class="eyebrow" style="margin-bottom: 1rem;">Receipt Summary</p>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="color: var(--text-2);">Item(s)</span>
                  <strong style="text-align: right;">${escapeHtml(orderTitle)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="color: var(--text-2);">Total Paid</span>
                  <strong style="color: var(--primary);">${formatCurrency(orderTotal)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-2);">Status</span>
                  <span style="color: var(--success); font-weight: 500;">PAID</span>
                </div>
              </div>

              <div style="display: flex; gap: 1rem;">
                <button type="button" class="secondary-button" style="flex: 1; padding: 0.8rem;" onclick="document.body.classList.add('printing-receipt'); window.print(); document.body.classList.remove('printing-receipt');">
                  Print Receipt
                </button>
                <button type="button" class="primary-button" data-action="close-modal" style="flex: 1; padding: 0.8rem;">
                  Close
                </button>
              </div>
            </div>
          ` : `
            <form id="payment-form" class="stack-form payment-form" data-form="payment" data-order-id="${state.ui.paymentOrderId === 'cart' ? 'cart' : orderIdRaw}">
              <div class="payment-section" style="background: var(--surface-soft); padding: 1.5rem; border-radius: 12px;">
                <h3 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 1.1rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                  Payment Details
                </h3>
                <div class="form-grid">
                  <label>
                    <span>Cardholder name</span>
                    <input name="cardholder" placeholder="e.g. Jane Doe" required />
                  </label>
                  <label>
                    <span>Card number</span>
                    <input name="cardNumber" inputmode="numeric" placeholder="0000 0000 0000 0000" maxlength="19" required oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/(.{4})/g, '$1 ').trim();" />
                  </label>
                </div>
                <div class="form-grid">
                  <label>
                    <span>Expiry Date</span>
                    <input name="expiry" placeholder="MM/YY" maxlength="5" required oninput="if(this.value.length === 2 && !this.value.includes('/')) this.value += '/';" />
                  </label>
                  <label>
                    <span>CVV</span>
                    <input name="cvv" inputmode="numeric" placeholder="123" maxlength="4" required />
                  </label>
                </div>
                <button type="submit" class="primary-button payment-submit-btn" style="margin-top: 1.5rem; width: 100%;">
                  Confirm Payment
                </button>
              </div>
            </form>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderProductEditorModal() {
  if (!state.ui.productEditor) {
    return "";
  }

  const product = state.ui.productEditor;

  return `
    <div class="modal-backdrop">
      <div class="modal-shell">
        <button type="button" class="icon-button modal-close" data-action="close-modal" aria-label="Close product editor">×</button>
        <p class="eyebrow">Product editor</p>
        <h2>${product.id ? "Edit apparel item" : "Add apparel item"}</h2>
        <form class="stack-form" data-form="product-editor" data-product-id="${escapeHtml(product.id || "")}">
          <div class="form-grid">
            <label>
              <span>Product name</span>
              <input name="name" value="${escapeHtml(product.name || "")}" required />
            </label>
            <label>
              <span>Category</span>
              <select name="categoryId" required>
                ${state.data.categories
                  .map(
                    (category) => `
                      <option value="${category.id}" ${product.categoryId === category.id ? "selected" : ""}>
                        ${escapeHtml(category.name)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--color-border); border-radius: 8px;">
            <p class="eyebrow" style="margin-bottom: 8px;">Product Specifications</p>
            <div class="form-grid">
              <label>
                <span>Size Range</span>
                <input name="specSize" value="${escapeHtml(product.specs?.size || "")}" placeholder="e.g. 2XS - 7XL" />
              </label>
              <label>
                <span>Fabric Weight</span>
                <input name="specWeight" value="${escapeHtml(product.specs?.weight || "")}" placeholder="e.g. 160gsm" />
              </label>
              <label>
                <span>Material</span>
                <input name="specMaterial" value="${escapeHtml(product.specs?.material || "")}" placeholder="e.g. 100% Performance Dri-Fit Polyester" />
              </label>
              <label>
                <span>Weave Type</span>
                <input name="specWeave" value="${escapeHtml(product.specs?.weave || "")}" placeholder="e.g. Microfiber Polyester Eyelet weave" />
              </label>
              <label>
                <span>Color Availability</span>
                <input name="specColors" value="${escapeHtml(product.specs?.colors || "")}" placeholder="e.g. Available in 23 colors" />
              </label>
            </div>
          </div>
          <input type="hidden" name="imageUrl" value="${escapeHtml(product.imageUrl || "")}" />
          <label>
            <span>Product image (upload or paste)</span>
            <input type="file" name="imageFile" accept="image/*" />
            ${product.imageUrl ? `<p class="help-text" style="font-size: 0.8rem; margin-top: 4px; color: var(--color-muted);">Leave blank to keep existing image</p>` : ""}
          </label>
          <div style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--color-border); border-radius: 8px;">
            <p class="eyebrow" style="margin-bottom: 8px;">Color Variants & Stock</p>
            <div id="color-variants-list">
              ${(product.colors || []).map((c, index) => `
                <div class="color-variant-row" data-index="${index}" style="margin-top: 1rem; padding: 1rem; background: var(--color-background-soft); border-radius: 8px;">
                  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                    <input type="text" name="colorName_${index}" value="${escapeHtml(c.name)}" placeholder="Color name" required style="flex: 2;" />
                    <input type="file" name="colorImage_${index}" accept="image/*" style="flex: 2;" />
                    <input type="hidden" name="colorExistingUrl_${index}" value="${escapeHtml(c.imageUrl || "")}" />
                    ${c.imageUrl ? `<img src="${escapeHtml(c.imageUrl)}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;" />` : ''}
                    <button type="button" class="icon-button" onclick="this.closest('.color-variant-row').remove()">×</button>
                  </div>
                  <div id="size-variants-list-${index}">
                    ${(c.sizes || (c.stock != null ? [{name: "One Size", stock: c.stock}] : [])).map((s, sIndex) => `
                      <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; padding-left: 1rem;">
                        <input type="text" name="colorSizeName_${index}_${sIndex}" value="${escapeHtml(s.name)}" placeholder="Size (optional)" style="flex: 1;" />
                        <input type="number" name="colorSizeStock_${index}_${sIndex}" value="${escapeHtml(s.stock ?? 0)}" placeholder="Qty" min="0" required style="flex: 1;" />
                        <button type="button" class="icon-button" onclick="this.parentElement.remove()" style="font-size: 1rem; padding: 0 4px;">×</button>
                      </div>
                    `).join("")}
                  </div>
                  <button type="button" class="secondary-button" data-action="add-size-row" data-color-index="${index}" style="margin-top: 8px; margin-left: 1rem; font-size: 0.75rem;">+ Add Size</button>
                </div>
              `).join("")}
            </div>
            <button type="button" class="secondary-button" data-action="add-color-row" style="margin-top: 12px; font-size: 0.85rem;">+ Add Color</button>
          </div>
          <div class="form-grid">
            <label>
              <span>Price (MYR)</span>
              <input name="price" type="number" min="0" step="0.01" value="${escapeHtml(product.price ?? "")}" required />
            </label>
            <label>
              <span>Lead time</span>
              <input name="leadTime" value="${escapeHtml(product.leadTime || "")}" required />
            </label>
          </div>
          <button type="submit" class="primary-button">${product.id ? "Save changes" : "Create product"}</button>
        </form>
      </div>
    </div>
  `;
}

function renderCartModal() {
  if (!state.ui.isCartModalOpen) return "";

  const cart = state.ui.cart || [];
  
  if (!state.ui.selectedCartItemIds) {
    state.ui.selectedCartItemIds = cart.map(i => i.id);
  }
  
  // Clean up any stale IDs
  state.ui.selectedCartItemIds = state.ui.selectedCartItemIds.filter(id => cart.find(i => i.id === id));
  
  const selectedCartItems = cart.filter(item => state.ui.selectedCartItemIds.includes(item.id));
  const total = selectedCartItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const allSelected = cart.length > 0 && selectedCartItems.length === cart.length;

  return `
    <div class="modal-overlay" style="z-index: 10000; position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);" onclick="if(event.target === this) { state.ui.isCartModalOpen = false; render(); }">
      <div class="modal-content" style="background: var(--surface-1); border: 1px solid var(--line); border-radius: var(--radius-xl); width: 90%; max-width: 520px; padding: 2rem; position: relative; box-shadow: var(--shadow-lg);">
        <button type="button" class="icon-button" data-action="toggle-cart" style="position: absolute; top: 1.2rem; right: 1.2rem; border: none; background: var(--surface-soft);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <h2 style="margin: 0; font-family: var(--font-display); font-size: 1.4rem;">Your Cart</h2>
          ${cart.length > 0 ? `<span style="background: var(--accent-soft); color: var(--text-1); font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.65rem; border-radius: 999px;">${cart.length} items</span>` : ''}
        </div>
        ${cart.length === 0 ? `
          <div style="text-align: center; padding: 3rem 1rem; color: var(--text-3);">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1.2rem; opacity: 0.35;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <p style="margin: 0; font-size: 1rem;">Your cart is empty.</p>
            <p style="margin: 0.5rem 0 0; font-size: 0.85rem; opacity: 0.7;">Browse our showroom and add items to get started.</p>
          </div>
        ` : `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding: 0.6rem 0.85rem; background: var(--surface-soft); border-radius: var(--radius-sm); border: 1px solid var(--line);">
             <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.88rem; color: var(--text-2); font-weight: 500;">
                <input type="checkbox" onchange="window.toggleCartSelectAll(this.checked)" ${allSelected ? 'checked' : ''} />
                Select All
             </label>
             <span style="font-size: 0.82rem; color: var(--text-3); font-weight: 500;">${selectedCartItems.length} of ${cart.length} selected</span>
          </div>
          <div style="max-height: 45vh; overflow-y: auto; margin-bottom: 1.5rem; border-radius: var(--radius-sm); border: 1px solid var(--line);">
            ${cart.map((item, index) => {
              const product = getProductById(item.productId);
              let imageUrl = product?.imageUrl || '';
              if (item.color && product?.colors) {
                const colorObj = product.colors.find(c => c.name === item.color);
                if (colorObj?.imageUrl) {
                  imageUrl = colorObj.imageUrl;
                }
              }
              const isSelected = state.ui.selectedCartItemIds.includes(item.id);
              return `
              <div style="display: flex; align-items: center; padding: 0.85rem 1rem; border-bottom: 1px solid var(--line); gap: 0.85rem; transition: background 0.2s ease; ${isSelected ? 'background: var(--accent-soft);' : ''}">
                <input type="checkbox" onchange="window.toggleCartItemSelection('${item.id}', this.checked)" ${isSelected ? 'checked' : ''} />
                <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0;">
                  ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.productName)}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 10px; background: var(--surface-soft); border: 1px solid var(--line); flex-shrink: 0;" />` : `<div style="width: 52px; height: 52px; border-radius: 10px; background: var(--surface-soft); display: flex; align-items: center; justify-content: center; color: var(--text-3); border: 1px solid var(--line); flex-shrink: 0;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
                  <div style="min-width: 0; flex: 1;">
                    <h4 style="margin: 0; font-size: 0.95rem; font-family: var(--font-display); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.productName)}</h4>
                    <p style="margin: 3px 0 0; font-size: 0.8rem; color: var(--text-3);">
                      ${escapeHtml(item.size)}${item.color ? ` · ${escapeHtml(item.color)}` : ''} · Qty ${item.quantity}
                    </p>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;">
                  <span style="font-weight: 600; font-size: 0.95rem; white-space: nowrap;">${formatCurrency(item.totalPrice)}</span>
                  <button type="button" class="icon-button" data-action="remove-cart-item" data-id="${item.id}" data-index="${index}" style="width: 28px; height: 28px; color: var(--danger); background: var(--danger-soft); border: none; border-radius: 8px;" title="Remove from cart">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
              `;
            }).join('')}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding: 1rem; background: var(--surface-soft); border-radius: var(--radius-sm); border: 1px solid var(--line);">
            <span style="font-weight: 600; color: var(--text-2);">Total (${selectedCartItems.length} items)</span>
            <span style="font-weight: 700; font-size: 1.3rem; font-family: var(--font-display);">${formatCurrency(total)}</span>
          </div>
          <button type="button" class="primary-button" style="width: 100%; padding: 0.9rem; font-size: 1.05rem;" data-action="checkout-cart" ${selectedCartItems.length === 0 ? 'disabled' : ''}>
            <span style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              Checkout Selected Items
            </span>
          </button>
        `}
      </div>
    </div>
  `;
}

function renderApp() {
  const session = state.sessionUser;

  return `
    <div class="app-frame">
      <div class="ambient ambient--one"></div>
      <div class="ambient ambient--two"></div>
      ${renderHeader()}
      ${renderFlash()}
      ${
        state.isLoading
          ? `
            <main class="page-shell">
              <section class="content-section loading-state">
                <h2>Preparing Infinitee PrintFlow DB...</h2>
                <p>Loading products, order history, and workflow insights.</p>
              </section>
            </main>
          `
          : state.ui.activeSection === "login"
            ? `<section id="login-section" class="content-section" style="display:block;">${renderAuthPanel()}</section>`
            : state.ui.activeSection === "workspace" && session
              ? (session.role === "admin" ? renderAdminWorkspace() : renderUserWorkspace())
              : renderPublicLanding()
      }
      <footer class="site-footer">
        <p>${escapeHtml(APP_CONFIG.footerLabel)}</p>
      </footer>
      ${renderGlobalChatModal()}
      ${renderOrderModal()}
      ${renderCartModal()}
      ${renderPaymentModal()}
      ${renderProductEditorModal()}
    </div>
  `;
}

function render() {
  root.innerHTML = renderApp();
  requestAnimationFrame(() => {
    initAll(root);
  });
}

async function loadData() {
  const payload = await service.fetchBootstrap(state.sessionUser);
  state.data = payload;
  if (state.sessionUser) {
    try {
      state.ui.allOrderMessages = await service.fetchAllOrderMessages();
      state.ui.cart = await service.fetchCart();
    } catch (err) {
      console.error("Failed to load user data", err);
    }
  }
}

async function refreshAfterMutation(successMessage, tone = "success") {
  await loadData();
  render();
  triggerFlash(successMessage, tone);
}

function scrollToSection(targetId) {
  const element = document.getElementById(targetId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function handleAuthSubmit(form) {
  const formData = new FormData(form);

  if (form.dataset.form === "signin") {
    const user = await service.signIn({
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      portal: state.ui.portal
    });
    state.sessionUser = normalizeSession(user);
    await loadData();
    state.ui.userTab = "showroom";
    state.ui.adminTab = "overview";
    state.ui.activeSection = state.sessionUser.role === "admin" ? "workspace" : "introduction";
    render();
    triggerFlash(`Welcome back, ${state.sessionUser.fullName}.`, "success");
    return;
  }

  if (form.dataset.form === "register") {
    if (state.ui.portal === "admin") {
      throw new Error("Admin accounts cannot be self-registered from the admin portal.");
    }

    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const user = await service.signUp({
      fullName: String(formData.get("fullName") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      password
    });

    state.sessionUser = normalizeSession(user);
    await loadData();
    state.ui.userTab = "showroom";
    state.ui.activeSection = state.sessionUser.role === "admin" ? "workspace" : "introduction";
    render();
    triggerFlash("Your account has been created successfully.", "success");
    return;
  }

  if (form.dataset.form === "reset-request") {
    const email = String(formData.get("email") || "");
    const response = await service.requestPasswordReset({ email });
    state.ui.resetContext = {
      email,
      code: response.code || ""
    };
    render();
    triggerFlash(response.message || "Reset flow started.", "info");
    return;
  }

  if (form.dataset.form === "reset-confirm") {
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const response = await service.resetPassword({
      email: String(formData.get("email") || ""),
      code: String(formData.get("code") || ""),
      newPassword
    });
    state.ui.resetContext = null;
    state.ui.authMode = "signin";
    render();
    triggerFlash(response.message || "Password reset completed.", "success");
  }
}

async function handleStandardOrder(form) {
  const product = getProductById(form.dataset.productId);
  const formData = new FormData(form);

  if (!product || !state.sessionUser) {
    throw new Error("Unable to place the order right now.");
  }

  const category = getCategoryMap().get(product.categoryId);
  const quantity = Number(formData.get("quantity") || 1);

  const payload = {
    orderNumber: makeOrderNumber(),
    userId: state.sessionUser.id,
    productId: product.id,
    productName: product.name,
    categoryName: category?.name || "Apparel",
    visualKey: product.visualKey,
    orderType: "standard",
    size: String(formData.get("size") || ""),
    color: String(formData.get("color") || ""),
    quantity,
    unitPrice: Number(product.price),
    totalPrice: Number(product.price) * quantity,
    designTitle: "",
    designDescription: String(formData.get("notes") || ""),
    designImageUrl: ""
  };

  const actionType = formData.get("actionType");

  if (actionType === "checkout") {
    state.ui.orderModalProductId = null;
    state.ui.pendingOrderPayload = payload;
    state.ui.paymentOrderId = "pending";
    render();
  } else {
    state.ui.orderModalProductId = null;
    render(); // Close modal immediately for responsiveness
    try {
      await service.addToCart(payload);
      state.ui.cart = await service.fetchCart();
      render();
      triggerFlash("Added to Cart successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerFlash("Failed to add to cart.", "danger");
    }
  }
}

async function handleCustomOrder(form) {
  const formData = new FormData(form);
  const product = getProductById(String(formData.get("productId") || ""));
  const file = formData.get("designFile");

  if (!product || !state.sessionUser || !(file instanceof File) || !file.size) {
    throw new Error("Please choose a product and upload a design image.");
  }

  const quantity = Number(formData.get("quantity") || 1);
  const category = getCategoryMap().get(product.categoryId);

  await service.createOrder({
    orderNumber: makeOrderNumber(),
    userId: state.sessionUser.id,
    productId: product.id,
    productName: product.name,
    categoryName: category?.name || "Apparel",
    visualKey: product.visualKey,
    orderType: "custom_design",
    size: String(formData.get("size") || ""),
    color: String(formData.get("color") || ""),
    quantity,
    unitPrice: Number(product.price),
    totalPrice: Number(product.price) * quantity,
    designTitle: String(formData.get("designTitle") || ""),
    designDescription: String(formData.get("designDescription") || ""),
    designImageUrl: "",
    designFile: file
  });

  form.reset();
  await refreshAfterMutation("Custom design request submitted. The admin can now review it.");
  state.ui.userTab = "orders";
  render();
}

async function handlePayment(form) {
  const formData = new FormData(form);
  const cardNumber = String(formData.get("cardNumber") || "").replace(/\s+/g, "");
  const deliveryAddress = String(formData.get("deliveryAddress") || "");

  let orderId = form.dataset.orderId;
  
  if (orderId === "cart") {
    const selectedItemIds = state.ui.selectedCartItemIds || [];
    const cartItems = state.ui.cart || [];
    const selectedItems = cartItems.filter(item => selectedItemIds.includes(item.id));
    
    if (selectedItems.length === 0) {
      triggerFlash("No items selected for checkout.", "warning");
      return;
    }

    // Start processing animation
    state.ui.paymentState = 'processing';
    state.ui.paymentSuccessData = {
      title: `Cart Checkout (${selectedItems.length} items)`,
      totalPrice: selectedItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)
    };
    render();
    await new Promise(resolve => setTimeout(resolve, 1500));

    for (const itemPayload of selectedItems) {
      // Cart items don't have an order number or type yet, so we generate them here
      itemPayload.orderNumber = makeOrderNumber();
      itemPayload.orderType = "standard";

      const newOrder = await service.createOrder(itemPayload);
      await service.payOrder({ orderId: newOrder.id, cardNumber });
      try {
        await service.removeFromCart(itemPayload.id);
      } catch (err) {
        console.error("Failed to remove cart item", err);
      }
    }
    
    state.ui.selectedCartItemIds = [];
    state.ui.cart = await service.fetchCart();
    
    // Show success view
    state.ui.paymentState = 'success';
    await loadData();
    render();
    return;
  }
  
  // Capture the order data BEFORE creating/nulling it
  let targetOrder;
  if (orderId === "pending") {
    targetOrder = state.ui.pendingOrderPayload;
  } else {
    targetOrder = getOrderById(orderId);
  }

  // Start processing animation
  state.ui.paymentState = 'processing';
  state.ui.paymentSuccessData = {
    title: targetOrder?.productName || "Order Payment",
    totalPrice: Number(targetOrder?.totalPrice) || 0
  };
  render();
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (form.dataset.orderId === "pending") {
    const newOrder = await service.createOrder(state.ui.pendingOrderPayload);
    orderId = newOrder.id;
    state.ui.pendingOrderPayload = null;
  }

  await service.payOrder({ orderId, cardNumber });
  
  // Show success view
  state.ui.paymentState = 'success';
  await loadData();
  render();
}

async function handleProfile(form) {
  const formData = new FormData(form);
  const updatedUser = await service.updateProfile({
    userId: state.sessionUser.id,
    fullName: String(formData.get("fullName") || ""),
    phone: String(formData.get("phone") || "")
  });
  state.sessionUser = normalizeSession(updatedUser);
  render();
  triggerFlash("Profile updated successfully.", "success");
}

async function handleFeedback(form) {
  const formData = new FormData(form);
  
  const payload = {
    user_name: String(formData.get("name") || ""),
    user_email: String(formData.get("email") || ""),
    type: String(formData.get("type") || ""),
    subject: String(formData.get("subject") || ""),
    message: String(formData.get("message") || ""),
    rating: parseInt(formData.get("priority") || "0", 10),
  };
  
  if (state.sessionUser) {
    payload.user_id = state.sessionUser.id;
  }

  try {
    await service.insertFeedback(payload);
    form.reset();
    triggerFlash("Thank you for your feedback! We'll review it and get back to you soon.", "success");
    // Refresh feedbacks if admin
    if (state.sessionUser && state.sessionUser.role === "admin") {
       state.data.feedbacks = await service.fetchFeedbacks();
       render();
    }
  } catch (err) {
    console.error("Failed to submit feedback", err);
    triggerFlash(`Failed to submit: ${err.message}`, "danger");
  }
}

async function handleProductEditor(form) {
  const formData = new FormData(form);
  const imageFile = formData.get("imageFile");

  const colors = [];
  let totalStock = 0;
  const globalSizesSet = new Set();
  const formElements = Array.from(form.elements);
  const colorNameInputs = formElements.filter(el => el.name && el.name.startsWith("colorName_"));
  colorNameInputs.forEach(input => {
    const idx = input.name.split("_")[1];
    
    const sizes = [];
    let colorStock = 0;
    const sizeNameInputs = formElements.filter(el => el.name && el.name.startsWith(`colorSizeName_${idx}_`));
    sizeNameInputs.forEach(sizeInput => {
      const sIdx = sizeInput.name.split("_")[2];
      const stockQty = Number(form.elements[`colorSizeStock_${idx}_${sIdx}`]?.value || 0);
      const sizeName = sizeInput.value.trim() || "One Size";
      sizes.push({ name: sizeName, stock: stockQty });
      colorStock += stockQty;
      globalSizesSet.add(sizeName);
    });

    totalStock += colorStock;
    colors.push({
      name: input.value,
      stock: colorStock,
      sizes: sizes,
      file: form.elements[`colorImage_${idx}`]?.files?.[0] || null,
      existingUrl: form.elements[`colorExistingUrl_${idx}`]?.value || ""
    });
  });

  const specs = {
    size: String(formData.get("specSize") || "").trim(),
    weight: String(formData.get("specWeight") || "").trim(),
    material: String(formData.get("specMaterial") || "").trim(),
    weave: String(formData.get("specWeave") || "").trim(),
    colors: String(formData.get("specColors") || "").trim()
  };

  await service.upsertProduct({
    id: form.dataset.productId || "",
    name: String(formData.get("name") || ""),
    categoryId: String(formData.get("categoryId") || ""),
    description: String(formData.get("description") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : null,
    colors: colors,
    specs: specs,
    price: Number(formData.get("price") || 0),
    stock: totalStock,
    visualKey: "tee",
    leadTime: String(formData.get("leadTime") || ""),
    sizes: Array.from(globalSizesSet)
  });

  state.ui.productEditor = null;
  await refreshAfterMutation("Product details saved.");
}

async function handleAdminOrderUpdate(form) {
  const formData = new FormData(form);
  const status = String(formData.get("status") || "");
  const rejectionReason = String(formData.get("rejectionReason") || "");

  if (status === "rejected" && !rejectionReason.trim()) {
    throw new Error("Please provide a rejection reason for the user.");
  }

  await service.updateOrder(form.dataset.orderId, {
    status,
    paymentStatus: String(formData.get("paymentStatus") || ""),
    adminNote: String(formData.get("adminNote") || ""),
    etaText: String(formData.get("etaText") || ""),
    rejectionReason
  });

  await refreshAfterMutation("Order status updated successfully.");
}

function downloadReportCsv() {
  const report = getMonthlyReport(state.data.orders, state.ui.reportMonth);
  const lines = [
    ["Order Number", "Customer", "Item", "Status", "Payment", "Total"].join(",")
  ];

  report.filtered.forEach((order) => {
    const user = state.data.users.find((entry) => entry.id === order.userId);
    lines.push(
      [
        order.orderNumber,
        user?.fullName || order.userId,
        order.productName,
        toSentenceCase(order.status),
        toSentenceCase(order.paymentStatus),
        order.totalPrice
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `infinitee-report-${state.ui.reportMonth}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function handleSubmit(event) {
  const form = event.target.closest("form");

  if (!form) {
    return;
  }

  event.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";
  }

  try {
    const formName = form.dataset.form;

    if (["signin", "register", "reset-request", "reset-confirm"].includes(formName)) {
      await handleAuthSubmit(form);
      return;
    }

    if (formName === "catalog-filter") {
      const formData = new FormData(form);
      state.ui.catalogCategory = String(formData.get("category") || "all");
      state.ui.catalogSearch = String(formData.get("query") || "");
      render();
      return;
    }

    if (formName === "showroom-filter") {
      const formData = new FormData(form);
      state.ui.showroomCategory = String(formData.get("category") || "all");
      state.ui.showroomSearch = String(formData.get("query") || "");
      render();
      return;
    }

    if (formName === "standard-order") {
      await handleStandardOrder(form);
      return;
    }

    if (formName === "custom-order") {
      await handleCustomOrder(form);
      return;
    }

    if (formName === "payment") {
      await handlePayment(form);
      return;
    }

    if (formName === "profile") {
      await handleProfile(form);
      return;
    }

    if (formName === "feedback") {
      await handleFeedback(form);
      return;
    }

    if (formName === "product-editor") {
      await handleProductEditor(form);
      return;
    }

    if (formName === "admin-order-update") {
      await handleAdminOrderUpdate(form);
      return;
    }

    if (formName === "report-filter") {
      const formData = new FormData(form);
      state.ui.reportMonth = String(formData.get("month") || todayMonthValue());
      render();
    }
  } catch (error) {
    triggerFlash(error.message || "Something went wrong. Please try again.", "danger");
  }
}

document.addEventListener("submit", async (e) => {
  const target = e.target;
  if (target && target.matches('form[data-action="submit-chat-message"]')) {
    e.preventDefault();
    const orderId = target.dataset.orderId;
    const formData = new FormData(target);
    const message = formData.get("message");
    if (!message || !message.trim()) return;
    target.querySelector('button[type="submit"]').disabled = true;
    try {
      const trimmedMsg = message.trim();
      const localMsg = {
        id: "temp-" + Date.now(),
        orderId: orderId,
        userId: state.sessionUser.id,
        message: trimmedMsg,
        createdAt: new Date().toISOString(),
        senderName: state.sessionUser.fullName || state.sessionUser.email,
        senderRole: state.sessionUser.role || "user"
      };

      if (!Array.isArray(state.ui.orderChatMessages)) {
        state.ui.orderChatMessages = [];
      }
      state.ui.orderChatMessages.push(localMsg);
      
      if (state.ui.allOrderMessages) {
        state.ui.allOrderMessages.push(localMsg);
      }
      
      const totalMsgs = state.ui.allOrderMessages ? state.ui.allOrderMessages.filter(m => String(m.orderId) === String(orderId)).length : state.ui.orderChatMessages.length;
      localStorage.setItem('chat_seen_' + orderId, totalMsgs.toString());
      
      const chatArea = document.getElementById("chat-messages-" + orderId);
      if (chatArea) {
        chatArea.innerHTML = renderChatMessagesList(state.ui.orderChatMessages);
        chatArea.scrollTop = chatArea.scrollHeight;
      }
      target.reset();

      service.sendOrderMessage({ orderId, message: trimmedMsg }).catch(err => {
        console.error(err);
        triggerFlash("Failed to send message.", "danger");
      });
    } catch (err) {
      console.error(err);
      triggerFlash(err.message || "Failed to send message.", "danger");
    } finally {
      const btn = target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Send";
      }
    }
  }
});

async function handleClick(event) {
  const actionTarget = event.target.closest("[data-action]");

  if (!actionTarget) {
    return;
  }

  const { action } = actionTarget.dataset;

  try {
    switch (action) {
      case "reload-page":
        window.location.reload();
        break;
      case "toggle-global-chat":
        state.ui.globalChatOpen = !state.ui.globalChatOpen;
        if (!state.ui.globalChatOpen) {
           state.ui.globalChatActiveOrderId = null;
        } else {
           service.fetchAllOrderMessages().then(msgs => {
             state.ui.allOrderMessages = msgs;
             if (state.ui.globalChatOpen) render();
           }).catch(console.error);
        }
        render();
        break;
      case "select-global-chat-order":
        state.ui.globalChatActiveOrderId = actionTarget.dataset.orderId;
        
        // Mark messages as seen immediately
        const totalMsgs = state.ui.allOrderMessages?.filter(m => m.orderId === state.ui.globalChatActiveOrderId).length || 0;
        localStorage.setItem('chat_seen_' + state.ui.globalChatActiveOrderId, totalMsgs.toString());
        
        // Re-render header to update global unread badge
        const headerContainer = document.querySelector('.site-header');
        if (headerContainer && headerContainer.parentElement) {
          headerContainer.outerHTML = renderHeader();
        }

        state.ui.orderChatMessages = null;
        const rightPane = document.getElementById('chat-main-container');
        
        // Re-render sidebar to clear per-order unread badge
        const chatSidebar = document.querySelector('.chat-sidebar .chat-list');
        if (chatSidebar) {
          const session = state.sessionUser;
          let chatOrders = [];
          if (state.data && state.data.orders) {
            chatOrders = session.role === "admin" ? state.data.orders : state.data.orders.filter(o => o.userId === session.id);
          }
          chatOrders.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
          const activeOrderId = state.ui.globalChatActiveOrderId;
          chatSidebar.innerHTML = chatOrders.length === 0 ? '<p class="muted-copy" style="padding: 1rem; text-align: center;">No orders found.</p>' :
            chatOrders.map(o => {
              const oMsgs = state.ui.allOrderMessages?.filter(m => m.orderId === o.id) || [];
              const seenCount = parseInt(localStorage.getItem('chat_seen_' + o.id) || '0', 10);
              const unreadCount = Math.max(0, oMsgs.length - seenCount);
              const lastMsg = oMsgs.length > 0 ? oMsgs[oMsgs.length - 1] : null;
              let senderText = session.role === "admin" && state.data.users ? (state.data.users.find(u => u.id === (o.userId || o.user_id))?.fullName || "Customer") : "Studio Team";
              if (lastMsg) {
                senderText = lastMsg.senderName;
                if (lastMsg.userId === session.id) senderText = "Me";
              }
              return `
              <div class="chat-list-item ${activeOrderId === o.id ? 'is-active' : ''}" data-action="select-global-chat-order" data-order-id="${o.id}" style="padding: 1rem; border-bottom: 1px solid var(--line); cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem; background: ${activeOrderId === o.id ? 'var(--surface-hover)' : 'transparent'}; border-left: ${activeOrderId === o.id ? '3px solid var(--accent)' : '3px solid transparent'}; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${escapeHtml(o.orderNumber || o.order_number)}</strong>
                  ${unreadCount > 0 ? `<div class="unread-badge" style="background: var(--danger); color: white; font-size: 0.7rem; font-weight: bold; border-radius: 999px; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; line-height: 1;">${unreadCount > 9 ? '9+' : unreadCount}</div>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px;">
                  <span style="font-size: 0.85rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${escapeHtml(o.productName || o.product_name || "Custom Order")}</span>
                  <span style="font-size: 0.75rem; color: var(--text-3); font-weight: 500;">${escapeHtml(senderText)}</span>
                </div>
              </div>
            `}).join("");
        }

        if (rightPane) {
          rightPane.innerHTML = renderGlobalChatRightPane();
        }

        try {
          state.ui.orderChatMessages = await service.fetchOrderMessages(actionTarget.dataset.orderId);
          if (state.ui.orderChatMessages) {
            localStorage.setItem('chat_seen_' + state.ui.globalChatActiveOrderId, state.ui.orderChatMessages.length.toString());
          }
          if (rightPane && state.ui.globalChatActiveOrderId === actionTarget.dataset.orderId) {
             rightPane.innerHTML = renderGlobalChatRightPane();
             const msgsContainer = rightPane.querySelector('.messages-container');
             if (msgsContainer) msgsContainer.scrollTop = msgsContainer.scrollHeight;
          }
        } catch (err) {
          console.error(err);
        }
        break;
      case "toggle-cart":
        state.ui.isCartModalOpen = !state.ui.isCartModalOpen;
        render();
        break;
      case "remove-cart-item":
        if (state.ui.cart) {
          const idToRemove = actionTarget.dataset.id;
          if (idToRemove) {
            try {
              await service.removeFromCart(idToRemove);
              state.ui.cart = await service.fetchCart();
            } catch (e) {
              console.error(e);
            }
          } else {
            state.ui.cart.splice(parseInt(actionTarget.dataset.index), 1);
          }
        }
        render();
        break;
      case "checkout-cart":
        if (!state.sessionUser) {
          state.ui.isCartModalOpen = false;
          state.ui.previousSection = state.ui.activeSection;
          state.ui.activeSection = "login";
          render();
          triggerFlash("Please log in to checkout your cart.", "info");
        } else {
          // Ensure selectedCartItemIds is initialized
          if (!state.ui.selectedCartItemIds || state.ui.selectedCartItemIds.length === 0) {
            state.ui.selectedCartItemIds = (state.ui.cart || []).map(i => i.id);
          }
          state.ui.isCartModalOpen = false;
          state.ui.paymentOrderId = "cart";
          render();
        }
        break;
      case "toggle-theme":
        setTheme(state.theme === "dark" ? "light" : "dark");
        render();
        break;
      case "jump-auth":
        state.ui.previousSection = state.ui.activeSection;
        state.ui.activeSection = "login";
        render();
        break;
      case "navigate-section":
        if (actionTarget.dataset.section === "login" && state.ui.activeSection !== "login") {
          state.ui.previousSection = state.ui.activeSection;
        }
        state.ui.activeSection = actionTarget.dataset.section;
        render();
        break;
      case "close-login":
        state.ui.activeSection = state.ui.previousSection || "introduction";
        render();
        break;
      case "scroll-to":
        scrollToSection(actionTarget.dataset.target);
        break;
      case "set-portal":
        state.ui.portal = actionTarget.dataset.portal;
        if (state.ui.portal === "admin" && state.ui.authMode === "register") {
          state.ui.authMode = "signin";
        }
        render();
        break;
      case "set-auth-mode":
        state.ui.authMode = actionTarget.dataset.mode;
        if (state.ui.authMode !== "reset") {
          state.ui.resetContext = null;
        }
        render();
        break;
      case "open-order-modal":
        state.ui.orderModalProductId = actionTarget.dataset.productId;
        render();
        break;
      case "open-payment-modal":
        state.ui.paymentOrderId = actionTarget.dataset.orderId;
        render();
        break;
      case "close-modal":
        state.ui.orderModalProductId = null;
        state.ui.paymentOrderId = null;
        state.ui.paymentState = null;
        state.ui.productEditor = null;
        render();
        break;
      case "sign-out":
        await service.signOut();
        state.sessionUser = null;
        state.data = {
          categories: state.data.categories,
          products: state.data.products,
          users: [],
          orders: [],
          notifications: []
        };
        state.ui.activeSection = "introduction";
        await loadData();
        render();
        triggerFlash("You have been signed out.", "info");
        break;
      case "set-user-tab":
        state.ui.userTab = actionTarget.dataset.tab;
        render();
        break;
      case "navigate-user-tab":
        state.ui.activeSection = "workspace";
        state.ui.userTab = actionTarget.dataset.tab;
        render();
        break;
      case "set-admin-tab":
        state.ui.adminTab = actionTarget.dataset.tab;
        render();
        break;
      case "mark-notification":
        {
          const notifId = actionTarget.dataset.notificationId;
          const notif = state.data.notifications?.find(n => n.id === notifId);
          if (notif) notif.read = true;
          render();
          service.markNotificationRead(notifId).catch(console.error);
        }
        break;
      case "open-product-editor":
        state.ui.productEditor = {
          categoryId: state.data.categories[0]?.id || "",
          description: "",
          imageUrl: "",
          colors: [],
          specs: {},
          featured: false,
          leadTime: "5-7 working days",
          name: "",
          price: "",
          sizes: ["S", "M", "L", "XL"],
          stock: "",
          sustainabilityNote: "",
          visualKey: "tee"
        };
        render();
        break;
      case "edit-product":
        state.ui.productEditor = { ...getProductById(actionTarget.dataset.productId) };
        render();
        break;
      case "delete-product":
        if (window.confirm("Delete this product from the catalog?")) {
          await service.deleteProduct(actionTarget.dataset.productId);
          await refreshAfterMutation("Product removed from the catalog.", "warning");
        }
        break;
      case "accept-design-order":
        try {
          await service.updateOrder(actionTarget.dataset.orderId, {
            status: "approved_waiting_payment"
          });
          await refreshAfterMutation("Order approved successfully.", "success");
        } catch (error) {
          triggerFlash(error.message, "danger");
        }
        break;
      case "reject-design-order":
        try {
          const reason = window.prompt("Please provide a rejection reason (this will be sent to the customer):");
          if (reason === null) break; // Admin cancelled the prompt
          
          await service.updateOrder(actionTarget.dataset.orderId, {
            status: "rejected",
            rejectionReason: reason.trim() || "Rejected by admin."
          });
          await refreshAfterMutation("Order has been rejected.", "warning");
        } catch (error) {
          triggerFlash(error.message, "danger");
        }
        break;
      case "toggle-admin-order":
        {
          const orderId = actionTarget.dataset.orderId;
          if (state.ui.expandedAdminOrderId === orderId) {
            state.ui.expandedAdminOrderId = null;
            state.ui.orderChatMessages = [];
            render();
          } else {
            state.ui.expandedAdminOrderId = orderId;
            state.ui.orderChatMessages = null;
            render();
            service.fetchOrderMessages(orderId).then(messages => {
              if (state.ui.expandedAdminOrderId === orderId) {
                state.ui.orderChatMessages = messages;
                const chatArea = document.getElementById("chat-messages-" + orderId);
                if (chatArea) {
                  chatArea.innerHTML = renderChatMessagesList(messages);
                  chatArea.scrollTop = chatArea.scrollHeight;
                }
              }
            }).catch(console.error);
          }
        }
        break;
      case "toggle-user-order":
        {
          const orderId = actionTarget.dataset.orderId;
          if (state.ui.expandedUserOrderId === orderId) {
            state.ui.expandedUserOrderId = null;
            state.ui.orderChatMessages = [];
            render();
          } else {
            state.ui.expandedUserOrderId = orderId;
            state.ui.orderChatMessages = [];
            render();
            service.fetchOrderMessages(orderId).then(messages => {
              if (state.ui.expandedUserOrderId === orderId) {
                state.ui.orderChatMessages = messages;
                const chatArea = document.getElementById("chat-messages-" + orderId);
                if (chatArea) {
                  chatArea.innerHTML = renderChatMessagesList(messages);
                  chatArea.scrollTop = chatArea.scrollHeight;
                }
              }
            }).catch(console.error);
          }
        }
        break;
      case "add-color-row":
        const container = document.getElementById("color-variants-list");
        if (container) {
          const index = Date.now();
          const row = document.createElement("div");
          row.className = "color-variant-row";
          row.dataset.index = index;
          row.style = "margin-top: 1rem; padding: 1rem; background: var(--color-background-soft); border-radius: 8px;";
          row.innerHTML = `
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <input type="text" name="colorName_${index}" placeholder="Color name" required style="flex: 2;" />
              <input type="file" name="colorImage_${index}" accept="image/*" required style="flex: 2;" />
              <input type="hidden" name="colorExistingUrl_${index}" value="" />
              <button type="button" class="icon-button" onclick="this.closest('.color-variant-row').remove()">×</button>
            </div>
            <div id="size-variants-list-${index}">
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; padding-left: 1rem;">
                <input type="text" name="colorSizeName_${index}_0" placeholder="Size (optional)" style="flex: 1;" />
                <input type="number" name="colorSizeStock_${index}_0" placeholder="Qty" min="0" required style="flex: 1;" />
                <button type="button" class="icon-button" onclick="this.parentElement.remove()" style="font-size: 1rem; padding: 0 4px;">×</button>
              </div>
            </div>
            <button type="button" class="secondary-button" data-action="add-size-row" data-color-index="${index}" style="margin-top: 8px; margin-left: 1rem; font-size: 0.75rem;">+ Add Size</button>
          `;
          container.appendChild(row);
        }
        break;
      case "add-size-row":
        const colorIndex = actionTarget.dataset.colorIndex;
        const sizeContainer = document.getElementById(`size-variants-list-${colorIndex}`);
        if (sizeContainer) {
          const sIndex = Date.now();
          const sizeRow = document.createElement("div");
          sizeRow.style = "display: flex; gap: 8px; align-items: center; margin-top: 4px; padding-left: 1rem;";
          sizeRow.innerHTML = `
            <input type="text" name="colorSizeName_${colorIndex}_${sIndex}" placeholder="Size (optional)" style="flex: 1;" />
            <input type="number" name="colorSizeStock_${colorIndex}_${sIndex}" placeholder="Qty" min="0" required style="flex: 1;" />
            <button type="button" class="icon-button" onclick="this.parentElement.remove()" style="font-size: 1rem; padding: 0 4px;">×</button>
          `;
          sizeContainer.appendChild(sizeRow);
        }
        break;
      case "dismiss-flash":
        clearFlash();
        break;
      case "print-report": {
        const monthInput = document.querySelector('input[name="month"]');
        if (monthInput && monthInput.value) {
          state.ui.reportMonth = monthInput.value;
        }
        render();
        setTimeout(() => window.print(), 100);
        break;
      }
      case "export-report":
        downloadReportCsv();
        triggerFlash("CSV report exported.", "success");
        break;
      default:
        break;
    }
  } catch (error) {
    triggerFlash(error.message || "Something went wrong. Please try again.", "danger");
  }
}

window.handleColorChange = function(productId, colorName) {
  const product = state.data.products.find(p => p.id === productId);
  if (!product) return;
  const color = product.colors.find(c => c.name === colorName);
  if (!color) return;
  
  const sizeSelect = document.getElementById(`size-select-${productId}`);
  if (sizeSelect) {
    sizeSelect.innerHTML = (color.sizes || []).map(s => `<option value="${escapeHtml(s.name)}" data-stock="${escapeHtml(s.stock ?? 0)}" ${s.stock <= 0 ? 'disabled' : ''}>${escapeHtml(s.name)}${s.stock <= 0 ? ' (Out of stock)' : ''}</option>`).join("");
    if (sizeSelect.options.length > 0) {
      sizeSelect.selectedIndex = 0;
    }
    sizeSelect.dispatchEvent(new Event('change'));
  }
};

window.handleSizeChange = function(productId, selectElement) {
  const opt = selectElement.options[selectElement.selectedIndex];
  const max = opt ? opt.dataset.stock : 0;
  const qtyInput = document.getElementById(`qty-input-${productId}`);
  const label = document.getElementById(`color-stock-label-${productId}`);
  if (qtyInput) {
    qtyInput.max = max;
    if (Number(qtyInput.value) > Number(max)) {
      qtyInput.value = max > 0 ? max : 1;
    }
  }
  if (label) label.innerText = `Size (In stock: ${max})`;
};

async function boot() {
  setTheme(state.theme);
  render();

  try {
    const session = await service.getSession();
    if (session) {
      state.sessionUser = normalizeSession(session);
      state.ui.activeSection = state.sessionUser.role === "admin" ? "workspace" : "introduction";
    }
    await loadData();
  } catch (error) {
    triggerFlash(error.message || "Unable to initialize the application.", "danger");
  } finally {
    state.isLoading = false;
    render();
  }

  // Real-time message & order polling
  setInterval(async () => {
    if (!state.sessionUser) return;
    try {
      const oldMsgCount = state.ui.allOrderMessages?.length || 0;
      const oldOrderCount = state.data?.orders?.length || 0;
      
      const payload = await service.fetchBootstrap(state.sessionUser);
      const msgs = await service.fetchAllOrderMessages();
      
      if (!payload || !msgs) return;
      
      if (msgs.length > oldMsgCount || payload.orders.length > oldOrderCount) {
        state.data = payload;
        state.ui.allOrderMessages = msgs;
        
        // If chat is open, update the active chat pane
        if (state.ui.globalChatOpen && state.ui.globalChatActiveOrderId) {
          state.ui.orderChatMessages = msgs.filter(m => m.orderId === state.ui.globalChatActiveOrderId);
          
          // Auto-mark as seen if we are actively looking at it
          localStorage.setItem('chat_seen_' + state.ui.globalChatActiveOrderId, state.ui.orderChatMessages.length.toString());
          
          const rightPane = document.getElementById('chat-main-container');
          if (rightPane) {
            rightPane.innerHTML = renderGlobalChatRightPane();
            const msgsContainer = rightPane.querySelector('.messages-container');
            if (msgsContainer) msgsContainer.scrollTop = msgsContainer.scrollHeight;
          }
        }
        
        // Re-render header to update the global notification badge
        const headerContainer = document.querySelector('.site-header');
        if (headerContainer && headerContainer.parentElement) {
          headerContainer.outerHTML = renderHeader();
        }
        
        // Re-render chat sidebar if modal is open
        const chatSidebar = document.querySelector('.chat-sidebar .chat-list');
        if (chatSidebar) {
          const session = state.sessionUser;
          let chatOrders = [];
          if (state.data && state.data.orders) {
            chatOrders = session.role === "admin" ? state.data.orders : state.data.orders.filter(o => o.userId === session.id);
          }
          chatOrders.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
          const activeOrderId = state.ui.globalChatActiveOrderId;
          chatSidebar.innerHTML = chatOrders.length === 0 ? '<p class="muted-copy" style="padding: 1rem; text-align: center;">No orders found.</p>' :
            chatOrders.map(o => {
              const oMsgs = state.ui.allOrderMessages?.filter(m => m.orderId === o.id) || [];
              const seenCount = parseInt(localStorage.getItem('chat_seen_' + o.id) || '0', 10);
              const unreadCount = Math.max(0, oMsgs.length - seenCount);
              const lastMsg = oMsgs.length > 0 ? oMsgs[oMsgs.length - 1] : null;
              let senderText = session.role === "admin" && state.data.users ? (state.data.users.find(u => u.id === (o.userId || o.user_id))?.fullName || "Customer") : "Studio Team";
              if (lastMsg) {
                senderText = lastMsg.senderName;
                if (lastMsg.userId === session.id) senderText = "Me";
              }
              return `
              <div class="chat-list-item ${activeOrderId === o.id ? 'is-active' : ''}" data-action="select-global-chat-order" data-order-id="${o.id}" style="padding: 1rem; border-bottom: 1px solid var(--line); cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem; background: ${activeOrderId === o.id ? 'var(--surface-hover)' : 'transparent'}; border-left: ${activeOrderId === o.id ? '3px solid var(--accent)' : '3px solid transparent'}; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${escapeHtml(o.orderNumber || o.order_number)}</strong>
                  ${unreadCount > 0 ? `<div class="unread-badge" style="background: var(--danger); color: white; font-size: 0.7rem; font-weight: bold; border-radius: 999px; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; line-height: 1;">${unreadCount > 9 ? '9+' : unreadCount}</div>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px;">
                  <span style="font-size: 0.85rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${escapeHtml(o.productName || o.product_name || "Custom Order")}</span>
                  <span style="font-size: 0.75rem; color: var(--text-3); font-weight: 500;">${escapeHtml(senderText)}</span>
                </div>
              </div>
            `}).join("");
        }
      }
    } catch (err) {}
  }, 3000); // Check every 3 seconds
}

root.addEventListener("submit", handleSubmit);
root.addEventListener("click", handleClick);

document.addEventListener("paste", (event) => {
  if (state.ui.productEditor) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === "file") {
        const blob = item.getAsFile();
        const fileInput = document.querySelector('input[name="imageFile"]');
        if (fileInput && blob) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type }));
          fileInput.files = dataTransfer.files;
          triggerFlash("Image pasted successfully. Ready to save.", "success");
        }
      }
    }
  }
});

window.toggleCartItemSelection = function(id, checked) {
  if (!state.ui.selectedCartItemIds) state.ui.selectedCartItemIds = [];
  if (checked) {
    if (!state.ui.selectedCartItemIds.includes(id)) state.ui.selectedCartItemIds.push(id);
  } else {
    state.ui.selectedCartItemIds = state.ui.selectedCartItemIds.filter(i => i !== id);
  }
  render();
};

window.toggleCartSelectAll = function(checked) {
  if (checked) {
    state.ui.selectedCartItemIds = (state.ui.cart || []).map(item => item.id);
  } else {
    state.ui.selectedCartItemIds = [];
  }
  render();
};

boot();
