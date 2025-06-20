import mongoose from 'mongoose';
const connectDB =async ()=>{
    mongoose.connection.on('connected',()=>{
        console.log("db Connected");
    })
    await mongoose.connect(`mongodb://localhost:27017/ful2win`)

}
export default connectDB