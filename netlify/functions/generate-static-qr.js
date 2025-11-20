// netlify/functions/generate-static-qr.js
const crypto = require("crypto");

exports.handler = async function(event, context) {
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const IPAYMU_URL = process.env.IPAYMU_BASE_URL;
  const POS_BASE_URL = process.env.POS_BASE_URL;

  if (!VA || !APIKEY || !IPAYMU_URL || !POS_BASE_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuration error" })
    };
  }

  try {
    // ✅ TRUE STATIC QR: TIDAK PERLU AMOUNT INPUT
    const RETURN_URL = `${POS_BASE_URL}/success.html`;
    const NOTIFY_URL = `${POS_BASE_URL}/.netlify/functions/callback`;
    const referenceId = "STATIC" + Date.now();

    const body = {
      name: "My Merchant Store",      // ✅ Nama merchant
      phone: "081234567890", 
      email: "merchant@store.com",
      amount: 0,                      // ✅ AMOUNT = 0 untuk QR static
      notifyUrl: NOTIFY_URL,
      returnUrl: RETURN_URL,
      referenceId: referenceId,
      paymentMethod: "qris",
      expired: 8760,                  // ✅ 1 tahun (365 hari × 24 jam)
      expiredType: "hours", 
      comments: "Static QRIS - Customer Input Amount"
    };

    const jsonBody = JSON.stringify(body);
    
    const now = new Date();
    const timestamp = 
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const requestBodyHash = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${VA}:${requestBodyHash}:${APIKEY}`;
    const signature = crypto.createHmac("sha256", APIKEY).update(stringToSign).digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "va": VA,
      "signature": signature,
      "timestamp": timestamp
    };

    console.log("🚀 Generating TRUE Static QR (Amount: 0)");

    const response = await fetch(IPAYMU_URL, {
      method: "POST",
      headers,
      body: jsonBody
    });

    const responseData = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify(responseData)
    };

  } catch (err) {
    console.error("❌ Static QR generation error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "QR generation failed" }) 
    };
  }
};
