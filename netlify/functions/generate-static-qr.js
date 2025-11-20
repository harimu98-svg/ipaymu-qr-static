// netlify/functions/create-static-qr.js
const crypto = require("crypto");

exports.handler = async function(event, context) {
  // ✅ Environment variables
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const IPAYMU_URL = process.env.IPAYMU_BASE_URL;
  const APP_URL = process.env.POS_BASE_URL;

  // Validasi environment
  if (!VA || !APIKEY || !IPAYMU_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing environment variables" })
    };
  }

  try {
    const referenceId = "STATIC-" + Date.now();
    const RETURN_URL = `${APP_URL}/success.html`;
    const NOTIFY_URL = `${APP_URL}/.netlify/functions/callback`;

    // ✅ BODY untuk QRIS STATIC - Amount 0 (customer input)
    const body = {
      name: "Merchant Store",           // Nama merchant
      phone: "081234567890", 
      email: "merchant@store.com",
      amount: 1000,                        // ✅ AMOUNT 0 = Customer input
      notifyUrl: NOTIFY_URL,
      returnUrl: RETURN_URL,
      referenceId: referenceId,
      paymentMethod: "qris",            // ✅ QRIS method
      expired: 8760,                    // ✅ 1 TAHUN (8760 jam)
      expiredType: "hours",             // ✅ Expired dalam jam
      comments: "QRIS Static - Customer Input Amount"
    };

    const jsonBody = JSON.stringify(body);
    
    // ✅ Signature calculation (sama seperti dynamic)
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

    console.log("🚀 Creating QRIS Static:", { 
      referenceId, 
      amount: 0,           // ✅ Log amount 0
      expired: "8760 hours (1 year)" 
    });

    // ✅ Kirim request ke iPaymu
    const response = await fetch(IPAYMU_URL, {
      method: "POST",
      headers: headers,
      body: jsonBody
    });

    const responseData = await response.json();
    
    console.log("✅ QRIS Static Response:", {
      status: responseData.Status,
      sessionId: responseData.Data?.SessionId,
      qrUrl: responseData.Data?.QrUrl
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
