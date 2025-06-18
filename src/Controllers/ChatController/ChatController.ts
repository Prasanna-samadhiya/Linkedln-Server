import { Request, Response } from "express";
import { UseConnection } from "../../Config/WsConfig";
import Message from "../../Modals/MessageModal";
import { getSignedUrlForFile } from "../../Utils/S3services";

const clients = new Map<string, any>();

const ManageWebsockets = async (wss:any) => {

  try {
    console.log(wss ? "hi" : "bye");

    if (wss) {
      wss.on("connection", (ws: any) => {
        console.log("New WebSocket connection");

        ws.on("message", async (data: any) => {
          const message = JSON.parse(data);
          console.log("received:", message);

          if (message.type === "connection") {
            ws._id = message._id;
            ws.name = message.name;

            clients.set(ws._id, ws);
            console.log("Stored", ws._id, ws.name);

            ws.send(JSON.stringify({ type: "connection", id: ws._id, name: ws.name, }));
          }

          else if (message.type === "sendmessage") {
            const targetSocket = clients.get(message.to_id);
            const fromSocket = clients.get(message.from_id);

            if (targetSocket) {
              targetSocket.send(JSON.stringify({ type: "sendmessage", from: message.from_id, to: message.to_id, content: message.content }));
              console.log("Message sent to", message.to_id);
            }

            // if (fromSocket) {
            //     fromSocket.send(
            //         JSON.stringify({type: "sendmessage",to: message.to_id,content: message.content})
            //     );
            // }
            await Message.create({ senderid: message.from_id, recieverid: message.to_id, content: message.content });

            console.log("Message saved to DB");
          }

          else if (message.type === "seen") {
            console.log("Seen payload:", message);

            for (const ele of message.messages) {
              if (ele.reciver === message.userid) {
                await Message.findByIdAndUpdate(ele.messageid, { seen: true });
                console.log("Marked as seen:", ele.messageid);
                  }
                }
              }
            });


        ws.on("close", () => {
          if (ws._id) {
            clients.delete(ws._id);
            console.log("Client disconnected:", ws._id);
          }
        });
      });
    } else {
      console.log("No WebSocket server found");
    }
  } catch (error) {
    console.error("error:", error);
  }


};

const GetMessages = async (req: Request, res: Response) => {
  const { user1, user2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderid: user1, recieverid: user2 },
        { senderid: user2, recieverid: user1 },
      ],
    });

    const formattedMessages = messages.map((msg) => ({
      content: msg.content,
      senderid: msg.senderid,
      recieverid: msg.recieverid,
      createdAt: msg.createdAt,
      id: msg._id,
      formattedTime: msg?.createdAt?.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }));

    res.status(200).json({
      message: "Chat fetched successfully",
      messages: formattedMessages,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error });
  }
};

export { ManageWebsockets, GetMessages };
