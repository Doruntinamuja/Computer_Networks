(function () {
  //a global variable to hold the receiver Id and send it to the server with sockets
  //so the server knows in what room/channel the receiver is listening
  let receiverID;

  //instance of socket.io for the client side
  const socket = io();

  //Math.trunc() - returns the integer part of a number, this function generates a random ID for the sender
  function generateID() {
    return `${Math.trunc(Math.random() * 999)}-${Math.trunc(
      Math.random() * 999
    )}-${Math.trunc(Math.random() * 999)}`;
  }

  //vanilla js used to get the 'Create a room' button and fire a function on the click event
  document
    .querySelector("#sender-start-con-btn")
    .addEventListener("click", function () {
      let joinID = generateID();
      document.querySelector("#join-id").innerHTML = `
      <b>Room ID </b>
      <span>${joinID}</span>
      `;
      //send to server the sender ID so the server know in what room/channel the sender is listening
      socket.emit("sender-join", {
        uid: joinID,
      });
    });

    //after the sender and receiver rooms are created the 'init' socket is fired, the front-end is changed and
    //we are ready to share files
  socket.on("init", function (uid) {
    receiverID = uid;
    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
  });

  document
    .querySelector("#file-input")
    .addEventListener("change", function (e) {
      //get the file uploaded from the user 
      let file = e.target.files[0];

      if (!file) {
        return;
      }

      //instance of FileReader - user to read file from <input type='file'/>
      let reader = new FileReader();
      reader.onload = function (e) {
        //buffer here is an instance of Uint8Array - The Uint8Array typed array represents an array of 8-bit unsigned integers.
        let buffer = new Uint8Array(reader.result);
        console.log(buffer);
        let el = document.createElement("div");
        el.classList.add("item");
        el.innerHTML = `
        <div class="progress">0%</div>
        <div class="filename>${file.name}</div>
        `;
        document.querySelector(".files-list").appendChild(el);

        //call a function and sends as parameter the metadata-an object, our buffer, and dom element
        shareFile(
          {
            filename: file.name,
            total_buffer_size: buffer.length,
            buffer_size: 1024,
          },
          buffer,
          el.querySelector(".progress")
        );
      };
      reader.readAsArrayBuffer(file);
    });

  //This function sends the metadata the server, the server emites another socket 'fs-meta' which is
  //catched on the receiver side, the receiver side emites another socket 'fs-start' which is again catched on the
  //server side meaning that now all three the sender, the server and the receiver has the empty metadata with the buffers.
  //the server after catching this signal with the 'fs-start' socket, emites a socket 'fs-share', we catch that socket in the function
  //below we update the front end with the current buffer length that has been shared (at the begining is 0), than if we have the file uploaded,
  //which is the chunk variable below, we emit a socket 'file-raw' saying that we have the file ready to share.
  //the server catches this 'file-raw' with the chunk and receiver ID and emites the 'fs-share' socket again now in both room/channels
  //on the sender side and on the receiver side, now that this medium is created the chunk(parts of file) can be shared to the receiver side and 
  //the front end part keeps beiing up to date with the % of file shared.
  function shareFile(metadata, buffer, progress_node) {
    socket.emit("file-meta", {
      uid: receiverID,
      metadata: metadata,
    });
    socket.on("fs-share", function () {
      let chunk = buffer.slice(0, metadata.buffer_size);
      buffer = buffer.slice(metadata.buffer_size, buffer.length);
      progress_node.innerText =
        Math.trunc(
          ((metadata.total_buffer_size - buffer.length) /
            metadata.total_buffer_size) *
            100
        ) + "%";
      if (chunk.length != 0) {
        socket.emit("file-raw", {
          uid: receiverID,
          buffer: chunk,
        });
      }
    });
  }
})();
