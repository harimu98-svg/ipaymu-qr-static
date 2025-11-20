// netlify/functions/generate-static-qr.js
const crypto = require("crypto");

exports.handler = async function(event, context) {
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const IPAYMU_URL = process.env.IPAYMU_BASE_URL;
  
  // ✅ PERBAIKAN: Gunakan POS_BASE_URL dari env var
  const POS_BASE_URL = process.env.POS_BASE_URL || "https://babehipaymuqrstatic.netlify.app";
  const RETURN_URL = `${POS_BASE_URL}/success.html`;
  const NOTIFY_URL = `${POS_BASE_URL}/.netlify/functions/callback`;

  // Validasi environment variables
  if (!VA || !APIKEY || !IPAYMU_URL || !POS_BASE_URL) {
    console.error("❌ Missing environment variables");
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: "Payment service configuration error",
        message: "Please check server configuration"
      })
    };
  }

  try {
    const { amount } = JSON.parse(event.body || "{}");
    
    if (!amount || amount < 1000) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: "Invalid amount",
          message: "Minimum payment amount is Rp 1.000" 
        }) 
      };
    }

    const referenceId = "STATIC" + Date.now();

    // ✅ Parameter lengkap dengan POS_BASE_URL yang benar
    const body = {
      name: "Static QR Customer",
      phone: "081234567890", 
      email: "static@email.com",
      amount: parseInt(amount),
      notifyUrl: NOTIFY_URL,        // ✅ Menggunakan POS_BASE_URL
      returnUrl: RETURN_URL,        // ✅ Menggunakan POS_BASE_URL
      referenceId: referenceId,
      paymentMethod: "qris",
      expired: 720, // Expiry lebih lama untuk static QR (30 hari)
      expiredType: "hours",
      comments: "Static QRIS Payment"
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

    console.log("🚀 Generating Static QR:", { 
      amount, 
      referenceId,
      posBaseUrl: POS_BASE_URL,    // ✅ Log untuk debug
      notifyUrl: NOTIFY_URL,
      returnUrl: RETURN_URL
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(IPAYMU_URL, {
        method: "POST",
        headers,
        body: jsonBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: "Invalid response from payment gateway",
            rawResponse: responseText.substring(0, 200) + "..."
          })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return {
          statusCode: 408,
          body: JSON.stringify({ 
            error: "Payment gateway timeout",
            message: "Please try again in a moment"
          })
        };
      }
      throw fetchError;
    }

  } catch (err) {
    console.error("❌ Static QR generation error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: "Static QR generation failed",
        message: err.message
      }) 
    };
  }
};
