import http from "http";
import "dotenv/config";
import app from "./src/app.js";
import { initRealtime } from "./src/realtime/socket.js";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initRealtime(server);

server.listen(PORT, () => {
  console.log(`Learning platform API + realtime listening on port ${PORT}`);
});
