import { CreatePassword, ForgetPassword, UserLogin, UserRegister, Verifyotp } from "../Controllers/UserControllers/AuthController";
import upload from "../Middleware/Multer";
const express = require("express")

const router = express.Router();

router.post("/register",upload.single('file'),UserRegister);
router.post("/login",UserLogin);
router.post("/verifyotp",Verifyotp);
router.post("/forget",ForgetPassword);
router.post("/newp",CreatePassword);

export default router
