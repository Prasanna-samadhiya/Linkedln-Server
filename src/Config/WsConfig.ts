import WebSocket, { WebSocketServer } from "ws"

let wss:any= undefined;

const CreatewsConnection = (server:any) => {
     wss = new WebSocketServer({server});

    wss.on('connection', function connection(ws:any) {
        ws.on('error', console.error);

    });

    if(wss){
       return wss;
    }else{
       console.log("ws was not found");
       return; 
    }
}


const UseConnection = () =>{
    if(wss){
       return wss;
    }else{
       console.log("ws was not found");
       return; 
    }
}

export {CreatewsConnection,UseConnection}


