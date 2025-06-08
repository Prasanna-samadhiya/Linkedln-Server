import mongoose from "mongoose";
import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";


dotenv.config()

const DBconnect=async()=>{
    await mongoose.connect(process.env.URI as string).then(
    ()=>{console.log("DB connected")
}).catch((err:any)=>{
    console.log(err)
})
}

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});


export {DBconnect,s3}