const express = require("express");

const path = require("path");

const app = express();
const server = require("http").createServer(app);

const io = require("socket.io")(server);

app.use(function (req, res, next) {
  console.log("ip1:", req.socket.remoteAddress);

  if (
    !checkFunction(req.url) ||
    req.socket.remoteAddress === "::1" ||
    req.socket.remoteAddress === "::ffff:127.0.0.1"
  ) {
    next();
  } else {
    res.send(401, "You are not allowed here");
  }
});

function checkFunction(url) {

  return url === "/sender.html";
}

app.use(express.static(path.join(__dirname, "public")));


io.on("connection", function (socket) {
  let socketId = socket.id;
  let clientIpFormat = socket.request.connection.remoteAddress;
  
  console.log(clientIpFormat);

  socket.on("sender-join", function (data) {
    socket.join(data.uid);
  });

  socket.on("receiver-join", function (data) {
    socket.join(data.uid);
    socket.in(data.sender_uid).emit("init", data.uid);
  });
  socket.on("file-meta", function (data) {
    socket.in(data.uid).emit("fs-meta", data.metadata);
  });
  socket.on("fs-start", function (data) {
    socket.in(data.uid).emit("fs-share", {});
  });
  socket.on("file-raw", function (data) {
    socket.in(data.uid).emit("fs-share", data.buffer);
  });
});

server.listen(5000);