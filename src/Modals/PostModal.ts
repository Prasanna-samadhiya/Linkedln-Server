import mongoose from "mongoose";
const bcrypt = require('bcrypt');

export interface IUserPopulated {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  image: string;
}

interface IComment {
  id: mongoose.Types.ObjectId;
  message: string;
}

export interface IPostWithUser {
  _id: mongoose.Types.ObjectId;
  userid: IUserPopulated; 
  image: string; 
  content: string; 
  createdAt: Date;
}

interface IPost extends mongoose.Document {
    content: string;
    userid: IPostWithUser
    image: string[];
    likes: mongoose.Types.ObjectId[];
    comments: IComment[]
    Repost: mongoose.Types.ObjectId;
}

const PostSchema = new mongoose.Schema<IPost>({
    content: {
        type: String,
        required: true,
    },
    userid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    image:[ {
        type: String,
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    Repost: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
    comments: [{ id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        message: {
            type: String
        }
    }]
},{timestamps:true});

const Post = mongoose.model<IPost>('Post', PostSchema);
export default Post;
