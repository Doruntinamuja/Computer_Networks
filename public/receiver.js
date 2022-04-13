(function () {
  //a global variable to hold the sender Id and send it to the server with sockets
  //so the server knows in what room/channel the sender is listening
  let senderID;

  //instance of socket.io for the client side
  const socket = io();

  //Math.trunc() - returns the integer part of a number, this function generates a random ID for the sender
  function generateID() {
    return `${Math.trunc(Math.random() * 999)}-${Math.trunc(
      Math.random() * 999
    )}-${Math.trunc(Math.random() * 999)}`;
  }

  document
    .querySelector("#receiver-start-con-btn")
    .addEventListener("click", function () {
      senderID = document.querySelector("#join-id").value;
      if (senderID.length == 0) {
        return;
      }
      let joinID = generateID();
      //send to server the receiver ID so the server know in what room/channel the receiver is listening
      socket.emit("receiver-join", {
        uid: joinID,
        sender_uid: senderID,
      });
      document.querySelector(".join-screen").classList.remove("active");
      document.querySelector(".fs-screen").classList.add("active");
    });

  let fileShare = {};

  //after the server gets signal from the sender with 'file-meta' socket that the sender has uploaded the file,
  //the server emits a 'fs-meta' socket which is catched here, the metadata initally are blank, after the receiver catches this socket
  //emites the 'fs-start' socket claiming that is ready to receive at the senderID it sends as parameter and that was entered from the receiver.
  socket.on("fs-meta", function (metadata) {
    fileShare.metadata = metadata;
    fileShare.transmitted = 0;
    fileShare.buffer = [];

    let el = document.createElement("div");
    el.classList.add("item");
    el.innerHTML = `
          <div class="progress">0%</div>
          <div class="filename>${metadata.filename}</div>
          `;
    document.querySelector(".files-list").appendChild(el);

    fileShare.progress_node = el.querySelector(".progress");

    socket.emit("fs-start", {
      uid: senderID,
    });
  });

  //after the medium is created between the sender and the receiver using 'fs-share' socket the file begins to be shared, and the front end is 
  //up to date with the % of the file shared. After the file is shared it downloads it automatically at the receiver side.
  socket.on("fs-share", function (buffer) {
    fileShare.buffer.push(buffer);
    fileShare.transmitted += buffer.byteLength;
    fileShare.progress_node.innerText =
      Math.trunc(
        (fileShare.transmitted / fileShare.metadata.total_buffer_size) * 100
      ) + "%";

    if (fileShare.transmitted == fileShare.metadata.total_buffer_size) {
      download(new Blob(fileShare.buffer), fileShare.metadata.filename);
      fileShare = {};
    } else {
      socket.emit("fs-start", {
        uid: senderID,
      });
    }
  });
})();
  