exports.handler = async function(event, context) {
  // Handle callback dari iPaymu untuk QRIS Static
  const body = JSON.parse(event.body || "{}");
  
  console.log("📞 QRIS Static Callback Received:", {
    trx_id: body.trx_id,
    status: body.status,
    status_code: body.status_code,
    reference_id: body.reference_id,
    amount: body.amount,
    timestamp: new Date().toISOString()
  });

  // Process payment status update
  if (body.status === "berhasil" || body.status_code === 1) {
    console.log("💰 PAYMENT SUCCESS:", {
      transactionId: body.trx_id,
      referenceId: body.reference_id,
      amount: body.amount,
      paidAt: new Date().toISOString()
    });
    
    // ✅ Disini bisa:
    // - Update database
    // - Send notification
    // - Update order status
    // - dll
  } else if (body.status === "expired" || body.status_code === -2) {
    console.log("⏰ PAYMENT EXPIRED:", {
      referenceId: body.reference_id
    });
  } else if (body.status === "pending" || body.status_code === 0) {
    console.log("⏳ PAYMENT PENDING:", {
      referenceId: body.reference_id
    });
  }

  // Selalu return 200 ke iPaymu
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status: "callback_processed",
      message: "Callback received successfully",
      timestamp: new Date().toISOString()
    })
  };
};
