import RazorpayLib from 'razorpay';
import crypto from 'crypto';

console.log('🚀🚀 THIS IS THE HARD-CODED RAZORPAY FILE RUNNING 🚀🚀');

const razorpay = new RazorpayLib({
    key_id: "rzp_test_aMbsRSQU00vVQ6",
    key_secret: "aM0cgZA54mwwbJ3nv5KAE7fq"
});
console.log("✔ Razorpay initialized with:", razorpay.key_id, razorpay.key_secret);

export const createOrder = async (amount, currency = 'INR', receipt = 'receipt#1') => {
    return await razorpay.orders.create({
        amount: amount * 100,
        currency,
        receipt,
        payment_capture: 1
    });
};

export const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
        .createHmac('sha256', "aM0cgZA54mwwbJ3nv5KAE7fq")
        .update(text)
        .digest('hex');
    console.log('Signature match:', generatedSignature === razorpaySignature);
    return generatedSignature === razorpaySignature;
};

export default razorpay;
