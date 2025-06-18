import { createClient } from "redis";

const ConnectRedis = async () => {
    try {
        const client = createClient();

        client.on('error', (err) => console.log('Redis Client Error:', err));

        await client.connect();
        console.log("Connected to Redis");

        const ping = await client.ping();
        console.log(ping); 

        return client;
    } catch (error) {
        console.error("connection failed:", error);
        throw error; 
    }
};

export default ConnectRedis;
