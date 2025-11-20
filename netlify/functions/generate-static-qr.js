const crypto = require('crypto');

exports.handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            body: ''
        };
    }

    const VA_NUMBER = process.env.IPAYMU_VA; // 0000000811159429
    const API_KEY = process.env.IPAYMU_APIKEY;
    
    // ✅ COBA PRODUCTION URL
    const IPAYMU_BASE_URL = process.env.IPAYMU_BASE_URL || 'https://my.ipaymu.com';
    const POS_BASE_URL = process.env.POS_BASE_URL;

    if (!VA_NUMBER || !API_KEY) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                error: 'IPAYMU_VA or IPAYMU_APIKEY environment variables missing'
            })
        };
    }

    console.log('🔧 Generating Static QR Code...');
    console.log('VA:', VA_NUMBER);
    console.log('API Key exists:', !!API_KEY);
    console.log('Base URL:', IPAYMU_BASE_URL);

    try {
        // ✅ COBA FORMAT FORM DATA (bukan JSON)
        const formData = new URLSearchParams();
        formData.append('name', 'POS Store Static QR');
        formData.append('phone', '08123456789');
        formData.append('email', 'pos@store.com');
        formData.append('amount', '1');
        formData.append('notifyUrl', `${POS_BASE_URL}/.netlify/functions/ipaymu-callback`);
        formData.append('referenceId', 'pos_static_qr_' + Date.now());
        formData.append('paymentMethod', 'qris');
        formData.append('paymentChannel', 'mpm');

        const bodyString = formData.toString();
        console.log('Request Body:', bodyString);

        // Generate signature
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
        const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
        const stringToSign = `POST:${VA_NUMBER}:${bodyHash}:${API_KEY}`;
        const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

        console.log('Timestamp:', timestamp);
        console.log('Body Hash:', bodyHash);
        console.log('Signature:', signature);

        // ✅ COBA REGULAR PAYMENT ENDPOINT
        const apiUrl = `${IPAYMU_BASE_URL}/api/v2/payment`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'va': VA_NUMBER,
                'signature': signature,
                'timestamp': timestamp
            },
            body: bodyString
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`iPaymu returned: ${responseText.substring(0, 200)}`);
        }

        if (data.Status !== 200) {
            throw new Error(data.Message || `iPaymu API Error: Status ${data.Status}`);
        }

        if (!data.Data || !data.Data.QrString) {
            throw new Error('No QR string received from iPaymu');
        }

        console.log('✅ QR Code generated successfully!');
        
        return {
            statusCode: 200,
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                qr_string: data.Data.QrString,
                note: 'COPY THIS QR STRING TO IPAYMU_STATIC_QR_STRING ENVIRONMENT VARIABLE'
            })
        };

    } catch (error) {
        console.error('❌ Error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                error: error.message,
                help: 'VA 0000000811159429 looks like production VA. Use production URL and API Key.'
            })
        };
    }
};
