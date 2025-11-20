const crypto = require("crypto");

exports.handler = async function(event, context) {
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const IPAYMU_URL = process.env.IPAYMU_BASE_URL;
  const APP_URL = process.env.POS_BASE_URL;

  if (!VA || !APIKEY || !IPAYMU_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing environment variables" })
    };
  }

  try {
    const referenceId = "STATIC-" + Date.now();
    const RETURN_URL = `${APP_URL}/success.html`;
    const NOTIFY_URL = `${APP_URL}/.netlify/functions/ipaymu-callback`;

    const body = {
      name: "Merchant Store",
      phone: "081234567890", 
      email: "merchant@store.com",
      amount: 1000,
      notifyUrl: NOTIFY_URL,
      returnUrl: RETURN_URL,
      referenceId: referenceId,
      paymentMethod: "qris",
      expired: 8760,
      expiredType: "hours",
      comments: "QRIS Static - Minimal Rp 1.000"
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

    console.log("🚀 Creating QRIS Static:", { referenceId, amount: 1000 });

    const response = await fetch(IPAYMU_URL, {
      method: "POST",
      headers: headers,
      body: jsonBody
    });

    const responseData = await response.json();
    
    console.log("✅ QRIS Static Response:", {
      status: responseData.Status,
      sessionId: responseData.Data?.SessionId
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseData)
    };

  } catch (err) {
    console.error("❌ QRIS Static creation error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "QRIS Static generation failed",
        message: err.message 
      })
    };
  }
};
