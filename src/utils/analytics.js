function deriveAnalytics({ products, orders }) {
  const paidOrders = orders.filter((order) =>
    ["paid", "paid_confirmed", "in_production", "shipped", "delivered"].includes(order.paymentStatus) ||
    ["in_production", "shipped", "delivered", "paid_confirmed"].includes(order.status)
  );

  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const counts = new Map();

  paidOrders.forEach((order) => {
    const current = counts.get(order.productId) || {
      productId: order.productId,
      productName: order.productName,
      quantity: 0,
      revenue: 0
    };
    current.quantity += Number(order.quantity || 0);
    current.revenue += Number(order.totalPrice || 0);
    counts.set(order.productId, current);
  });

  const bestSellers = Array.from(counts.values()).sort((a, b) => b.quantity - a.quantity);
  const topSellerId = bestSellers[0]?.productId || null;
  const pendingApprovals = orders.filter((order) => order.status === "pending_review").length;
  const awaitingPayment = orders.filter((order) => order.status === "approved_waiting_payment" && order.orderType === "custom_design").length;
  const activeOrders = orders.filter((order) =>
    ["paid_confirmed", "in_production", "shipped"].includes(order.status)
  ).length;

  return {
    totalRevenue: revenue,
    bestSellers,
    topSellerId,
    pendingApprovals,
    awaitingPayment,
    activeOrders,
    fulfilledOrders: orders.filter((order) => order.status === "delivered").length,
    productCount: products.length
  };
}

function getMonthlyReport(orders, monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const filtered = orders.filter((order) => {
    const date = new Date(order.createdAt);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  const totalRevenue = filtered.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const orderCount = filtered.length;
  const paidCount = filtered.filter((order) => order.paymentStatus === "paid").length;

  const productTally = new Map();
  filtered.forEach((order) => {
    const current = productTally.get(order.productName) || { name: order.productName, quantity: 0 };
    current.quantity += Number(order.quantity || 0);
    productTally.set(order.productName, current);
  });

  const bestSeller = Array.from(productTally.values()).sort((a, b) => b.quantity - a.quantity)[0] || null;

  return {
    filtered,
    totalRevenue,
    orderCount,
    paidCount,
    bestSeller
  };
}
