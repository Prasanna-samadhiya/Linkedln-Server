import mongoose, { mongo } from "mongoose";
import { Schema, Document } from "mongoose";

interface IComment extends mongoose.Document {
    postid: mongoose.Types.ObjectId
    userid: mongoose.Types.ObjectId
    message: string
}

const CommentSchema = new mongoose.Schema<IComment>({
    postid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },
    userid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    message:{
        type: String,
    }
});

const Comment = mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
