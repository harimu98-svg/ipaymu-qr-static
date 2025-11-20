const crypto = require("crypto");

exports.handler = async function(event, context) {
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const IPAYMU_URL = "https://sandbox.ipaymu.com/api/v2/transaction";

  if (!VA || !APIKEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing environment variables" })
    };
  }

  try {
    const { sessionId } = JSON.parse(event.body || "{}");
    
    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Session ID required" })
      };
    }

    const body = { transactionId: sessionId };
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

    console.log("🔍 Checking QR Status:", { sessionId });

    const response = await fetch(IPAYMU_URL, {
      method: "POST",
      headers: headers,
      body: jsonBody
    });

    const data = await response.json();
    
    console.log("📊 QR Status Result:", {
      sessionId: sessionId,
      status: data.Data?.Status,
      amount: data.Data?.Amount
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.error("❌ Check QR status error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Failed to check QR status",
        message: err.message 
      })
    };
  }
};
