exports.handler = async (event) => {
  // Option A: Get from Environment Variable
  const qrString = process.env.IPAYMU_STATIC_QR_STRING;
  
  if (!qrString) {
    return {
      statusCode: 404,
      body: JSON.stringify({ 
        success: false, 
        error: 'QR string not found in environment variables' 
      })
    };
  }
  
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*' 
    },
    body: qrString
  };
};