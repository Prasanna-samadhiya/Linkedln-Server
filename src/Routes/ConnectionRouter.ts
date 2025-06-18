
// import express from "express";
const express =require("express")
import { AcceptRequest, GetConnectionUser, getRequests, GetRequests, RejectRequest, SendRequests, ShowConnections } from "../Controllers/ConnectionControllers/ConnectionControllers";

const router = express.Router();

router.post("/sendrequest/:requestorId",SendRequests);
router.get("/getrequest/:recipientId/:requestorId",GetRequests);
router.get("/getnetworkuser/:userId",GetConnectionUser);
router.get("/getrequests/:userId",getRequests);
router.put("/confirmconnection/:userId/:requesterId",AcceptRequest);
router.put("/rejectconnection/:userId/:requesterId",RejectRequest);
router.get("/showconnections/:userId",ShowConnections);


export default router
