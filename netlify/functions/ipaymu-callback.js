// Global in-memory store (untuk demo - production pakai database)
const payments = new Map();

exports.handler = async (event) => {
    console.log('📍 iPaymu CALLBACK Received');
    console.log('Headers:', event.headers);
    console.log('Body:', event.body);
    
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
            },
            body: ''
        };
    }
    
    // Handle GET request untuk frontend polling
    if (event.httpMethod === 'GET') {
        const { reference_id } = event.queryStringParameters || {};
        
        if (reference_id) {
            const payment = payments.get(reference_id) || { status: 'PENDING' };
            return {
                statusCode: 200,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    data: payment
                })
            };
        } else {
            // Return all payments (untuk debug)
            const allPayments = Object.fromEntries(payments);
            return {
                statusCode: 200,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    data: allPayments
                })
            };
        }
    }
    
    // Handle POST request (callback dari iPaymu)
    if (event.httpMethod === 'POST') {
        try {
            // iPaymu mengirim data sebagai application/x-www-form-urlencoded
            const params = new URLSearchParams(event.body);
            
            const callbackData = {
                trx_id: params.get('trx_id'),
                status: params.get('status'),           // 'berhasil' atau 'gagal'
                status_code: params.get('status_code'), // 1=berhasil, 0=gagal, -2=expired
                reference_id: params.get('reference_id'),
                sid: params.get('sid'),
                amount: params.get('amount'),
                timestamp: new Date().toISOString()
            };
            
            console.log('✅ iPaymu Callback Data:', callbackData);
            
            // Simpan payment status
            if (callbackData.reference_id) {
                payments.set(callbackData.reference_id, {
                    status: callbackData.status,
                    status_code: callbackData.status_code,
                    amount: callbackData.amount,
                    trx_id: callbackData.trx_id,
                    updated_at: callbackData.timestamp,
                    received_at: new Date().toISOString()
                });
                
                console.log(`💰 Payment Updated: ${callbackData.reference_id} -> ${callbackData.status}, Amount: ${callbackData.amount}`);
                
                // Log untuk frontend (bisa di-extend dengan WebSocket/SSE)
                console.log('🎯 Frontend should play sound for status:', callbackData.status);
            }
            
            // Return success ke iPaymu
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Callback processed successfully',
                    payment_received: callbackData
                })
            };
            
        } catch (error) {
            console.error('❌ Callback Error:', error);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false, 
                    error: error.message 
                })
            };
        }
    }
    
    // Method not allowed
    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
    };
};