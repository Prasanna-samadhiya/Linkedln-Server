import { NextFunction, Request, Response } from "express";
import PostModel from "../../Modals/PostModal";
import { ErrorHandler, UndefinedHandler } from "../../Utils/Utilities";
import { getSignedUrlForFile } from "../../Utils/S3services";
import Repost, { IPostWithUser, IUserPopulated } from "../../Modals/RepostModal";
import mongoose from "mongoose";


interface AuthenticatedRequest extends Request {
   user?: any;
}

const CreatePost = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
   try {
      const { content } = req.body;
      const userid = req.user?._id;
      const unsignedurl: string[] = [];
      const presignedurl: string[] = [];
      const file = req.files as Express.MulterS3.File[];
      console.log("file", req.files);

      let uploadedFileUrl = '';

      if (file) {
         file.map(async (ele) => {
            const Fileurl = ele.location
            console.log(Fileurl, "file url")
            console.log(ele.originalname)
            const fileName = `uploads/${Date.now()}-${ele.originalname}`;
            console.log(fileName)
            const key = ele.key;
            let url;

            try {
               uploadedFileUrl = Fileurl;
               unsignedurl.push(Fileurl);
               console.log(uploadedFileUrl)
               url = await getSignedUrlForFile(key);
               presignedurl.push(url);
               console.error("S3 upload succededd", url);
            } catch (uploadErr) {
               console.error("S3 upload failed:", uploadErr);
               return res.status(500).json({
                  success: false,
                  message: uploadErr
               });
            }
         })

      }

      if (!content || !userid) {
         return res.status(400).json({ message: 'Content and user ID are required' });
      }

      const newPost = new PostModel({
         content,
         userid,
         image: unsignedurl,
         likes: [],
         dislikes: [],
         comments: [],
      });

      await newPost.save();

      return res.status(201).json({ message: 'Post created successfully', post: newPost, urls: presignedurl });
   } catch (error) {
      console.error('Error creating post:', error);
      return res.status(500).json({ message: 'Internal server error' });
   }
};

const getAllPosts = async (req: Request, res: Response, next: NextFunction) => {
   try {
      const posts = await PostModel.find().populate('userid').populate('likes', 'name email description image').lean();

      const postsWithPresignedUrls = await Promise.all(
         posts.map(async (post) => {
            let userPresignedImage = "";

            console.log("Userid:", post.userid);
            if (post.userid && post.userid.image) {
               const userImageKey = post.userid.image.split("/").slice(3).join("/");

               userPresignedImage = await getSignedUrlForFile(userImageKey);
            }

            const presignedImages = await Promise.all(
               (post.image || []).map(async (imgPath: string) => {
                  const imageKey = imgPath.split("/").slice(3).join("/");
                  return await getSignedUrlForFile(imageKey);
               })
            );

            const likesWithPresignedImages = await Promise.all(
               (post.likes || []).map(async (user: any) => {
                  let presignedImage = "";
                  if (user.image) {
                     const key = user.image.split("/").slice(3).join("/");
                     presignedImage = await getSignedUrlForFile(key);
                  }


                  return {
                     ...user,
                     image: presignedImage,
                  };
               })
            );

            return {
               ...post,
               userid: {
                  ...post.userid,
                  image: userPresignedImage,
               },
               likes: likesWithPresignedImages,
               presignedImages,
            };
         })
      );

      return res.status(200).json({
         success: true,
         message: 'Posts fetched successfully',
         postsWithPresignedUrls
      });
   } catch (error) {
      console.error('Error fetching posts:', error);
      return res.status(500).json({
         success: false,
         message: 'Internal server error',
      });
   }
};

const GetTopPostsByLikes = async (req: Request, res: Response, next: NextFunction) => {
   try {
      const posts = await PostModel.aggregate([
         {
            $addFields: {
               totallikes: { $size: "$likes" }
            }
         },
         {
            $sort: {
               totallikes: -1
            }
         }
      ]);

      const populatedPosts = await PostModel.populate(posts, [
         { path: "userid" },
         { path: "likes", select: "name email description image" }
      ]);

      const postsWithPresignedUrls = await Promise.all(
         populatedPosts.map(async (post: any) => {
            let userPresignedImage = "";
            if (post.userid?.image) {
               const key = post.userid.image.split("/").slice(3).join("/");
               userPresignedImage = await getSignedUrlForFile(key);
               post.userid.image = userPresignedImage;
            }

            post.presignedImages = await Promise.all(
               (post.image || []).map(async (imgPath: string) => {
                  const key = imgPath.split("/").slice(3).join("/");
                  return await getSignedUrlForFile(key);
               })
            );

            post.likes = await Promise.all(
               (post.likes || []).map(async (user: any) => {
                  if (user?.image) {
                     const key = user.image.split("/").slice(3).join("/");
                     const presigned = await getSignedUrlForFile(key);
                     user.image = presigned;
                  }
                  return user;
               })
            );

            return post;
         })
      );

      return res.status(200).json({
         success: true,
         message: "Posts fetched and sorted by total likes",
         postsWithPresignedUrls
      });
   } catch (error) {
      console.error("Error fetching top liked posts:", error);
      return res.status(500).json({
         success: false,
         message: "Internal server error"
      });
   }
};

const getAllPostsSortedByCreatedAt = async (req: Request, res: Response, next: NextFunction) => {
   try {
      const posts = await PostModel.aggregate([
         {
            $sort: { createdAt: -1 }
         },
         {
            $lookup: {
               from: "users",
               localField: "userid",
               foreignField: "_id",
               as: "userid"
            }
         },
         {
            $unwind: "$userid"
         },
         {
            $lookup: {
               from: "users",
               localField: "likes",
               foreignField: "_id",
               as: "likes"
            }
         },
         {
            $addFields: {
               totallikes: { $size: "$likes" }
            }
         }
      ]);

      const postsWithPresignedUrls = await Promise.all(
         posts.map(async (post: any) => {
            if (post.userid?.image) {
               const key = post.userid.image.split("/").slice(3).join("/");
               post.userid.image = await getSignedUrlForFile(key);
            }

            post.presignedImages = await Promise.all(
               (post.image || []).map(async (imgPath: string) => {
                  const key = imgPath.split("/").slice(3).join("/");
                  return await getSignedUrlForFile(key);
               })
            );

            post.likes = await Promise.all(
               (post.likes || []).map(async (user: any) => {
                  if (user?.image) {
                     const key = user.image.split("/").slice(3).join("/");
                     user.image = await getSignedUrlForFile(key);
                  }
                  return user;
               })
            );

            return post;
         })
      );

      return res.status(200).json({
         success: true,
         message: "Posts fetched and sorted by creation time",
         postsWithPresignedUrls
      });
   } catch (error) {
      console.error("Error fetching posts:", error);
      return res.status(500).json({
         success: false,
         message: "Server error while fetching posts",
         error: error
      });
   }
};


const addLikeToPost = async (req: Request, res: Response, next: NextFunction) => {
   try {
      const postId = req.params.postId;
      const userId = (req as any).user._id;

      const post = await PostModel.findById(postId);

      if (!post) {
         return res.status(404).json({ success: false, message: "Post not found" });
      }

      const isLiked = post.likes.includes(userId.toString());

      if (isLiked) {
         post.likes = post.likes.filter(id => id.toString() !== userId.toString());
         await post.save();
         return res.status(200).json({ success: true, message: "Like removed", post });
      } else {
         post.likes.push(userId);
         await post.save();
         return res.status(200).json({ success: true, message: "Post liked", post });
      }
   } catch (error) {
      console.error("Error toggling like:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
   }
};

const createComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
   try {
      const postId = req.params.postId;
      const { message } = req.body;
      const userId = req.user?._id;

      if (!postId || !message || !userId) {
         return res.status(400).json({ message: "Post ID and message are required" });
      }

      const post = await PostModel.findById(postId).populate("comments.id", "name image description");


      if (!post) {
         return res.status(404).json({ message: "Post not found" });
      }

      post.comments.push({
         id: userId,
         message
      });

      await post.save();

      await Promise.all(post?.comments.map(async (ele: any, index, arr) => {
         if (ele.id && ele.id.image) {
            const url = await getSignedUrlForFile(ele.id.image.split("/").slice(3).join("/"));
            ele.id.image = url;
         }
      }) || []);

      return res.status(200).json({
         success: true,
         message: "Comment added successfully",
         comments: post.comments,
      });
   } catch (error) {
      console.error("Error creating comment:", error);
      return res.status(500).json({ message: "Internal server error" });
   }
};

const GetAllComments = async (req: Request, res: Response, next: NextFunction) => {

   try {

      const postid = req.params.id;
      const post = await PostModel.findById(postid).populate("comments.id", "name image description");

      await Promise.all(post?.comments.map(async (ele: any, index, arr) => {
         if (ele.id && ele.id.image) {
            const url = await getSignedUrlForFile(ele.id.image.split("/").slice(3).join("/"));
            ele.id.image = url;
         }
      }) || []);


      return res.status(200).json({
         success: true,
         message: "comments fetched successfully",
         comments: post?.comments,
      })

   } catch (error) {
      return next(UndefinedHandler(res, "Server Error", 500))
   }

}

const DeleteComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
   try {
      console.log(req.params)
      const { postId, commentId } = req.params;

      const userId = req.user?._id;

      const post = await PostModel.findById(postId);
      if (!post) {
         return res.status(404).json({ success: false, message: "Post not found" });
      }

      const comment = post.comments.find((c: any) => c._id.toString() === commentId);
      if (!comment) {
         return next(ErrorHandler(res, "Comment not found", 404));
      }

      if (comment.id.toString() !== userId.toString() && post.userid.toString() !== userId.toString()) {
         return next(ErrorHandler(res, "not your comment", 403));
      }

      post.comments = post.comments.filter((c: any) => c._id.toString() !== commentId);
      await post.save();

      return res.status(200).json({
         success: true,
         message: "Comment deleted successfully",
         comments: post.comments
      });

   } catch (error: any) {
      return next(UndefinedHandler(res, error.message as string, 500));
   }
};


const CreateRepost = async (req: Request, res: Response, next: NextFunction) => {
   const { postId } = req.params;

   if (!postId) {
      return next(ErrorHandler(res, "Post Id is not available", 401));
   }

   if (!mongoose.Types.ObjectId.isValid(postId)) {
      return next(ErrorHandler(res, "Invalid Post ID format", 400));
   }

   const post = await PostModel.findById(postId);

   if (!post) {
      return next(ErrorHandler(res, "Post not found", 404));
   }

   const repost = await Repost.create({
      postid: post._id,
      userid: post.userid,
   });

   if (!repost) {
      return next(ErrorHandler(res, "Error creating repost", 401));
   }

   return res.status(200).json({
      success: true,
      repost,
   });
};

function isPopulatedUser(user: any): user is IUserPopulated {
   return user && typeof user === "object" && "image" in user;
}

function isPopulatedPost(post: any): post is IPostWithUser {
   return post && typeof post === "object" && "image" in post;
}

const GetAllRepost = async (req: Request, res: Response, next: NextFunction) => {
   try {
      const reposts = await Repost.find()
         .populate({
            path: "postid",
            populate: [
               { path: "userid" },
               { path: "likes", select: "name email description image" }
            ],
         })
         .populate("userid")
         .lean();

      if (!reposts || reposts.length === 0) {
         return next(ErrorHandler(res, "No reposts found", 404));
      }

      const postsWithPresignedUrls = await Promise.all(
         reposts.map(async (repost) => {
            if (typeof repost.userid !== "string" && "image" in repost.userid) {
               const key = repost.userid.image.split("/").slice(3).join("/");
               repost.userid.image = await getSignedUrlForFile(key);
            }



            if (repost.postid && typeof repost.postid === "object" && "userid" in repost.postid && isPopulatedUser(repost.postid.userid)
            ) {
               const key = repost.postid.userid.image.split("/").slice(3).join("/");
               repost.postid.userid.image = await getSignedUrlForFile(key);
            }

            let presignedImages: string[] = [];

            if (isPopulatedPost(repost.postid)) {
               presignedImages = await Promise.all(
                  (repost.postid.image || []).map(async (imgPath: string) => {
                     const key = imgPath.split("/").slice(3).join("/");
                     return await getSignedUrlForFile(key);
                  })
               );
            }

            let likesWithPresignedImages: any[] = [];

            if (isPopulatedPost(repost.postid)) {
               likesWithPresignedImages = await Promise.all(
                  (repost.postid.likes || []).map(async (user: any) => {
                     let presignedImage = "";
                     if (user.image) {
                        const key = user.image.split("/").slice(3).join("/");
                        presignedImage = await getSignedUrlForFile(key);
                     }
                     return {
                        ...user,
                        image: presignedImage,
                     };
                  })
               );
            }

            if (isPopulatedPost(repost.postid)) {
               return {
                  ...repost.postid,
                  userid: {
                     ...repost.postid.userid,
                     image: repost.postid.userid.image,
                  },
                  repostedBy: repost.userid,
                  likes: likesWithPresignedImages,
                  presignedImages,
               };
            }
         })
      );

      return res.status(200).json({
         success: true,
         message: "Reposts fetched successfully",
         postsWithPresignedUrls,
      });
   } catch (error) {
      console.error("Error fetching reposts:", error);
      return res.status(500).json({
         success: false,
         message: "Internal server error",
      });
   }
};

export { CreatePost, getAllPosts, addLikeToPost, createComment, GetAllComments, DeleteComment, CreateRepost, GetAllRepost, GetTopPostsByLikes, getAllPostsSortedByCreatedAt }