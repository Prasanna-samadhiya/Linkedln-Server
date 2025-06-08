import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import otpgenerator from "otp-generator"
import userModel from "../../Modals/UserModal"; 
import { Request, Response, NextFunction } from "express";
import { CorrectHandler, ErrorHandler, getVerificationEmailHTML, SendMail, UndefinedHandler } from "../../Utils/Utilities";
import { getSignedUrlForFile } from "../../Utils/S3services";

dotenv.config();

interface AuthenticatedRequest extends Request {
  user?: any;
}


const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;
console.log(BUCKET_NAME)

const UserRegister = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log(req.file);
  try {
    const { name, email, password, description } = req.body;
    let url;
    console.log(req.body)
    const file = req.file as Express.MulterS3.File;
    console.log(req.file);

    let uploadedFileUrl = '';

    if (file) {
      const Fileurl = file.location
      console.log(Fileurl,"file url")
      console.log(file.originalname)
      const fileName = `uploads/${Date.now()}-${file.originalname}`;
      console.log(fileName)
      const key = file.key;
      let url;
  
      try {
        uploadedFileUrl = Fileurl;
        console.log(uploadedFileUrl)
        url = await getSignedUrlForFile(key);
        console.error("S3 upload succededd",url);
      } catch (uploadErr) {
        console.error("S3 upload failed:", uploadErr);
        return next(UndefinedHandler(res, "File upload failed", 500));
      }
    }

    const otp = otpgenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });

    try {
      await SendMail(
        "prasannasamadhiya035@gmail.com",
        email,
        "Email Verification",
        getVerificationEmailHTML(name, otp)
      );
    } catch (err) {
      console.error("Failed to send email:", err);
      return next(UndefinedHandler(res, "Failed to send verification email", 500));
    }

    const result = await userModel.create({
      name,
      email,
      password,
      description,
      votp: otp,
      image: uploadedFileUrl || undefined, 
    });

    const payload = {
      id: result._id,
      name: result.name,
      email: result.email,
    };

    const token = jwt.sign(payload, process.env.SECRET as string, { expiresIn: 86400 });

    return res
      .cookie("linkedlntoken", token, {  maxAge: 2 * 60 * 60 * 1000 })
      .status(200)
      .json({
        message: "User Registered successfully",
        user: result,
      });

  } catch (err) {
    console.log("Error",err);
    next(UndefinedHandler(res, "Server Error", 500));
  }
};

const UserLogin = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return next(ErrorHandler(res,"User not found",401))
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return next(ErrorHandler(res,"Incorrect password",401))
    }

    let link = user.image;
    
    const url = await getSignedUrlForFile(link.split("/").slice(3).join("/"));
    
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email
    };

    const token = jwt.sign(payload, process.env.SECRET as string, { expiresIn: 86400 });
    
    return res
      .cookie("linkedln", token, { maxAge: 2 * 60 * 60 * 1000 }) 
      .status(200)
      .json({
        message: "Logged in successfully",
        user,
        token,
        link: url
      });
  } catch (err) {
    next(UndefinedHandler(res,"Server Error",500));
  }
};

const Verifyotp = async (req: Request,res: Response) => {
  try {
    const{otp} = req.body;
    const result = await userModel.findOneAndUpdate({votp:otp},{isverified:true,votp:null},{ new: true } );

    if (!result) {
      return ErrorHandler(res,"No otp found",401);
    }

    return res.status(200).json({data:result,message:"otp verified"});
  } catch (err) {
    console.log(err);
    return UndefinedHandler(res,"Server Error",500);
  }
}


const ForgetPassword = async (req: Request, res: Response, next: NextFunction) =>{
  try{
     const {email} = req.body;
     const result = await userModel.findOne({email:email});

     if(!result){
      return ErrorHandler(res,"User not found",404);
     }

     
    const otp=otpgenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });

    try {
      await SendMail(
       "prasannasamadhiya035@gmail.com",
        email,
        "Email Verification",
        getVerificationEmailHTML(result.name,otp)
      );
    } catch (err) {
      console.error("Failed to send email:", err);
      return next(UndefinedHandler(res, "Failed to send verification email", 500));
    }

     const payload = {
      id: result._id,
      name: result.name,
      email: result.email
    };

    const token = jwt.sign(payload, process.env.SECRET as string, { expiresIn: 86400 });
    

    result.token = token;
    result.fotp = otp;
    result.save();

    return res.status(200).json({
      success:true,
      user:result
    })

  }catch(err){
    return UndefinedHandler(res,"Server Error",500)
  }
}

const CreatePassword = async (req: Request, res: Response) => {
  try {
    const { password, cpassword, token, fotp } = req.body;

    const result = await userModel.findOne({ fotp: fotp?.trim() });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "OTP Incorrect",
      });
    }

    if (password !== cpassword) {
      return res.status(401).json({
        success: false,
        message: "Password does not match",
      });
    }

    result.password = cpassword; 
    result.token = "";
    result.fotp = "";

    await result.save();

    return res.status(200).json({
      success: true,
      user: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {UserRegister,UserLogin,Verifyotp,ForgetPassword,CreatePassword}