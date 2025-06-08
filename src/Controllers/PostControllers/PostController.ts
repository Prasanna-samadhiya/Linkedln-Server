import { NextFunction, Request, Response } from "express";
import PostModel from "../../Modals/PostModal";
import { UndefinedHandler } from "../../Utils/Utilities";
import { getSignedUrlForFile } from "../../Utils/S3services";


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
      const posts = await PostModel.find().populate('userid', 'name email image').lean();
      const userimageArr: string[] = [];
      console.log(posts)
      const postsWithPresignedUrls = await Promise.all(
         posts.map(async (post) => {
            if (post.userid && post.userid.image) {
               const userImageKey = post.userid.image.split("/").slice(3).join("/");
               const userimage = await getSignedUrlForFile(userImageKey);
               userimageArr.push(userimage)
            }
            const presignedImages = await Promise.all(
               (post.image || []).map(async (imgPath: string) => {
                  const presigned = await getSignedUrlForFile(imgPath.split("/").slice(3).join("/"));
                  return presigned;
               })
            );

            // const userimage = posts.userid.image.split("/").slice(3).join("/");

            return {
               ...post,
               userimageArr,
               presignedImages,
               // userimage
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


const addLikeToPost = async (req: Request, res: Response, next: NextFunction) => {
   try {
      const postId = req.params.postId;
      console.log(postId)
      const userId = (req as any).user._id;

      const post = await PostModel.findById(postId);

      if (!post) {
         return res.status(404).json({ success: false, message: "Post not found" });
      }

      if (post.likes.includes(userId)) {
         post.likes = post.dislikes.filter((id) => id.toString() !== userId.toString());
         await post.save();
         return res.status(200).json({ success: true, message: "Like is removed", post: post });
      }

      post.dislikes = post.dislikes.filter((id) => id.toString() !== userId.toString());

      post.likes.push(userId);

      await post.save();

      return res.status(200).json({ success: true, message: "Post liked successfully", post: post });
   } catch (error) {
      console.error("Error liking post:", error);
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

const DeleteComment = async (req: Request, res: Response, next: NextFunction) => {
   try {
      console.log(req.params)
      const { postId,commentId } = req.params;
      
      const userId = req.user?._id; 

      const post = await PostModel.findById(postId);
      if (!post) {
         return res.status(404).json({ success: false, message: "Post not found" });
      }

      const comment = post.comments.find((c: any) => c._id.toString() === commentId);
      if (!comment) {
         return res.status(404).json({ success: false, message: "Comment not found" });
      }

      if (comment.id.toString() !== userId.toString() && post.userid.toString() !== userId.toString()) {
         return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      post.comments = post.comments.filter((c: any) => c._id.toString() !== commentId);
      await post.save();

      return res.status(200).json({
         success: true,
         message: "Comment deleted successfully",
         comments:post.comments
      });

   } catch (error) {
      return next(UndefinedHandler(res, error.message as string, 500));
   }
};

export { CreatePost, getAllPosts, addLikeToPost, createComment, GetAllComments,DeleteComment }