//import express library (needed for front-end)
const express = require("express");
//import path library to get current directory path
const path = require("path");
//port number variable
const PORT = 5000;
//create an instance of express
const app = express();
//creating an server using HTTP which is a layer on top of TCP
const server = require("http").createServer(app);

//importin socket.io library and creating an instance of it
const io = require("socket.io")(server);

//using express middleware to get the path a user requested
//if the path requested is /sender.html it stops all user of accessing this path
//except the user with IP = 127.0.0.1
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

//return true or false if the url requested is /sender.html
function checkFunction(url) {
  return url === "/sender.html";
}

//import all static files for user to see, files like .html and .css
app.use(express.static(path.join(__dirname, "public")));

//uses socket.io instance to execute a function which gets a socket as parameter at the moment tha
//a user connects to our site
io.on("connection", function (socket) {
  //part of debugging
  // let clientIpFormat = socket.request.connection.remoteAddress;
  // console.log(clientIpFormat);

  //'sender-join' is a scoket emited from client side of sender and it sends from it a random id
  //this id represent a room, which is a channel that socket joins here in server side
  socket.on("sender-join", function (data) {
    socket.join(data.uid);
  });

  //'receiver-join' is a socket emited from client side of receiver and it sends from it a random id
  //this id represents another room, which is a chanel this sockets joins, but also it sends the senderId
  //a user entered in the input, we use that entered senderId to identify the chanel created with 'sender-join'
  //and emit an initialization that means the sender random ID and the ID the receiver entered are the same
  //and we are ready to send files(front-end changed)
  socket.on("receiver-join", function (data) {
    socket.join(data.uid);
    socket.in(data.sender_uid).emit("init", data.uid);
  });

  //'file-meta' is a socket created on the client side of sender, data paramter has the receiver ID
  //based on that we access the room/channel created in the above step and emit the metadata that we got
  //from sender client side, on the data parameter, to receiver client side with the socket fs-meta
  //metadata represents an object with these properties: file name, buffer total size of the file uploaded
  //and default buffer size we gave on the client side
  socket.on("file-meta", function (data) {
    socket.in(data.uid).emit("fs-meta", data.metadata);
  });

  //'fs-start' is a socket created on the receiver client side, which sends the senderId entered in the input
  //based on that senderId we access room/channel of sender and emit a socket 'fs-share' with an empty object
  //this fs-share is catched on the sender client side and emits a 'file-raw' socket with the buffer of the file
  //uploaded by the sender
  socket.on("fs-start", function (data) {
    socket.in(data.uid).emit("fs-share", {});
  });

  //'file-raw' emited in the sender client side, gets the buffer of file uploaded by the sender and sends it back to
  //with the fs-share socket, which now is catched on the receiver client side
  socket.on("file-raw", function (data) {
    socket.in(data.uid).emit("fs-share", data.buffer);
  });
});

server.listen(PORT, () => {
  console.log(`Listening at port ${PORT}`);
});
