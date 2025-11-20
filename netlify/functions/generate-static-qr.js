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

    const VA_NUMBER = process.env.IPAYMU_VA;
    const API_KEY = process.env.IPAYMU_APIKEY;
    const IPAYMU_BASE_URL = process.env.IPAYMU_BASE_URL || 'https://sandbox.ipaymu.com';
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

    const callbackUrl = `${POS_BASE_URL}/.netlify/functions/ipaymu-callback`;
    
    console.log('🔧 Generating Static QR Code...');
    console.log('VA:', VA_NUMBER);
    console.log('API Key exists:', !!API_KEY);
    console.log('Base URL:', IPAYMU_BASE_URL);
    console.log('Callback URL:', callbackUrl);

    try {
        const formData = new URLSearchParams();
        formData.append('name', 'POS Store Static QR');
        formData.append('phone', '08123456789');
        formData.append('email', 'pos@store.com');
        formData.append('amount', '1');
        formData.append('notifyUrl', callbackUrl);
        formData.append('referenceId', 'pos_static_qr_' + Date.now());
        formData.append('paymentMethod', 'qris');
        formData.append('paymentChannel', 'mpm');
        formData.append('comments', 'QRIS Static for POS System');

        // Generate signature
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
        const bodyString = formData.toString();
        const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
        const stringToSign = `POST:${VA_NUMBER}:${bodyHash}:${API_KEY}`;
        const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

        console.log('Sending request to iPaymu...');
        
        // ✅ BENAR: Base URL + endpoint
        const apiUrl = `${IPAYMU_BASE_URL}/api/v2/payment/direct`;
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

        // Handle response
        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response first 500 chars:', responseText.substring(0, 500));

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ iPaymu returned HTML instead of JSON');
            
            if (responseText.includes('Invalid') || responseText.includes('Error')) {
                throw new Error('iPaymu API returned error. Check credentials.');
            } else if (responseText.includes('Not Found')) {
                throw new Error('iPaymu API endpoint not found.');
            } else {
                throw new Error(`iPaymu returned HTML: ${responseText.substring(0, 200)}...`);
            }
        }

        console.log('iPaymu API Response Status:', data.Status);
        console.log('iPaymu API Response Message:', data.Message);

        if (data.Status !== 200) {
            throw new Error(data.Message || `iPaymu API Error: Status ${data.Status}`);
        }

        if (!data.Data || !data.Data.QrString) {
            throw new Error('No QR string received from iPaymu');
        }

        const qrString = data.Data.QrString;
        
        console.log('✅ QR Code generated successfully!');
        console.log('QR String (first 50 chars):', qrString.substring(0, 50));
        
        return {
            statusCode: 200,
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                qr_string: qrString,
                qr_url: data.Data.QrUrl,
                reference_id: data.Data.ReferenceId,
                note: 'COPY THIS QR STRING TO IPAYMU_STATIC_QR_STRING ENVIRONMENT VARIABLE'
            })
        };

    } catch (error) {
        console.error('❌ Error generating QR:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
