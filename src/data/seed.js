const SEED_DB = {
  users: [
    {
      id: "usr-admin-001",
      email: "ryankanginnchin@gmail.com",
      fullName: "Ryan Kang",
      role: "admin",
      phone: "+60 12-455 9200",
      passwordSalt: "salt-admin-001",
      passwordHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      createdAt: "2026-04-02T09:30:00.000Z"
    },
    {
      id: "usr-user-001",
      email: "user@infinitee.studio",
      fullName: "Hana Idris",
      role: "user",
      phone: "+60 17-220 4190",
      passwordSalt: "salt-user-001",
      passwordHash: "2b0a471183ad777746a30bf5d1cd183fad8792da95ad90b7560b73801665501e",
      createdAt: "2026-04-08T10:00:00.000Z"
    },
    {
      id: "usr-user-002",
      email: "nora@sampleclient.com",
      fullName: "Nora Faris",
      role: "user",
      phone: "+60 19-673 5021",
      passwordSalt: "salt-user-002",
      passwordHash: "67272a219bc116c85d1c10fa516e4b88674d9784928a0b1b72c84d2e75fb58d3",
      createdAt: "2026-04-09T12:15:00.000Z"
    }
  ],
  categories: [
    {
      id: "cat-tee",
      name: "Studio Tees",
      slug: "studio-tees",
      description: "Precision-cut everyday tees with elevated branding touches.",
      accentColor: "#d5d7dc"
    },
    {
      id: "cat-outerwear",
      name: "Outerwear",
      slug: "outerwear",
      description: "Statement layers for events, teams, and premium drops.",
      accentColor: "#a0a4ad"
    },
    {
      id: "cat-bottoms",
      name: "Bottoms",
      slug: "bottoms",
      description: "Comfort-driven silhouettes built for movement and print pairing.",
      accentColor: "#8b919f"
    },
    {
      id: "cat-accessories",
      name: "Accessories",
      slug: "accessories",
      description: "Lightweight merch pieces that extend the collection story.",
      accentColor: "#c7c9cf"
    }
  ],
  products: [
    {
      id: "prod-tee-loop",
      name: "Monochrome Loop Tee",
      categoryId: "cat-tee",
      description: "Signature heavyweight tee with soft-touch cotton and a refined loop mark placement.",
      imageUrl: "/src/assets/products/prod-tee-loop.jpg",
      price: 89,
      stock: 48,
      sizes: ["XS", "S", "M", "L", "XL", "2XL"],
      featured: true,
      visualKey: "tee",
      sustainabilityNote: "Made in small-batch runs to reduce overproduction.",
      leadTime: "4-6 working days",
      createdAt: "2026-04-02T09:30:00.000Z"
    },
    {
      id: "prod-tee-carbon",
      name: "Carbon Oversized Tee",
      categoryId: "cat-tee",
      description: "Relaxed streetwear silhouette built for bold front and back custom prints.",
      imageUrl: "/src/assets/products/prod-tee-carbon.jpg",
      price: 99,
      stock: 35,
      sizes: ["S", "M", "L", "XL"],
      featured: true,
      visualKey: "oversized",
      sustainabilityNote: "Pattern-optimized cutting lowers fabric waste.",
      leadTime: "5-7 working days",
      createdAt: "2026-04-02T09:30:00.000Z"
    },
    {
      id: "prod-hoodie-silver",
      name: "Silverline Hoodie",
      categoryId: "cat-outerwear",
      description: "Premium brushed hoodie designed for clubs, teams, and premium merch drops.",
      imageUrl: "/src/assets/products/prod-hoodie-silver.jpg",
      price: 159,
      stock: 22,
      sizes: ["S", "M", "L", "XL"],
      featured: true,
      visualKey: "hoodie",
      sustainabilityNote: "Durable stitching extends wear cycle and lowers replacement waste.",
      leadTime: "7-10 working days",
      createdAt: "2026-04-02T09:30:00.000Z"
    },
    {
      id: "prod-jacket-nightshift",
      name: "Nightshift Coach Jacket",
      categoryId: "cat-outerwear",
      description: "Weather-ready coach jacket for premium uniforms and limited event capsules.",
      imageUrl: "/src/assets/products/prod-jacket-nightshift.jpg",
      price: 189,
      stock: 18,
      sizes: ["M", "L", "XL", "2XL"],
      featured: false,
      visualKey: "jacket",
      sustainabilityNote: "Built for repeat-use campaigns and long-term staff wear.",
      leadTime: "8-12 working days",
      createdAt: "2026-04-03T11:30:00.000Z"
    },
    {
      id: "prod-cargo-grid",
      name: "Grid Cargo Pants",
      categoryId: "cat-bottoms",
      description: "Structured cargos with print-friendly styling for cohesive team outfits.",
      imageUrl: "/src/assets/products/prod-cargo-grid.jpg",
      price: 139,
      stock: 31,
      sizes: ["S", "M", "L", "XL"],
      featured: false,
      visualKey: "cargo",
      sustainabilityNote: "Functional multi-use garment reduces one-off apparel purchases.",
      leadTime: "6-8 working days",
      createdAt: "2026-04-03T11:30:00.000Z"
    },
    {
      id: "prod-jogger-motion",
      name: "Motion Cut Joggers",
      categoryId: "cat-bottoms",
      description: "Tapered joggers engineered to pair with oversized graphic collections.",
      imageUrl: "/src/assets/products/prod-jogger-motion.jpg",
      price: 129,
      stock: 26,
      sizes: ["S", "M", "L", "XL"],
      featured: false,
      visualKey: "joggers",
      sustainabilityNote: "Efficient sizing blocks help reduce dead stock.",
      leadTime: "5-7 working days",
      createdAt: "2026-04-03T11:30:00.000Z"
    },
    {
      id: "prod-cap-studio",
      name: "Studio Mesh Cap",
      categoryId: "cat-accessories",
      description: "Breathable event-ready cap that completes merch packs and creator kits.",
      imageUrl: "/src/assets/products/prod-cap-studio.jpg",
      price: 59,
      stock: 64,
      sizes: ["Free Size"],
      featured: false,
      visualKey: "cap",
      sustainabilityNote: "Lightweight accessory for modular merch bundles.",
      leadTime: "3-5 working days",
      createdAt: "2026-04-04T08:30:00.000Z"
    },
    {
      id: "prod-tote-signature",
      name: "Signature Tote Pack",
      categoryId: "cat-accessories",
      description: "Canvas tote with broad printable area for campaigns, launches, and gifts.",
      imageUrl: "/src/assets/products/prod-tote-signature.jpg",
      price: 49,
      stock: 72,
      sizes: ["Free Size"],
      featured: true,
      visualKey: "tote",
      sustainabilityNote: "Reusable carry piece that replaces disposable packaging.",
      leadTime: "3-4 working days",
      createdAt: "2026-04-04T08:30:00.000Z"
    }
  ],
  orders: [
    {
      id: "ord-001",
      orderNumber: "INF-2026-0418-001",
      userId: "usr-user-001",
      productId: "prod-tee-loop",
      productName: "Monochrome Loop Tee",
      categoryName: "Studio Tees",
      visualKey: "tee",
      orderType: "standard",
      size: "M",
      quantity: 2,
      unitPrice: 89,
      totalPrice: 178,
      designTitle: "",
      designDescription: "",
      designImageUrl: "",
      status: "delivered",
      paymentStatus: "paid",
      paymentLast4: "1024",
      adminNote: "Delivered successfully. Thank you for choosing Infinitee.",
      etaText: "Delivered on 24 Apr 2026",
      rejectionReason: "",
      createdAt: "2026-04-18T08:10:00.000Z",
      updatedAt: "2026-04-24T16:00:00.000Z"
    },
    {
      id: "ord-002",
      orderNumber: "INF-2026-0420-002",
      userId: "usr-user-002",
      productId: "prod-tote-signature",
      productName: "Signature Tote Pack",
      categoryName: "Accessories",
      visualKey: "tote",
      orderType: "standard",
      size: "Free Size",
      quantity: 6,
      unitPrice: 49,
      totalPrice: 294,
      designTitle: "",
      designDescription: "",
      designImageUrl: "",
      status: "paid_confirmed",
      paymentStatus: "paid",
      paymentLast4: "8944",
      adminNote: "Batch packed and queued for dispatch.",
      etaText: "Arriving in 3 working days",
      rejectionReason: "",
      createdAt: "2026-04-20T07:45:00.000Z",
      updatedAt: "2026-04-21T14:30:00.000Z"
    },
    {
      id: "ord-003",
      orderNumber: "INF-2026-0503-003",
      userId: "usr-user-001",
      productId: "prod-hoodie-silver",
      productName: "Silverline Hoodie",
      categoryName: "Outerwear",
      visualKey: "hoodie",
      orderType: "custom_design",
      size: "L",
      quantity: 1,
      unitPrice: 159,
      totalPrice: 159,
      designTitle: "Faculty Leadership Summit Hoodie",
      designDescription: "Minimal front chest mark with summit text on the back in silver ink.",
      designImageUrl: "./src/assets/mock-design.svg",
      status: "approved_waiting_payment",
      paymentStatus: "awaiting_payment",
      paymentLast4: "",
      adminNote: "Approved. Please complete payment so production can begin.",
      etaText: "Estimated delivery: 6 working days after payment",
      rejectionReason: "",
      createdAt: "2026-05-03T12:10:00.000Z",
      updatedAt: "2026-05-04T09:00:00.000Z"
    }
  ],
  notifications: [
    {
      id: "not-001",
      userId: "usr-user-001",
      title: "Custom hoodie approved",
      message: "Your Faculty Leadership Summit Hoodie was approved. Payment is now open.",
      kind: "success",
      read: false,
      createdAt: "2026-05-04T09:10:00.000Z"
    },
    {
      id: "not-002",
      userId: "usr-user-001",
      title: "Delivery confirmed",
      message: "Your Monochrome Loop Tee order was delivered successfully.",
      kind: "info",
      read: true,
      createdAt: "2026-04-24T16:05:00.000Z"
    }
  ],
  passwordResets: []
};

function createSeedDatabase() {
  return JSON.parse(JSON.stringify(SEED_DB));
}
