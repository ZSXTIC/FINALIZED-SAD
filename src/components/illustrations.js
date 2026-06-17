
const paletteByKey = {
  tee: ["#0b0b0f", "#ececf1", "#8d93a1"],
  oversized: ["#13151a", "#f5f6f8", "#aab0bc"],
  hoodie: ["#14171c", "#ffffff", "#a4a8b3"],
  jacket: ["#111317", "#f0f1f4", "#7b8391"],
  cargo: ["#1c1f26", "#f8f8fa", "#959cab"],
  joggers: ["#181b21", "#f7f7f8", "#8c93a0"],
  cap: ["#0f1116", "#f6f7f9", "#a3a8b4"],
  tote: ["#111319", "#f3f4f7", "#9ca3af"]
};

function buildShape(key, accent, neutral) {
  switch (key) {
    case "hoodie":
      return `
        <path d="M125 86c18-23 55-23 73 0l16 18 24 24-18 22v92H177l-6-46h-18l-6 46H95v-92l-18-22 24-24 24-18z" fill="${accent}" />
        <path d="M154 118c10 10 24 10 34 0" stroke="${neutral}" stroke-width="8" stroke-linecap="round" />
      `;
    case "jacket":
      return `
        <path d="M103 95l35-20h47l35 20 18 38-24 20v91H92v-91l-24-20z" fill="${accent}" />
        <path d="M161 75v169" stroke="${neutral}" stroke-width="9" stroke-linecap="round" />
        <path d="M134 129h55" stroke="${neutral}" stroke-width="6" stroke-linecap="round" opacity="0.9" />
      `;
    case "cargo":
      return `
        <path d="M126 62h69l12 67-14 116h-30l-8-70-8 70h-30l-14-116z" fill="${accent}" />
        <rect x="108" y="134" width="24" height="28" rx="6" fill="${neutral}" opacity="0.35" />
        <rect x="191" y="134" width="24" height="28" rx="6" fill="${neutral}" opacity="0.35" />
      `;
    case "joggers":
      return `
        <path d="M131 64h59l14 54-14 127h-28l-10-71-10 71h-28l-14-127z" fill="${accent}" />
        <path d="M138 83h45" stroke="${neutral}" stroke-width="6" stroke-linecap="round" opacity="0.7" />
      `;
    case "cap":
      return `
        <path d="M93 153c0-38 31-69 69-69h4c38 0 69 31 69 69z" fill="${accent}" />
        <path d="M133 154c14 0 27 2 43 8 14 5 26 7 39 4 7-2 12 5 7 11-10 12-28 16-47 12-17-4-28-12-42-12z" fill="${accent}" opacity="0.8" />
      `;
    case "tote":
      return `
        <path d="M108 100h106l-10 136H118z" fill="${accent}" />
        <path d="M134 100c0-18 12-31 28-31 16 0 28 13 28 31" stroke="${neutral}" stroke-width="10" stroke-linecap="round" fill="none" />
      `;
    case "oversized":
      return `
        <path d="M84 111l44-31h71l44 31-18 43-26-12v101H127V142l-26 12z" fill="${accent}" />
        <rect x="150" y="120" width="22" height="36" rx="6" fill="${neutral}" opacity="0.18" />
      `;
    case "tee":
    default:
      return `
        <path d="M95 101l41-26h50l41 26-17 39-25-12v113H137V128l-25 12z" fill="${accent}" />
      `;
      }
}

function renderProductIllustration(product, className = "") {
  const [accent, neutral, trim] = paletteByKey[product.visualKey] || paletteByKey.tee;
  const name = escapeHtml(product.name || "Apparel item");

  return `
    <div class="product-visual ${className}">
      <svg viewBox="0 0 320 320" role="img" aria-label="${name}">
        <defs>
          <linearGradient id="surface-${product.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f6f7f9" />
            <stop offset="100%" stop-color="#d0d4dc" />
          </linearGradient>
          <linearGradient id="glow-${product.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#9aa0ad" stop-opacity="0.5" />
          </linearGradient>
        </defs>
        <rect x="28" y="28" width="264" height="264" rx="42" fill="url(#surface-${product.id})" />
        <rect x="36" y="36" width="248" height="248" rx="34" fill="#eef1f5" />
        <circle cx="242" cy="84" r="34" fill="#0f1116" />
        <path
          d="M228 84c0-8 6-14 14-14 8 0 14 6 14 14 0 15-8 24-21 24s-21-10-21-24V66"
          fill="none"
          stroke="#f7f7f9"
          stroke-width="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        ${buildShape(product.visualKey, accent, neutral)}
        <path d="M86 246h148" stroke="${trim}" stroke-width="7" stroke-linecap="round" opacity="0.35" />
        <path d="M103 71l24-15" stroke="url(#glow-${product.id})" stroke-width="10" stroke-linecap="round" opacity="0.4" />
      </svg>
    </div>
  `;
}

function renderProductMedia(product, className = "") {
  if (product.imageUrl) {
    return `
      <div class="product-photo ${className}">
        <img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name || "Apparel item")}" loading="lazy" />
      </div>
    `;
  }

  return renderProductIllustration(product, className);
}
