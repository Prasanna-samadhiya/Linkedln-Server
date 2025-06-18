import { addLikeToPost, createComment, CreatePost, CreateRepost, DeleteComment, GetAllComments, getAllPosts, getAllPostsSortedByCreatedAt, GetAllRepost, GetTopPostsByLikes } from "../Controllers/PostControllers/PostController";
import { Authentication } from "../Middleware/Middleware";
import upload from "../Middleware/Multer";
const express = require("express")

const router = express.Router();

router.post("/newpost",Authentication,upload.array("images"),CreatePost);
router.get("/getallposts",getAllPosts);
router.put("/like/:postId",Authentication,addLikeToPost);
router.put("/comment/:postId",Authentication,createComment);
router.get("/getcomments/:id",Authentication,GetAllComments);
router.delete("/deletecomments/:postId/:commentId",Authentication,DeleteComment);
router.post("/createrepost/:postId",Authentication,CreateRepost);
router.get("/getreposts",Authentication,GetAllRepost);
router.get("/getpostsbylikes",Authentication,GetTopPostsByLikes);
router.get("/getpostbytime",Authentication,getAllPostsSortedByCreatedAt);

export default router


