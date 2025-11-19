exports.handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: ''
        };
    }

    const qrString = process.env.IPAYMU_STATIC_QR_STRING;
    
    if (!qrString) {
        return {
            statusCode: 404,
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: false, 
                error: 'QR string not found in environment variables',
                note: 'Run generate-static-qr.js first and set IPAYMU_STATIC_QR_STRING'
            })
        };
    }
    
    return {
        statusCode: 200,
        headers: { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/plain'
        },
        body: qrString
    };
};