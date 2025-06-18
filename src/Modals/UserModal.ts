import mongoose from "mongoose";
const bcrypt = require('bcrypt');

interface IUser extends mongoose.Document {
    name: string;
    email: string;
    image: String;
    backgroundimage: String;
    password: string;
    education: { title: string, institution: string, description: string };
    experience: { company: string, joining: string, leaving: string, description: string };
    certification: { name: string, organisation: string };
    skills: string;
    status: string;
    connections: mongoose.Types.ObjectId[];
    lang: string;
    isverified: boolean;
    token: string;
    votp: string;
    fotp: string;
    description: string;
}

const UserSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    image: {
        type: String
    },
    backgroundimage: {
        type: String
    },
    password: {
        type: String,
        required: true,
    },
    education: [{
        title: {
            type: String
        },
        institution: {
            type: String
        },
        description: {
            type: String
        }
    }],
    experience: [{
        company: {
            type: String
        },
        joining: {
            type: Date
        },
        leaving: {
            type: Date
        },
        description: {
            type: String
        }
    }],
    lang: {
        type: String,
    },
    certification: [{
        name: {
            type: String
        },
        organisation: {
            type: String
        }
    }],
    skills: [{
        type: String
    }
    ],
    status:{
        type: String,
        default: "none" 
    }
    ,
    connections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isverified: {
        type: Boolean,
        required: true,
        default: false
    },
    token: {
        type: String
    },
    votp: {
        type: String,
    },
    fotp: {
        type: String,
    },
    description: {
        type: String
    }
},{timestamps:true});

UserSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
