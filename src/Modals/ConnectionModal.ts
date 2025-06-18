import mongoose, { mongo } from "mongoose";

interface IConnection extends mongoose.Document {
    requesterid: mongoose.Types.ObjectId;
    recipientid: mongoose.Types.ObjectId;
    status:string;
}

const ConnectionSchema = new mongoose.Schema<IConnection>({
    requesterid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recipientid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status:{
        type: String,
        enum: ["pending","confirmed","rejected"],
        default: "",
        required: true
    }
},{timestamps:true});

const Connection = mongoose.model<IConnection>('Connection', ConnectionSchema);
export default Connection;
