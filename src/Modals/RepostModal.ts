import mongoose, { Schema } from "mongoose";

// If you don’t already have them imported elsewhere, define them inline or import from interfaces
export interface IUserPopulated {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  image: string;
}

export interface IPostWithUser {
  _id: mongoose.Types.ObjectId;
  userid: IUserPopulated;
  content: string;
  image: string[];
  createdAt: Date;
  likes: mongoose.Types.ObjectId[] | IUserPopulated[];
}

export interface IRepost extends mongoose.Document {
  postid: mongoose.Types.ObjectId | IPostWithUser;
  userid: mongoose.Types.ObjectId | IUserPopulated;
}

const RepostSchema = new Schema<IRepost>({
  postid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

const Repost = mongoose.model<IRepost>("Repost", RepostSchema);
export default Repost;