const { MercadoPagoConfig, Preference } = require("mercadopago");

const createPreference = async (req, res, next) => {
  try {
    const { tituloPlan, precio } = req.body;

    if (!tituloPlan || precio === undefined || Number(precio) <= 0) {
      return res.status(400).json({
        error: "Debe enviar tituloPlan y precio válido",
      });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        error: "Falta configurar MP_ACCESS_TOKEN en variables de entorno",
      });
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const preferenceClient = new Preference(client);

    const bodyData = {
      items: [
        {
          title: tituloPlan,
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number(precio),
        },
      ],
      back_urls: {
        success: "http://127.0.0.1:4200",
        failure: "http://127.0.0.1:4200",
        pending: "http://127.0.0.1:4200",
      }
      // 🔥 Borramos o comentamos el auto_return para que MP deje de llorar en local
    };

    // 🔥 ESTE LOG ES CLAVE PARA VER QUÉ LE LLEGA A MP 🔥
    console.log("=== DATOS ENVIADOS A MERCADO PAGO ===");
    console.log(JSON.stringify(bodyData, null, 2));

    const preference = await preferenceClient.create({
      body: bodyData,
    });

    return res.status(201).json({
      id: preference.id,
      init_point: preference.init_point,
    });
  } catch (error) {
    console.error("=== ERROR DE MERCADO PAGO ===", error);
    return next(error);
  }
};

module.exports = {
  createPreference,
};