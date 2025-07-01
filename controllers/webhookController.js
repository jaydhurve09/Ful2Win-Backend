const Wallet = require('../models/Wallet');
const { verifyPayment } = require('../utils/razorpay');

// @desc    Handle Razorpay webhook events
// @route   POST /api/webhooks/razorpay
// @access  Public (Razorpay will call this)
exports.handleWebhook = async (req, res) => {
  // Get the signature from the headers
  const razorpaySignature = req.headers['x-razorpay-signature'];
  
  // For raw body verification, we need to access the raw body
  // This requires proper middleware configuration (see server.js)
  const rawBody = req.rawBody || JSON.stringify(req.body);
  
  try {
    // Verify the webhook signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', '') // Webhook secret removed
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    const { event, payload } = req.body;
    
    // Handle payment.captured event
    if (event === 'payment.captured') {
      const payment = payload.payment?.entity;
      
      if (!payment) {
        return res.status(400).json({ success: false, error: 'Invalid payment data' });
      }
      
      const { order_id, id: payment_id, amount, notes } = payment;
      const userId = notes?.userId;
      
      if (!userId) {
        console.error('No userId in payment notes');
        return res.status(400).json({ success: false, error: 'Missing userId in payment notes' });
      }
      
      // Start a session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Find or create wallet
        let wallet = await Wallet.findOne({ user: userId }).session(session);
        
        if (!wallet) {
          wallet = new Wallet({
            user: userId,
            balance: 0,
            transactions: []
          });
        }
        
        // Convert amount from paise to rupees
        const amountInRupees = amount / 100;
        
        // Update wallet balance
        wallet.balance += amountInRupees;
        
        // Add transaction record
        wallet.transactions.push({
          amount: amountInRupees,
          type: 'credit',
          description: 'Wallet top-up via Razorpay',
          reference: payment_id,
          status: 'completed',
          metadata: {
            orderId: order_id,
            paymentMethod: payment.method || 'unknown',
            bank: payment.bank || null,
            cardId: payment.card_id || null
          }
        });
        
        await wallet.save({ session });
        await session.commitTransaction();
        session.endSession();
        
        console.log(`Successfully processed webhook for payment ${payment_id}`);
        res.status(200).json({ success: true });
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error processing webhook:', error);
        throw error;
      }
    } else {
      // For other events, just acknowledge
      console.log(`Received unhandled webhook event: ${event}`);
      res.status(200).json({ success: true, message: 'Event received but not processed' });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Webhook processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
