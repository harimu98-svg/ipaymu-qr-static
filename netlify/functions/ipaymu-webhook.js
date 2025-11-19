exports.handler = async (event) => {
  console.log('iPaymu Webhook Received');
  
  const params = new URLSearchParams(event.body);
  const status = params.get('status'); // 'berhasil' atau 'gagal'
  const amount = params.get('amount'); 
  const reference_id = params.get('reference_id');
  
  console.log(`Payment: ${reference_id} -> ${status}, Amount: ${amount}`);
  
  // Trigger sound/notification
  // (akan diimplementasi dengan WebSocket/SSE)
  
  return { 
    statusCode: 200, 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, received: true }) 
  };
};