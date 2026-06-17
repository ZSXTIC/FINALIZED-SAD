let animationFrameId = null;

function cleanupAnimations() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function initAll(root) {
  cleanupAnimations();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  // Page transition
  root.querySelectorAll(".page-shell, .workspace-shell").forEach((el) => {
    el.classList.add("page-transition");
  });

  // Hero float
  root.querySelectorAll(".hero-panel, .hero-editorial").forEach((el) => {
    el.classList.add("float-animation");
  });

  // Glow on primary CTAs
  root.querySelectorAll(".primary-button").forEach((el) => {
    el.classList.add("glow-effect");
  });

  // Magnetic hover on all buttons
  root.querySelectorAll(".primary-button, .secondary-button, .ghost-button").forEach((el) => {
    el.classList.add("magnetic-btn");
  });

  // Staggered slide-in + shimmer on cards
  const cards = root.querySelectorAll(
    ".product-card, .feature-card, .order-card, .metric-panel, .history-item, .editorial-feature, .contact-info article"
  );
  cards.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add("slide-in-left", "shimmer");
    }, index * 80);
  });

  // Pulse on spotlight badges
  root.querySelectorAll(".spotlight-badge").forEach((el) => {
    el.classList.add("pulse-animation");
  });

  // Particle BG on first section of main
  root.querySelectorAll("main > section:first-child").forEach((el) => {
    el.classList.add("particle-bg");
  });

  // Wave on footer
  const footer = root.querySelector(".site-footer");
  if (footer) footer.classList.add("wave");

  // Success animation on flash messages
  root.querySelectorAll(".flash--success").forEach((el) => {
    el.classList.add("bounce-in");
  });

  // Bloom mouse tracking
  const bloomElements = root.querySelectorAll(
    ".hero-copy, .hero-showcase, .showcase-panel, .portal-card, .portal-intro, " +
    ".content-section, .workspace-hero, .credential-card, .order-card, " +
    ".notification-item, .metric-panel, .contact-info article, .editorial-feature, " +
    ".capability-strip article, .workflow-grid article, .history-item, " +
    ".dashboard-summary article, .metric-list article, .showcase-card, " +
    ".showcase-grid article, .primary-button, .secondary-button, .ghost-button"
  );
  bloomElements.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    });
  });

  // Dashboard counter animation
  root.querySelectorAll(".dashboard-summary strong").forEach((el) => {
    const text = el.textContent.trim();
    const num = parseFloat(text.replace(/[^0-9.]/g, ""));
    if (isNaN(num) || el.dataset.counted) return;

    el.dataset.counted = "true";
    const isCurrency = /RM|MYR|\$/.test(text);
    const prefix = text.match(/^[^0-9]+/)?.[0] || "";
    const suffix = text.match(/[^0-9.]+$/)?.[0] || "";
    const target = num;

    el.textContent = prefix + "0" + suffix;
    const duration = Math.min(1000, 300 + target * 0.5);
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = prefix + (isCurrency ? current.toLocaleString() : current) + suffix;
      if (progress < 1) animationFrameId = requestAnimationFrame(tick);
    }

    animationFrameId = requestAnimationFrame(tick);
  });
}
