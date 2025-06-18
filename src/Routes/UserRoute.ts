import { updateProfileImage } from "../Controllers/MulterController/MulterController";
import { GetAllUsers, GetOneUser, UserData, UpdateUser, updateFrameStatus, GetAllUsersByPage } from "../Controllers/UserControllers/UserController";
import upload from "../Middleware/Multer";

const express = require("express")

const router = express.Router();


router.get("/alluser",GetAllUsers);
router.get("/userbypage",GetAllUsersByPage)
router.get("/getuser/:id",GetOneUser);
router.put("/updateuser/:id",UpdateUser);
router.post("/userdata",UserData);
router.put("/updatestatus/:id",updateFrameStatus)
router.put('/updateimage/:id', upload.single('file'), updateProfileImage);


export default router
