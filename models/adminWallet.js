import mongoose from "mongoose";


const adminWalletSchema = new mongoose.Schema({
 balance: {
   type: Number,
   default: 0,
   min: 0,
 }
});
const AdminWallet = mongoose.models.AdminWallet || mongoose.model("AdminWallet", adminWalletSchema);
export default AdminWallet;