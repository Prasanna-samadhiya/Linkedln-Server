import { NextFunction, Request } from "express";
import { ErrorHandler, UndefinedHandler } from "../Utils/Utilities";
import  jwt, { JwtPayload }  from "jsonwebtoken";
import User from "../Modals/UserModal";

//Using interface for adding user to the request object
interface AuthenticatedRequest extends Request {
  user?: any;
}

export const Authentication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { linkedln } = req.cookies;
    console.log(linkedln)
    const authtoken = linkedln;
    console.log("token:",authtoken)
    if (!authtoken) {
      return next(UndefinedHandler(res,"User not logged in yet",401))
    }
  
    try {
      const decoded = jwt.verify(authtoken, "prasanna")as JwtPayload & { id: string };;
      console.log(decoded);
  
      req.user = await User.findById(decoded.id);
      console.log("user:",req.user);
      next();
    } catch (err) {
      return next(ErrorHandler(res,"Invalid or expired token",500))
    }
  };