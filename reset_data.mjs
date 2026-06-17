// Reset script: Delete all orders, order_messages, cart_items, and reset all product stock to 20
const SUPABASE_URL = "https://niangnrqlnfejxrangmk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5nbnJxbG5mZWp4cmFuZ21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjE3NjEsImV4cCI6MjA5NDkzNzc2MX0.KkGWy-fa3J_EJP9-ka2jvDCev1cx4K3sBrBbDcEan8Y";

async function rest(path, { method = "GET", body } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  };
  if (method === "DELETE" || method === "PATCH") {
    headers["Prefer"] = "return=representation";
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`FAILED ${method} ${path}:`, res.status, text);
    return null;
  }
  if (res.status === 204) return [];
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function main() {
  // 1. Delete all order messages
  console.log("Deleting all order messages...");
  await rest("order_messages?id=not.is.null", { method: "DELETE" });

  // 2. Delete all orders
  console.log("Deleting all orders...");
  await rest("orders?id=not.is.null", { method: "DELETE" });

  // 3. Delete all cart items
  console.log("Deleting all cart items...");
  await rest("cart_items?id=not.is.null", { method: "DELETE" });

  // 4. Delete all feedbacks
  console.log("Deleting all feedbacks...");
  await rest("feedbacks?id=not.is.null", { method: "DELETE" });

  // 5. Delete all notifications
  console.log("Deleting all notifications...");
  await rest("notifications?id=not.is.null", { method: "DELETE" });

  // 6. Fetch all products and reset stock to 20 for every color/size
  console.log("Fetching all products...");
  const products = await rest("products?select=*", { method: "GET" });
  if (!products || products.length === 0) {
    console.log("  No products found.");
    return;
  }

  console.log(`  Found ${products.length} products. Resetting stock to 20...`);
  for (const product of products) {
    const colors = product.colors || [];
    let totalStock = 0;

    // Reset each color's sizes stock to 20
    for (const color of colors) {
      if (color.sizes && Array.isArray(color.sizes)) {
        for (const size of color.sizes) {
          size.stock = 20;
        }
      }
      // Also reset color-level stock if it exists
      if (color.stock !== undefined) {
        color.stock = 20;
      }
    }

    // Calculate total stock
    if (colors.length > 0) {
      for (const color of colors) {
        if (color.sizes && Array.isArray(color.sizes)) {
          for (const size of color.sizes) {
            totalStock += size.stock;
          }
        } else {
          totalStock += (color.stock || 20);
        }
      }
    } else {
      totalStock = 20;
    }

    await rest(`products?id=eq.${product.id}`, {
      method: "PATCH",
      body: {
        stock: totalStock,
        colors: colors,
      },
    });
    console.log(`  ✓ ${product.name}: stock reset to ${totalStock} (${colors.length} colors)`);
  }

  console.log("\n✅ ALL DONE! Orders deleted, stock reset to 20. Refresh your site.");
}

main().catch(err => console.error("Script error:", err));
