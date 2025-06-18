import mongoose, { mongo } from "mongoose";

interface IMessage extends mongoose.Document {
    senderid: mongoose.Types.ObjectId;
    recieverid: mongoose.Types.ObjectId;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
    seen: boolean;
}

const MessageSchema = new mongoose.Schema<IMessage>({
    senderid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    recieverid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    content:{
        type: String,
        required:true
    },
    seen:{
        type:Boolean,
        default:false
    }
},{timestamps:true});

const Message = mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
