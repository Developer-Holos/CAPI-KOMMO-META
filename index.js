import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config.js";

const app = express();
app.use(cors());
app.use(express.json());

// Paso 1: URL que tu widget abrirá
app.get("/auth/login", (req, res) => {
  const url =
    `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI)}` +
    `&scope=business_management,whatsapp_business_messaging,whatsapp_business_management,pages_show_list,pages_messaging`;

  res.redirect(url);
});

// === STEP 2: CALLBACK ===
app.get("/auth/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing code");
    // === EXCHANGE FOR ACCESS TOKEN ===
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v20.0/oauth/access_token",
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: process.env.META_REDIRECT_URI,
          code,
        },
      }
    );
    const access_token = tokenRes.data.access_token;
    // ================
    // GET USER PROFILE
    // ================
    const user = await axios.get("https://graph.facebook.com/v20.0/me", {
      params: { access_token, fields: "id,name" },
    });
    // ==================================
    // GET BUSINESS ACCOUNTS OF THIS USER
    // ==================================
    const businesses = await axios.get(
      `https://graph.facebook.com/v20.0/${user.data.id}/businesses`,
      { params: { access_token } }
    );
    const business_id = businesses.data.data?.[0]?.id || null;
    // ==================================
    // GET WHATSAPP BUSINESS ACCOUNTS
    // ==================================
    let waba_id = null;
    if (business_id) {
      const wabaRes = await axios.get(
        `https://graph.facebook.com/v20.0/${business_id}/owned_whatsapp_business_accounts`,
        { params: { access_token } }
      );
      waba_id = wabaRes.data.data?.[0]?.id || null;
    }
    // ==================================
    // GET PHONE NUMBERS (IF WABA FOUND)
    // ==================================
    let phone_numbers = [];
    if (waba_id) {
      const phoneRes = await axios.get(
        `https://graph.facebook.com/v20.0/${waba_id}/phone_numbers`,
        { params: { access_token } }
      );
      phone_numbers = phoneRes.data.data;
    }
    // ==================================
    // GET PAGES (OPTIONAL)
    // ==================================
    const pages = await axios.get(
      `https://graph.facebook.com/v20.0/me/accounts`,
      { params: { access_token } }
    );
    // ============
    // RESPONSE HTML
    // ============
    res.send(`
      <h2>Instalación Correcta 🎉</h2>
      <p><b>User:</b> ${user.data.name} (${user.data.id})</p>
      <p><b>Access Token:</b> ${access_token}</p>

      <h3>Business Manager</h3>
      <p>${business_id || "❌ No se encontró Business"}</p>

      <h3>WABA (WhatsApp Business Account)</h3>
      <p>${waba_id || "❌ No se encontró WABA"}</p>

      <h3>Phone Numbers</h3>
      <pre>${JSON.stringify(phone_numbers, null, 2)}</pre>

      <h3>Páginas</h3>
      <pre>${JSON.stringify(pages.data.data, null, 2)}</pre>
    `);
  } catch (error) {
    console.log("❌ ERROR CALLBACK:", error.response?.data || error);
    res.status(500).send("Error al completar instalación.");
  }
});

app.listen(process.env.PORT, () =>
  console.log("Backend on PORT " + process.env.PORT)
);