import mongoose, { mongo } from "mongoose";

interface ILike extends mongoose.Document {
    postid: mongoose.Types.ObjectId
    userid: mongoose.Types.ObjectId
}

const LikeSchema = new mongoose.Schema<ILike>({
    postid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },
    userid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

const Like = mongoose.model<ILike>('Like', LikeSchema);
export default Like;
