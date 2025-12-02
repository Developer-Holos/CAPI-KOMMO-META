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
    `&scope=whatsapp_business_messaging,whatsapp_business_management,pages_show_list,pages_messaging`;

  res.redirect(url);
});

// Paso 2: Meta redirige aquí con el ?code=
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    // Intercambio por token
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

    // Datos del negocio (ACTUALIZA ESTE)
    const biz = await axios.get("https://graph.facebook.com/v20.0/me", {
      params: { access_token, fields: "id,name" },
    });

    res.send(`
      <h2>Instalado correctamente 🎉</h2>
      <p>Access Token: ${access_token}</p>
      <p>User ID: ${biz.data.id}</p>
    `);
  } catch (error) {
    console.log(error.response?.data || error);
    res.status(500).send("Error en instalación.");
  }
});

app.listen(process.env.PORT, () =>
  console.log("Backend running on port " + process.env.PORT)
);
