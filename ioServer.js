import http from 'http';
import app from './server.js'
import { initSocket } from './socket.js';
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initSocket(httpServer);
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});