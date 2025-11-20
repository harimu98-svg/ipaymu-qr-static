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
    console.log('API Key length:', API_KEY.length);
    console.log('Base URL:', IPAYMU_BASE_URL);

    try {
        // Prepare request body
        const requestBody = {
            name: 'POS Store Static QR',
            phone: '08123456789',
            email: 'pos@store.com',
            amount: '1',
            notifyUrl: callbackUrl,
            referenceId: 'pos_static_qr_' + Date.now(),
            paymentMethod: 'qris',
            paymentChannel: 'mpm',
            comments: 'QRIS Static for POS System'
        };

        // Convert to form data
        const formData = new URLSearchParams();
        Object.keys(requestBody).forEach(key => {
            formData.append(key, requestBody[key]);
        });

        const bodyString = formData.toString();
        console.log('Request Body:', bodyString);

        // ✅ FIXED: Generate signature sesuai dokumentasi iPaymu
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
        console.log('Timestamp:', timestamp);

        // Hash the request body
        const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');
        console.log('Body Hash:', bodyHash);

        // Create string to sign
        const stringToSign = `POST:${VA_NUMBER}:${bodyHash.toLowerCase()}:${API_KEY}`;
        console.log('String to Sign:', stringToSign);

        // Generate signature
        const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');
        console.log('Generated Signature:', signature);

        console.log('Sending request to iPaymu...');
        
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
        console.log('Response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            throw new Error(`iPaymu returned non-JSON: ${responseText.substring(0, 200)}`);
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
                error: error.message,
                solution: 'Check IPAYMU_VA and IPAYMU_APIKEY values'
            })
        };
    }
};
