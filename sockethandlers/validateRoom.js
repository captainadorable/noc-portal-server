module.exports = (io, socket, MyCalls) => {
    socket.on("validateRoom", (roomId) => {
        const call = MyCalls.calls.find(call => call.id == roomId)
  
        if (call) {
          socket.emit("validateRoom", call.users.length < 2 ? true : "full", roomId)
        }
        else {
          socket.emit("validateRoom", false)
        }
    })
}