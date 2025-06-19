import nodemailer from "nodemailer";
import { Response } from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const CorrectHandler = (res: Response, message: string, statuscode: number) => {
    return res.status(statuscode).json({
        success: true,
        message: message
    });
}

const ErrorHandler = (res: Response, message: string, statuscode: number) => {
    return res.status(statuscode).json({
        success: false,  // Assuming this should be false since it's an error handler
        message: message,
    });
}

const UndefinedHandler = (res: Response, message: string, statuscode: number) => {
    return res.status(statuscode).json({
        success: false,  // Assuming this should be false since it's an undefined handler
        message: message,
    });
}

const SendMail = async (from: string,to: string,subject: string,html: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: "prasannasamadhiya035@gmail.com",
      pass: "ccfz qddr jpkn tvmn"
    }
  });

  const mailOptions = { from, to, subject, html };

  await new Promise<void>((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        reject(error);
      } else {
        console.log("Email sent:", info.response);
        resolve();
      }
    });
  });
};

const TokenHandler =(payload:any,tokenname:string)=>{
    
    const token = jwt.sign(payload, process.env.SECRET as string, { expiresIn: 86400 }); 
    console.log(token)
    return token
}

const getVerificationEmailHTML = (name: string, otp: string) =>{return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      background: #ffffff;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px 30px;
      border-radius: 8px;
      box-shadow: 0px 0px 10px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
    }
    .header h2 {
      color: #0a66c2;
      margin: 0;
    }
    .content {
      font-size: 16px;
      color: #333333;
      line-height: 1.5;
    }
    .otp-box {
      margin: 20px 0;
      font-size: 22px;
      font-weight: bold;
      background: #e8f0fe;
      color: #0a66c2;
      padding: 12px;
      text-align: center;
      border-radius: 6px;
      letter-spacing: 4px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #888;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>LinkedIn Clone</h2>
    </div>
    <div class="content">
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thanks for signing up! Please verify your email address using the OTP below:</p>
      <div class="otp-box">${otp}</div>
      <p>This OTP will expire in 10 minutes. Do not share it with anyone.</p>
      <p>If you did not register for our service, please ignore this email.</p>
      <p>Best regards,<br>LinkedIn Clone Team</p>
    </div>
    <div class="footer">
      &copy; 2025 LinkedIn Clone. All rights reserved.
    </div>
  </div>
</body>
</html>
`};


export { CorrectHandler, ErrorHandler, UndefinedHandler, SendMail ,getVerificationEmailHTML };
