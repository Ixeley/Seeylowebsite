const Stripe = require("stripe");

const VALID_PRICES = new Set([
  "price_1TYUzdAFPCa1P8v5O41R8crG", // Basic Monthly
  "price_1TYV0LAFPCa1P8v59mzxNDUL", // Basic Yearly
  "price_1TYV0xAFPCa1P8v596ttjOP3", // Pro Weekly
  "price_1TYV1OAFPCa1P8v5BI27eJXo", // Pro Monthly
  "price_1TYV1nAFPCa1P8v5KhlUvsv7", // Pro Yearly
  "price_1TYV29AFPCa1P8v5BdCsFPVU", // Platinum Weekly
  "price_1TYV2jAFPCa1P8v5sE3jLzfl", // Platinum Monthly
  "price_1TYV32AFPCa1P8v5aXuG2ugG", // Platinum Yearly
]);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let priceId;
  try {
    ({ priceId } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: "Invalid request body" };
  }

  if (!VALID_PRICES.has(priceId)) {
    return { statusCode: 400, body: "Invalid price ID" };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.URL || "http://localhost:5173";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
