import Razorpay from 'razorpay';
import crypto from 'crypto';

console.log('⚡ Using hardcoded Razorpay credentials');

const razorpay = new Razorpay({
    key_id: "rzp_test_aMbsRSQU00vVQ6",
    key_secret: "aM0cgZA54mwwbJ3nv5KAE7fq"
});

const createOrder = async (amount, currency = 'INR', receipt = 'receipt#1') => {
    const options = {
        amount: amount * 100, // in paise
        currency,
        receipt,
        payment_capture: 1
    };

    try {
        const response = await razorpay.orders.create(options);
        console.log('✅ Razorpay order created:', response.id);
        return response;
    } catch (error) {
        console.error('❌ Error creating Razorpay order:', error);
        throw error;
    }
};

const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
        .createHmac('sha256', "aM0cgZA54mwwbJ3nv5KAE7fq") // 👈 hardcoded
        .update(text)
        .digest('hex');

    console.log('📝 Signature check:', generatedSignature === razorpaySignature);
    return generatedSignature === razorpaySignature;
};

export {
    createOrder,
    verifyPayment,
    razorpay as default
};
