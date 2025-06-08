import express, { Request, Response } from "express";
import dotenv from "dotenv";
import {DBconnect} from "./Config/Config";
import authrouter from "./Routes/AuthRouter";
import userrouter from "./Routes/UserRoute";
import postrouter from "./Routes/PostRouter";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();
const app = express();
const port = 3000;

app.use(express.json());

app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}));

app.use(cookieParser()); 

DBconnect();

app.use("/auth", authrouter);
app.use("/user", userrouter);
app.use("/post",postrouter)

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from TypeScript + Express!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
