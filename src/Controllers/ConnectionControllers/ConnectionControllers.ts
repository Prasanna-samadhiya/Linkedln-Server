import { NextFunction, Request, Response } from "express";
import { ErrorHandler, UndefinedHandler } from "../../Utils/Utilities";
import Connection from "../../Modals/ConnectionModal";
import { getSignedUrlForFile } from "../../Utils/S3services";
import mongoose from "mongoose";
import User from "../../Modals/UserModal";
import Message from "../../Modals/MessageModal";


const SendRequests = async (req: Request, res: Response, next: NextFunction) => {

  const { requestorId } = req.params;
  const {recipientId} = req.body; 


  if (!recipientId || !requestorId) {
    return next(ErrorHandler(res, "Ids are missing", 401));
  }

  const request = await Connection.find(
     { $and: [{ $or: [{recipientid: recipientId}, {requesterid: requestorId }] }, { status: "pending" }] }
  );

  console.log(request,request.length)
  if (request.length!=0) {
    console.log(request)
    return next(ErrorHandler(res, "Request already exist", 401));
  }

  const con = await Connection.create({
    recipientid: recipientId,
    requesterid: requestorId,
    status: "pending"
  });

  return res.status(200).json({
    success: true,
    message: "request created",
    con
  })

}


const GetRequests = async (req: Request, res: Response, next: NextFunction) => {

  const { recipientId, requestorId } = req.params;

  if (!recipientId||!requestorId) {
    return next(ErrorHandler(res, "Ids are missing", 401));
  }

  const Requests = await Connection.find({ $and: [{ $or: [{ recipientid: recipientId, requesterid: requestorId }] }, { status: "pending" }] });

  return res.status(200).json({
    success: true,
    message: "Requests fetched successfully",
    Requests
  })
}

const GetConnectionUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params; 

        const connections = await Connection.find({
            $or: [{ requesterid: userId }, { recipientid: userId }],
            status: { $in: ["pending", "rejected"] } 
        });

       console.log(connections);

        const requestedUserIds = connections
            .filter(conn => conn.requesterid.toString() === userId)
            .map(conn => conn.recipientid.toString());

        const receivedUserIds = connections
            .filter(conn => conn.recipientid.toString() === userId)
            .map(conn => conn.requesterid.toString());

        const confirmedUserIds = connections
            .filter(conn => conn.status === "confirmed")
            .map(conn => [conn.requesterid.toString(), conn.recipientid.toString()])
            .flat();
        console.log("confirmed:",confirmedUserIds)
        const suggestedUsers = await User.find({
            _id: { $nin: [ ...confirmedUserIds, userId] } 
        }).select("name email image skills description").lean();

        if (suggestedUsers.length === 0) {
            return next(ErrorHandler(res, "No connection suggestions found", 404));
        }

        const newUsers = await Promise.all(suggestedUsers.map(async (user) => {
            if (user.image) {
                const key = user.image.split("/").slice(3).join("/");
                user.image = await getSignedUrlForFile(key);
            }
            return user;
        }));

        const temp = await Promise.all(newUsers.map(async(ele)=>{
            const connection = await Connection.find({
                $or:[
                    {$and:[{$and:[{requesterid:userId},{recipientid:ele._id}]},{status:"pending"}]},
                    {$and:[{$and:[{requesterid:ele._id},{recipientid:userId}]},{status:"pending"}]}
                ]
            })

            if(connection.length!=0){
               const sample = {...ele,button:"pending"};
               return sample
            }else{
               const sample = {...ele,button:"connect"};
               return sample
            }

        }))

        return res.status(200).json({
            success: true,
            message: "Connection suggestions fetched successfully",
            temp,
        });

    } catch (err) {
        console.error("Error fetching connections:", err);
        return next(UndefinedHandler(res, "Server Error", 500));
    }
};

const getRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return next(ErrorHandler(res, "Invalid user ID", 400));
        }

        const requests = await Connection.find({
            recipientid: userId,
            status: "pending"
        });

        const requesterIds = requests.map(conn => conn.requesterid.toString());

        if (requesterIds.length === 0) {
            return next(ErrorHandler(res, "No connection requests found", 404));
        }

        const requestUsers = await User.find({
            _id: { $in: requesterIds }
        }).select("name email image skills description").lean();

        const newUsers = await Promise.all(requestUsers.map(async (user) => {
            if (user.image) {
                const key = user.image.split("/").slice(3).join("/");
                user.image = await getSignedUrlForFile(key);
            }

            return {
                ...user,
                button: "pending" 
            };
        }));

        return res.status(200).json({
            success: true,
            message: "Connection requests fetched successfully",
            newUsers,
        });

    } catch (err) {
        console.error("Error fetching connection requests:", err);
        return next(UndefinedHandler(res, "Server Error", 500));
    }
};

const AcceptRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, requesterId } = req.params; 
        console.log(req.params);

        const connection = await Connection.findOne({
            recipientid: userId,
            requesterid: requesterId,
            status: "pending"
        });

        console.log("connection",connection)

        const user = await User.findById(userId);
        const requester = await User.findById(requesterId);
        

        console.log("user:",user)
        if (!connection) {
            return next(ErrorHandler(res, "No pending request found", 404));
        }

        connection.status = "confirmed";
        user?.connections.push(new mongoose.Types.ObjectId(requesterId));
        requester?.connections.push(new mongoose.Types.ObjectId(requesterId));
        await user?.save();
        await requester?.save();
        await connection.save();

        return res.status(200).json({
            success: true,
            message: "Request accepted successfully",
            user,
            connection
        });

    } catch (err) {
        console.error("Error accepting connection request:", err);
        return next(UndefinedHandler(res, "Server Error", 500));
    }
};

const RejectRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, requesterId } = req.params; 

        const connection = await Connection.findOne({
            recipientid: userId,
            requesterid: requesterId,
            status: "pending"
        });

        if (!connection) {
            return next(ErrorHandler(res, "No pending request found", 404));
        }

        connection.status = "rejected";
        await connection.save();

        return res.status(200).json({
            success: true,
            message: "Connection request rejected successfully",
            connection
        });

    } catch (err) {
        console.error("Error rejecting connection request:", err);
        return next(UndefinedHandler(res, "Server Error", 500));
    }
};

const ShowConnections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return next(ErrorHandler(res, "Id is missing", 401));
    }

    const user = await User.findById(userId).populate("connections").lean();

    if (!user || !user.connections) {
      return next(ErrorHandler(res, "User or connections not found", 404));
    }

    const updatedConnections = await Promise.all(
      user.connections.map(async (conn: any) => {

        if (conn.image) {
          const key = conn.image.split("/").slice(3).join("/"); 
          conn.image = await getSignedUrlForFile(key); 
        }

         const unseenCount = await Message.countDocuments({
          senderid: conn._id,
          recieverid: userId,
          seen: false
        });

        return {
          ...conn,
          unseenCount
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Connections fetched successfully",
      connections: updatedConnections,
    });

  } catch (err) {
    console.error("ShowConnections error:", err);
    return UndefinedHandler(res, "Server Error", 500);
  }
};

export { SendRequests,GetRequests,GetConnectionUser,getRequests,AcceptRequest,RejectRequest,ShowConnections }
