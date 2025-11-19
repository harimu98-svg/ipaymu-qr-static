exports.handler = async (event) => {
  const VA_NUMBER = process.env.IPAYMU_VA;
  const API_KEY = process.env.IPAYMU_API_KEY;
  const IPAYMU_BASE_URL = process.env.IPAYMU_BASE_URL || 'https://my.ipaymu.com';
  const POS_BASE_URL = process.env.POS_BASE_URL;
  
  const webhookUrl = `${POS_BASE_URL}/.netlify/functions/ipaymu-webhook`;
  
  console.log('Generating Static QR with:', {
    va: VA_NUMBER,
    baseUrl: IPAYMU_BASE_URL,
    webhook: webhookUrl
  });

  const formData = new URLSearchParams();
  formData.append('name', 'POS Store Static QR');
  formData.append('phone', '08123456789');
  formData.append('email', 'pos@store.com');
  formData.append('amount', 1);
  formData.append('notifyUrl', webhookUrl);
  formData.append('referenceId', 'pos_static_qr_001');
  formData.append('paymentMethod', 'qris');
  formData.append('paymentChannel', 'mpm');
  formData.append('comments', 'QRIS Static for POS System');

  try {
    const response = await fetch(`${IPAYMU_BASE_URL}/api/v2/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'va': VA_NUMBER,
        'signature': await generateSignature('POST', formData.toString(), API_KEY),
        'timestamp': new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)
      },
      body: formData
    });

    const data = await response.json();
    
    if (data.Status !== 200) {
      throw new Error(data.Message || 'iPaymu API error');
    }

    // ✅ COPY QR STRING INI ke Environment Variable!
    const qrString = data.Data.QrString;
    console.log('✅ SUCCESS! Copy this QR String to IPAYMU_STATIC_QR_STRING:');
    console.log('QR_STRING:', qrString);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        qr_string: qrString,
        note: 'COPY THIS QR STRING TO IPAYMU_STATIC_QR_STRING ENV VARIABLE'
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

// iPaymu signature function
async function generateSignature(method, body, apiKey) {
  // Implement signature generation
  // (sama seperti sebelumnya)
}