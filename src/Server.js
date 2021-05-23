const { on } = require("events");
const express = require("express");
const app = express();
const server = require("http").Server(app);
const port = process.env.PORT || 3000; //heroku port or default port 3000
const io = require("socket.io")(server);

app.use("/", express.static(__dirname + "/client/"));

// Start server
server.listen(port, () => console.log(`Server is running on port ${port}`));

const playerNames = [];
const playersInfo = {
  spectators: [],
  blueOps: [],
  redOps: [],
  blueSpy: { socketID: null, username: null },
  redSpy: { socketID: null, username: null },
  host: { socketID: null, username: null },
};

const gameInfo = {
  maxNOps: 4,
  maxNSpies: 1,
};

io.on("connection", (socket) => {
  playerNames.push({ socketID: socket.id, username: null });
  console.log("Player entered : ", playerNames);
  socket.emit("updatePlayers", playersInfo);

  socket.on("newPlayerJoined", (name) => {
    const { spectators } = playersInfo;
    const playerIndex = playerNames
      .map((player) => player.socketID)
      .indexOf(socket.id);
    playerNames[playerIndex].username = name;
    //
    console.log("PlayerNames : ", playerNames);
    spectators.push(name);

    console.log("Host situation ", playersInfo.host);
    if (playersInfo.host.username === null) {
      setCell(playersInfo.host, socket.id, name);
      console.log("host ", playersInfo.host.username);
      io.sockets.emit("addNewHost", playersInfo.host.username);
    }

    io.sockets.emit("addNewPlayer", name);
  });
  socket.on("disconnect", () => {
    const { blueOps, redOps, spectators } = playersInfo;
    const playerIndex = playerNames
      .map((player) => player.socketID)
      .indexOf(socket.id);
    const playerName = playerNames[playerIndex].username;

    playerNames.splice(playerIndex, 1);
    if (playersInfo.host.socketID === socket.id) {
      io.sockets.emit("removeHost", playersInfo.host.username);
      setCell(playersInfo.host, null, null);
      for (let i = 0; i < playerNames.length; i++) {
        if (playerNames[i].username !== null){
          console.log("Problem not here");
          console.log("chose this one", playerNames[i]);
          setCell(
            playersInfo.host,
            playerNames[i].socketID,
            playerNames[i].username
          );
          break
        }
      }
      console.log("new host ", playersInfo.host);
      socket
        .to(playersInfo.host.socketID)
        .emit("alertFromServer", "You are the host now!");
    }
    io.sockets.emit("addNewHost", playersInfo.host.username);
    // Consider if the player have been playing not just watching
    if (blueOps.includes(playerName)) {
      blueOps.splice(blueOps.indexOf(playerName), 1);
      console.log("removing blue: ", playerName);
      io.sockets.emit("removeBlueOp", playerName);
    } else if (redOps.includes(playerName)) {
      redOps.splice(redOps.indexOf(playerName), 1);
      console.log("removing red: ", playerName);
      io.sockets.emit("removeRedOp", playerName);
    } else {
      console.log("removing spectator: ", playerName);
      spectators.splice(spectators.indexOf(playerName), 1);
      io.sockets.emit("removeSpectator", playerName);
    }
    console.log("Players after disconnect : ", playerNames);
  });

  socket.on("joinedBlueOps", (client) => {
    const { spectators, blueOps, redOps, blueSpy, redSpy } = playersInfo;
    // if spectator
    if (client.name === "" || blueOps.includes(client.name)) {
      console.log("Player already in list");
      return;
    }
    if (blueOps.length >= gameInfo.maxNOps) {
      console.log("Team is full");
      socket.emit("alertFromServer", "Team is full");
      return;
    }
    if (client.team === "") {
      client.team = "b";
      spectators.splice(spectators.indexOf(client.name), 1);
      blueOps.push(client.name);
      io.sockets.emit("removeSpectator", client.name);
    } else if (client.team === "r") {
      client.team = "b";
      if (client.isSpymaster) {
        client.isSpymaster = false;
        setCell(redSpy, null, null);
        blueOps.push(client.name);
        io.sockets.emit("removeRedSpy", client.name);
      } else {
        redOps.splice(redOps.indexOf(client.name), 1);
        blueOps.push(client.name);
        io.sockets.emit("removeRedOps", client.name);
      }
    } else if (client.team === "b" && client.isSpymaster) {
      client.isSpymaster = false;
      setCell(blueSpy, null, null);
      blueOps.push(client.name);
      io.sockets.emit("removeBlueSpy", client.name);
    }
    io.sockets.emit("addBlueOps", client.name);
    socket.emit("updateClient", client);
  });

  socket.on("joinedRedOps", (client) => {
    const { spectators, blueOps, redOps, blueSpy, redSpy } = playersInfo;
    // if spectator
    if (client.name === "" || redOps.includes(client.name)) {
      console.log("Player already in list");
      return;
    }
    if (redOps.length >= gameInfo.maxNOps) {
      console.log("Team is full");
      socket.emit("alertFromServer", "Team is full");
      return;
    }
    if (client.team === "") {
      client.team = "r";
      spectators.splice(spectators.indexOf(client.name), 1);
      redOps.push(client.name);
      io.sockets.emit("removeSpectator", client.name);
    } else if (client.team === "b") {
      client.team = "r";
      if (client.isSpymaster) {
        client.isSpymaster = false;
        setCell(blueSpy, null, null);
        redOps.push(client.name);
        io.sockets.emit("removeBlueSpy", client.name);
      } else {
        blueOps.splice(blueOps.indexOf(client.name), 1);
        redOps.push(client.name);
        io.sockets.emit("removeBlueOps", client.name);
      }
    } else if (client.team === "r" && client.isSpymaster) {
      client.isSpymaster = false;
      setCell(redSpy, null, null);
      redOps.push(client.name);
      io.sockets.emit("removeRedSpy", client.name);
    }
    io.sockets.emit("addRedOps", client.name);
    socket.emit("updateClient", client);
  });

  socket.on("joinedBlueSpy", (client) => {
    const { spectators, blueOps, redOps, blueSpy, redSpy } = playersInfo;
    // if spectator
    if (client.name === "") {
      console.log("Player already in list");
      return;
    }
    // check if blueSpy is not occupied
    if (spyExists(blueSpy)) {
      console.log("Occupied by someone else");
      socket.emit("alertFromServer", "occupied by someone else");
      return;
    }
    if (client.team === "") {
      client.team = "b";
      spectators.splice(spectators.indexOf(client.name), 1);
      io.sockets.emit("removeSpectator", client.name);
    } else if (client.team === "r") {
      client.team = "b";
      if (client.isSpymaster) {
        setCell(redSpy, null, null);
        io.sockets.emit("removeRedSpy", client.name);
      } else {
        redOps.splice(blueOps.indexOf(client.name), 1);
        io.sockets.emit("removeRedOps", client.name);
      }
    } else if (client.team === "b" && !client.isSpymaster) {
      blueOps.splice(blueOps.indexOf(client.name), 1);
      io.sockets.emit("removeBlueOps", client.name);
    }
    client.isSpymaster = true;
    setCell(blueSpy, socket.id, client.name);
    io.sockets.emit("addBlueSpy", client.name);
    socket.emit("updateClient", client);
  });

  socket.on("joinedRedSpy", (client) => {
    const { spectators, blueOps, redOps, blueSpy, redSpy } = playersInfo;
    // if spectator
    if (client.name === "") {
      console.log("Player already in list");
      return;
    }
    // check if blueSpy is not occupied
    if (spyExists(redSpy)) {
      console.log("Occupied by someone else");
      socket.emit("alertFromServer", "occupied by someone else");
      return;
    }
    if (client.team === "") {
      client.team = "r";
      spectators.splice(spectators.indexOf(client.name), 1);
      io.sockets.emit("removeSpectator", client.name);
    } else if (client.team === "b") {
      client.team = "r";
      if (client.isSpymaster) {
        setCell(blueSpy, null, null);
        io.sockets.emit("removeBlueSpy", client.name);
      } else {
        blueOps.splice(blueOps.indexOf(client.name), 1);
        io.sockets.emit("removeBlueOps", client.name);
      }
    } else if (client.team === "r" && !client.isSpymaster) {
      redOps.splice(redOps.indexOf(client.name), 1);
      io.sockets.emit("removeRedOps", client.name);
    }
    client.isSpymaster = true;
    setCell(redSpy, socket.id, client.name);
    io.sockets.emit("addRedSpy", client.name);
    socket.emit("updateClient", client);
  });

  /* Game */
  socket.on;
});

function setCell(cell, socketID, username) {
  cell.socketID = socketID;
  cell.username = username;
}

function spyExists(spy) {
  return spy.socketID !== null;
}
