
let _session = null;

function createHeaders({ anonKey, accessToken, prefer } = {}) {
  const headers = {
    "Content-Type": "application/json",
    apikey: anonKey
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

function saveSession(session) {
  _session = session;
  if (session) {
    localStorage.setItem("infinitee_session", JSON.stringify(session));
  }
}

function readSession() {
  if (!_session) {
    const stored = localStorage.getItem("infinitee_session");
    if (stored) {
      try {
        _session = JSON.parse(stored);
      } catch (e) {
        // invalid json
      }
    }
  }
  return _session;
}

function clearSession() {
  _session = null;
  localStorage.removeItem("infinitee_session");
}

function publicSession(session, profile) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: {
      id: profile.id,
      email: profile.email || session.user?.email || "",
      fullName: profile.full_name || profile.fullName || session.user?.user_metadata?.full_name || "",
      role: profile.role,
      phone: profile.phone || ""
    }
  };
}

function createSupabaseService(config) {
  const { supabaseUrl, supabaseAnonKey, designBucket } = config;

  async function request(path, options = {}) {
    const response = await fetch(`${supabaseUrl}${path}`, options);

    if (!response.ok) {
      let message = "Supabase request failed.";
      try {
        const payload = await response.json();
        message = payload.message || payload.msg || payload.error_description || payload.error || message;
      } catch (error) {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function rest(path, { method = "GET", accessToken, body, prefer } = {}) {
    return request(`/rest/v1/${path}`, {
      method,
      headers: createHeaders({ anonKey: supabaseAnonKey, accessToken, prefer }),
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async function auth(path, { method = "GET", body, accessToken } = {}) {
    return request(`/auth/v1/${path}`, {
      method,
      headers: createHeaders({ anonKey: supabaseAnonKey, accessToken }),
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async function getProfile(id, accessToken) {
    const result = await rest(`profiles?select=*&id=eq.${id}`, { accessToken });
    return result[0] || null;
  }

  async function upsertProfile({ id, email, fullName, phone, role }, accessToken) {
    const payload = {
      id,
      email,
      full_name: fullName,
      phone,
      role
    };

    const existingProfile = await getProfile(id, accessToken);

    if (existingProfile) {
      await rest(`profiles?id=eq.${id}`, {
        method: "PATCH",
        accessToken,
        body: payload,
        prefer: "return=representation"
      });
      return getProfile(id, accessToken);
    }

    const created = await rest("profiles", {
      method: "POST",
      accessToken,
      body: payload,
      prefer: "return=representation"
    });

    return created[0];
  }

  async function getStoredSession() {
    const stored = readSession();

    if (!stored?.accessToken) {
      return null;
    }

    try {
      const authUser = await auth("user", {
        accessToken: stored.accessToken
      });
      const profile = await getProfile(authUser.id, stored.accessToken);

      if (!profile) {
        clearSession();
        return null;
      }

      const session = {
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        user: {
          id: profile.id,
          email: profile.email || authUser.email || "",
          fullName: profile.full_name || "",
          role: profile.role,
          phone: profile.phone || ""
        }
      };

      saveSession(session);
      return session;
    } catch (error) {
      clearSession();
      return null;
    }
  }

  async function createNotification(accessToken, userId, title, message, kind = "info") {
    await rest("notifications", {
      method: "POST",
      accessToken,
      body: {
        id: uid("not"),
        user_id: userId,
        title,
        message,
        kind,
        read: false
      },
      prefer: "return=representation"
    });
  }

  return {
    mode: "supabase",
    label: "Supabase Connected",
    async getSession() {
      return getStoredSession();
    },
    async signOut() {
      const session = readSession();
      if (session?.accessToken) {
        try {
          await auth("logout", { method: "POST", accessToken: session.accessToken });
        } catch (error) {
          // Ignore logout response errors and clear local state anyway.
        }
      }
      clearSession();
      return true;
    },
    async signUp({ fullName, email, password, phone }) {
      const signup = await auth("signup", {
        method: "POST",
        body: {
          email,
          password,
          data: {
            full_name: fullName
          }
        }
      });

      if (!signup.access_token || !signup.user) {
        throw new Error("Signup succeeded, but email confirmation is still required. Disable email confirmation in Supabase Auth for smoother demos.");
      }

      const profile = await upsertProfile(
        {
          id: signup.user.id,
          email,
          fullName,
          phone,
          role: "user"
        },
        signup.access_token
      );

      const session = publicSession(signup, profile);
      saveSession(session);
      return session.user;
    },
    async signIn({ email, password, portal }) {
      const login = await auth("token?grant_type=password", {
        method: "POST",
        body: { email, password }
      });

      const profile = await getProfile(login.user.id, login.access_token);

      if (!profile) {
        throw new Error("No profile record was found. Please run the Supabase schema first.");
      }

      if (portal === "admin" && profile.role !== "admin") {
        throw new Error("This account is not authorized for the admin portal.");
      }

      if (portal === "user" && profile.role !== "user") {
        throw new Error("Please use the admin portal for this account.");
      }

      const session = publicSession(login, profile);
      saveSession(session);
      return session.user;
    },
    async requestPasswordReset({ email }) {
      await auth("recover", {
        method: "POST",
        body: { email }
      });

      return {
        message:
          "Password reset requested. If email delivery is configured in Supabase, the reset link will be sent there."
      };
    },
    async resetPassword() {
      throw new Error("Use Supabase email recovery in connected mode, or switch to demo mode for the on-screen OTP flow.");
    },
    async fetchBootstrap(user) {
      const session = await getStoredSession();
      const accessToken = session?.accessToken || null;
      const [categories, products] = await Promise.all([
        rest("categories?select=*&order=name.asc", { accessToken }),
        rest("products?select=*&order=featured.desc,name.asc", { accessToken })
      ]);

      let orders = [];
      let notifications = [];
      let users = [];
      let feedbacks = [];

      if (user) {
        if (user.role === "admin") {
          [orders, notifications, users, feedbacks] = await Promise.all([
            rest("orders?select=*&order=created_at.desc", { accessToken }),
            rest(`notifications?select=*&user_id=eq.${user.id}&order=created_at.desc`, { accessToken }),
            rest("profiles?select=*&order=created_at.asc", { accessToken }),
            rest("feedbacks?select=*&order=created_at.desc", { accessToken }).catch(err => { console.warn("Feedbacks table not found, skipping.", err); return []; })
          ]);
        } else {
          [orders, notifications] = await Promise.all([
            rest(`orders?select=*&user_id=eq.${user.id}&order=created_at.desc`, { accessToken }),
            rest(`notifications?select=*&user_id=eq.${user.id}&order=created_at.desc`, { accessToken })
          ]);
        }
      }

      return {
        categories: categories.map((entry) => ({
          id: entry.id,
          name: entry.name,
          slug: entry.slug,
          description: entry.description,
          accentColor: entry.accent_color
        })),
        products: products.map((entry) => ({
          id: entry.id,
          name: entry.name,
          categoryId: entry.category_id,
          description: entry.description,
          imageUrl: entry.image_url || "",
          colors: entry.colors || [],
          specs: entry.specs || {},
          price: Number(entry.price),
          stock: Number(entry.stock),
          sizes: entry.sizes || [],
          featured: Boolean(entry.featured),
          visualKey: entry.visual_key,
          sustainabilityNote: entry.sustainability_note || "",
          leadTime: entry.lead_time || ""
        })),
        orders: orders.map((entry) => ({
          id: entry.id,
          orderNumber: entry.order_number,
          userId: entry.user_id,
          productId: entry.product_id,
          productName: entry.product_name,
          categoryName: entry.category_name,
          visualKey: entry.visual_key,
          orderType: entry.order_type,
          size: entry.size,
          color: entry.color || "",
          quantity: entry.quantity,
          unitPrice: Number(entry.unit_price),
          totalPrice: Number(entry.total_price),
          designTitle: entry.design_title || "",
          designDescription: entry.design_description || "",
          designImageUrl: entry.design_image_url || "",
          status: entry.status,
          paymentStatus: entry.payment_status,
          paymentLast4: entry.payment_last4 || "",
          adminNote: entry.admin_note || "",
          etaText: entry.eta_text || "",
          rejectionReason: entry.rejection_reason || "",
          createdAt: entry.created_at,
          updatedAt: entry.updated_at
        })),
        notifications: notifications.map((entry) => ({
          id: entry.id,
          userId: entry.user_id,
          title: entry.title,
          message: entry.message,
          kind: entry.kind,
          read: entry.read,
          createdAt: entry.created_at
        })),
        users: users.map((entry) => ({
          id: entry.id,
          fullName: entry.full_name,
          email: entry.email,
          role: entry.role,
          avatarUrl: entry.avatar_url,
          createdAt: entry.created_at
        })),
        feedbacks: feedbacks.map((entry) => ({
          id: entry.id,
          createdAt: entry.created_at,
          userId: entry.user_id,
          userName: entry.user_name,
          userEmail: entry.user_email,
          type: entry.type,
          rating: entry.rating,
          subject: entry.subject,
          message: entry.message
        }))
      };
    },
    async updateProfile({ userId, fullName, phone }) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const updated = await rest(`profiles?id=eq.${userId}`, {
        method: "PATCH",
        accessToken: session.accessToken,
        body: {
          full_name: fullName,
          phone
        },
        prefer: "return=representation"
      });
      const profile = updated[0];
      const nextSession = {
        ...session,
        user: {
          ...session.user,
          fullName: profile.full_name,
          phone: profile.phone
        }
      };
      saveSession(nextSession);
      return nextSession.user;
    },
    async createOrder(payload) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      let designImageUrl = payload.designImageUrl || "";

      if (payload.designFile) {
        const path = `${payload.userId}/${Date.now()}-${payload.designFile.name.replace(/\s+/g, "-")}`;
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${designBucket}/${path}`, {
          method: "POST",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${session.accessToken}`,
            "x-upsert": "true",
            "Content-Type": payload.designFile.type || "application/octet-stream"
          },
          body: payload.designFile
        });

        if (!uploadResponse.ok) {
          throw new Error("Image upload failed. Confirm that the design bucket and policies are set up.");
        }

        designImageUrl = `${supabaseUrl}/storage/v1/object/public/${designBucket}/${path}`;
      }

      const order = await rest("orders", {
        method: "POST",
        accessToken: session.accessToken,
        body: {
          id: uid("ord"),
          order_number: payload.orderNumber,
          user_id: payload.userId,
          product_id: payload.productId,
          product_name: payload.productName,
          category_name: payload.categoryName,
          visual_key: payload.visualKey,
          order_type: payload.orderType,
          size: payload.size,
          color: payload.color || "",
          quantity: payload.quantity,
          unit_price: payload.unitPrice,
          total_price: payload.totalPrice,
          design_title: payload.designTitle || "",
          design_description: payload.designDescription || "",
          design_image_url: designImageUrl,
          status: payload.status || (payload.orderType === "standard" ? "approved_waiting_payment" : "pending_review"),
          payment_status: payload.paymentStatus || (payload.orderType === "standard" ? "awaiting_payment" : "awaiting_approval"),
          payment_last4: "",
          admin_note: payload.orderType === "standard" ? "Order accepted. Please proceed to payment." : "Awaiting admin review.",
          eta_text: payload.orderType === "standard" ? "ETA pending." : "Will be issued after approval.",
          rejection_reason: ""
        },
        prefer: "return=representation"
      });

      await createNotification(
        session.accessToken,
        payload.userId,
        "Order request received",
        `Order ${payload.orderNumber} was submitted and is now waiting for admin review.`,
        "info"
      );

      return order[0];
    },
    async payOrder({ orderId, cardNumber, deliveryAddress }) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const updated = await rest(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        accessToken: session.accessToken,
        body: {
          payment_status: "paid",
          payment_last4: last4(cardNumber),
          status: "paid_confirmed",
          delivery_address: deliveryAddress || "",
          updated_at: new Date().toISOString()
        },
        prefer: "return=representation"
      });

      const order = updated[0];

      try {
        if (order.order_type === "standard" && order.product_id) {
          const productObj = await rest(`products?id=eq.${order.product_id}`);
          if (productObj && productObj.length > 0) {
            const prod = productObj[0];
            let stockUpdated = false;
            
            if (prod.colors && prod.colors.length > 0) {
              for (let c of prod.colors) {
                if (c.name === order.color) {
                  if (c.sizes) {
                    for (let s of c.sizes) {
                      if (s.name === order.size) {
                        s.stock = Math.max(0, (s.stock || 0) - order.quantity);
                        stockUpdated = true;
                      }
                    }
                  } else {
                    c.stock = Math.max(0, (c.stock || 0) - order.quantity);
                    stockUpdated = true;
                  }
                }
              }
            } else {
              prod.stock = Math.max(0, (prod.stock || 0) - order.quantity);
              stockUpdated = true;
            }

            if (stockUpdated) {
              await rest(`products?id=eq.${prod.id}`, {
                method: "PATCH",
                accessToken: session.accessToken,
                body: { stock: prod.stock, colors: prod.colors },
                prefer: "return=representation"
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to deduct stock:", err);
      }

      await createNotification(
        session.accessToken,
        order.user_id,
        "Payment confirmed",
        `Payment for ${order.order_number} was recorded successfully.`,
        "success"
      );

      return order;
    },
    async upsertProduct(payload) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      let imageUrl = payload.imageUrl || "";

      if (payload.imageFile) {
        const path = `products/${Date.now()}-${payload.imageFile.name.replace(/\s+/g, "-")}`;
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${designBucket}/${path}`, {
          method: "POST",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${session.accessToken}`,
            "x-upsert": "true",
            "Content-Type": payload.imageFile.type || "application/octet-stream"
          },
          body: payload.imageFile
        });

        if (!uploadResponse.ok) {
          throw new Error("Image upload failed. Confirm that the design bucket and policies are set up.");
        }

        imageUrl = `${supabaseUrl}/storage/v1/object/public/${designBucket}/${path}`;
      }

      const colors = await Promise.all((payload.colors || []).map(async (c, i) => {
        let colorImageUrl = c.existingUrl || "";
        if (c.file && c.file.size > 0) {
          const path = `products/color-${Date.now()}-${i}-${c.file.name.replace(/\s+/g, "-")}`;
          const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${designBucket}/${path}`, {
            method: "POST",
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${session.accessToken}`,
              "x-upsert": "true",
              "Content-Type": c.file.type || "application/octet-stream"
            },
            body: c.file
          });
          if (!uploadResponse.ok) throw new Error("Color image upload failed.");
          colorImageUrl = `${supabaseUrl}/storage/v1/object/public/${designBucket}/${path}`;
        }
        return { name: c.name, imageUrl: colorImageUrl, sizes: c.sizes, stock: c.stock };
      }));

      const body = {
        id: payload.id || uid("prod"),
        name: payload.name,
        category_id: payload.categoryId,
        description: payload.description,
        image_url: imageUrl,
        colors: colors,
        specs: payload.specs || {},
        price: payload.price,
        stock: payload.stock,
        sizes: payload.sizes,
        featured: payload.featured,
        visual_key: payload.visualKey,
        sustainability_note: payload.sustainabilityNote,
        lead_time: payload.leadTime
      };

      if (payload.id) {
        const updated = await rest(`products?id=eq.${payload.id}`, {
          method: "PATCH",
          accessToken: session.accessToken,
          body,
          prefer: "return=representation"
        });
        return updated[0];
      }

      const created = await rest("products", {
        method: "POST",
        accessToken: session.accessToken,
        body,
        prefer: "return=representation"
      });

      return created[0];
    },
    async deleteProduct(productId) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      await rest(`products?id=eq.${productId}`, {
        method: "DELETE",
        accessToken: session.accessToken
      });
      return true;
    },
    async updateOrder(orderId, updates) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const updated = await rest(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        accessToken: session.accessToken,
        body: {
          status: updates.status,
          payment_status: updates.paymentStatus,
          admin_note: updates.adminNote,
          eta_text: updates.etaText,
          rejection_reason: updates.rejectionReason,
          updated_at: new Date().toISOString()
        },
        prefer: "return=representation"
      });

      const order = updated[0];
      const noteMessage =
        order.status === "rejected"
          ? `Order ${order.order_number} was rejected. Reason: ${order.rejection_reason || "Please contact support."}`
          : `Order ${order.order_number} is now ${String(order.status).replace(/_/g, " ")}. ${order.eta_text || ""}`.trim();

      await createNotification(
        session.accessToken,
        order.user_id,
        order.status === "rejected" ? "Order rejected" : "Order status updated",
        noteMessage,
        order.status === "rejected" ? "warning" : "info"
      );

      return order;
    },
    async markNotificationRead(notificationId) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      await rest(`notifications?id=eq.${notificationId}`, {
        method: "PATCH",
        accessToken: session.accessToken,
        body: {
          read: true
        },
        prefer: "return=representation"
      });
      return true;
    },
    async fetchOrderMessages(orderId) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const messages = await rest(`order_messages?order_id=eq.${orderId}&select=*,profiles:user_id(full_name,role)&order=created_at.asc`, {
        accessToken: session.accessToken
      });
      return messages.map((m) => ({
        id: m.id,
        orderId: m.order_id,
        userId: m.user_id,
        message: m.message,
        createdAt: m.created_at,
        senderName: m.profiles?.full_name || "Unknown",
        senderRole: m.profiles?.role || "user"
      }));
    },
    async sendOrderMessage({ orderId, message }) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const payload = {
        order_id: orderId,
        user_id: session.user.id,
        message: message
      };
      const response = await rest("order_messages", {
        method: "POST",
        accessToken: session.accessToken,
        body: payload,
        prefer: "return=representation"
      });
      return response[0];
    },
    async fetchAllOrderMessages() {
      const session = await getStoredSession();
      if (!session) return [];
      const query = "order_messages?select=id,order_id,user_id,message,created_at,profiles:user_id(full_name,role)&order=created_at.asc";
      const res = await rest(query, { accessToken: session.accessToken });
      return res.map(m => ({
        id: m.id,
        orderId: m.order_id,
        userId: m.user_id,
        message: m.message,
        createdAt: m.created_at,
        senderName: m.profiles?.full_name || "Unknown",
        senderRole: m.profiles?.role || "user"
      }));
    },

    async fetchCart() {
      const session = await getStoredSession();
      if (!session) return [];
      const res = await rest(`cart_items?user_id=eq.${session.user.id}&order=created_at.asc`, { accessToken: session.accessToken });
      return res.map(item => ({
        id: item.id,
        userId: item.user_id,
        productId: item.product_id,
        productName: item.product_name,
        categoryName: item.category_name,
        visualKey: item.visual_key,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
        designTitle: item.design_title,
        designDescription: item.design_description,
        designImageUrl: item.design_image_url,
        createdAt: item.created_at
      }));
    },

    async addToCart(payload) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      
      const created = await rest("cart_items", {
        method: "POST",
        accessToken: session.accessToken,
        body: {
          user_id: payload.userId,
          product_id: payload.productId,
          product_name: payload.productName,
          category_name: payload.categoryName || "Apparel",
          visual_key: payload.visualKey,
          size: payload.size || "",
          color: payload.color || "",
          quantity: payload.quantity,
          unit_price: payload.unitPrice,
          total_price: payload.totalPrice,
          design_title: payload.designTitle || "",
          design_description: payload.designDescription || "",
          design_image_url: payload.designImageUrl || ""
        },
        prefer: "return=representation"
      });
      return created[0];
    },

    async removeFromCart(cartItemId) {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      await rest(`cart_items?id=eq.${cartItemId}`, {
        method: "DELETE",
        accessToken: session.accessToken
      });
    },

    async clearCart() {
      const session = await getStoredSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      await rest(`cart_items?user_id=eq.${session.user.id}`, {
        method: "DELETE",
        accessToken: session.accessToken
      });
    },

    async fetchFeedbacks() {
      const session = await getStoredSession();
      if (!session) throw new Error("Authentication required.");
      return await rest("feedbacks?order=created_at.desc", {
        accessToken: session.accessToken
      }).catch(err => { console.warn("Feedbacks table not found, skipping.", err); return []; });
    },

    async insertFeedback(payload) {
      const session = await getStoredSession();
      
      return await rest("feedbacks", {
        method: "POST",
        body: payload,
        accessToken: session?.accessToken
      });
    }
  };
}
