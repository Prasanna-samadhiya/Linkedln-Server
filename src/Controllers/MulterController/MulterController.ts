import { NextFunction, Request, Response } from 'express';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {s3} from '../../Config/Config';
import userModel from '../../Modals/UserModal'; 
import { UndefinedHandler } from '../../Utils/Utilities';
import { getSignedUrlForFile } from '../../Utils/S3services';

export const uploadFile = async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileName = `${Date.now()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: "",
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    await s3.send(command);

    const fileUrl = `https://${""}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    res.status(200).json({ message: 'File uploaded successfully', url: fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'S3 upload failed' });
  }
};


export const updateProfileImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return next(UndefinedHandler(res, "Unauthorized", 401));
    }

    const file = req.file as Express.MulterS3.File;
    if (!file) {
      return next(UndefinedHandler(res, "No image file provided", 400));
    }

    const newImageUrl = file.location;
    const newImageKey = file.key;
    console.log(newImageKey);
    const preSignedUrl = await getSignedUrlForFile(file.key);
    const user = await userModel.findById(userId);
    console.log(user)
    if (user?.image) {
    try {
      const url = new URL(user.image.toString());
      const oldKey = decodeURIComponent(url.pathname.slice(1));

      console.log("Deleting old image:", oldKey);

      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: oldKey,
      }));
    } catch (err) {
      console.error("Error deleting old image from S3:", err);
    }
  }

    console.log(newImageUrl)
    user!.image = newImageUrl;
    await user!.save();

    return res.status(200).json({
      message: "Profile image updated successfully",
      imageUrl: newImageUrl,
      presignedurl:preSignedUrl
    });

  } catch (err) {
    console.error("Profile image update error:", err);
    next(UndefinedHandler(res, "Server error while updating profile image", 500));
  }
};

