import express from "express";
import { GetMessages } from "../Controllers/ChatController/ChatController"

const router = express.Router();

router.get("/messages/:user1/:user2", GetMessages);

export default router;