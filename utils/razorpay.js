import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (amount, currency = 'INR', receipt = 'receipt#1') => {
  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency,
    receipt,
    payment_capture: 1
  };

  try {
    const response = await razorpay.orders.create(options);
    return response;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

export const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const text = `${razorpayOrderId}|${razorpayPaymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  return generatedSignature === razorpaySignature;
};

// Export razorpay instance as default
export { razorpay };
export default razorpay;
