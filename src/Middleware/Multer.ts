import multer, { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import {s3} from '../Config/Config';


const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME!,
   
    key: (req: Request, file: Express.Multer.File, cb) => {
      const fileName = `image/${Date.now().toString()}-${file.originalname}`;
      cb(null, fileName);
    },
    
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, 
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    console.log("Received file field:", file.fieldname);
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  },
});

export default upload;
