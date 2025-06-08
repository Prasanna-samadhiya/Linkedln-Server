import { NextFunction, Request, Response } from "express";
import { ErrorHandler, UndefinedHandler } from "../../Utils/Utilities";
import userModel from "../../Modals/UserModal";
import jwt from "jsonwebtoken"
import { getSignedUrlForFile } from "../../Utils/S3services";

const GetAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await userModel.countDocuments();
    const users = await userModel.find().skip(skip).limit(limit);

    if (!users || users.length === 0) {
      return ErrorHandler(res, "No users found", 404);
    }

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (err) {
    console.log(err);
    return UndefinedHandler(res, "Server Error", 500);
  }

};


const UpdateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const GetOneUser = async (req: Request, res: Response) => {
  console.log(req.params.id);
  const id = req.params.id;

  const result = await userModel.findById(id);

  if (!result) {
    return ErrorHandler(res, "User not found", 404);
  }

  return res.status(200).json({
    success: true,
    user: result
  })
}


const UserData = async (req: Request, res: Response, next: NextFunction) => {
  const {authtoken}  = req.body;
  console.log("token:", authtoken)
  if (!authtoken) {
    return next(UndefinedHandler(res, "User not logged in yet", 401))
  }

  try {
    //typecasting process.env.SECRET to string
    const decoded = jwt.verify(authtoken, "prasanna") as {id:string};
    console.log(decoded);

    const result = await userModel.findById(decoded.id);
    
    if(!result){
      return res.status(404).json({
        success:false,
        message:"User not found"
      })
    }
    
      const payload = {
      id: result._id,
      name: result.name,
      email: result.email
    };

    const token = jwt.sign(payload, process.env.SECRET as string, { expiresIn: 86400 });
    const presignedurl  = await getSignedUrlForFile(result.image.split("/").slice(3).join("/"));

    console.log("user:", result);

    return res.cookie("linkedln", token, {  maxAge: 2 * 60 * 60 * 1000 }).status(200).json({
      success: true,
      user: result,
      token: token,
      presignedurl: presignedurl
    })
  } catch (err) {
    return next(ErrorHandler(res, "Invalid or expired token", 500))
  }
};

const updateFrameStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { frame } = req.body; // 'open', 'hiring', or 'none'

  try {
    const user = await userModel.findByIdAndUpdate(
      id,
      {status: frame },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Frame status updated', frame: user.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


export { GetAllUsers, GetOneUser, UpdateUser ,UserData,updateFrameStatus}