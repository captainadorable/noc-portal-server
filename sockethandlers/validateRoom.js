module.exports = (io, socket, MyCalls) => {
    socket.on("validateRoom", (roomId) => {
        const call = MyCalls.calls.find(call => call.id == roomId)
  
        if (call.users.length < 2) {
          socket.emit("validateRoom", true, roomId)
        }
        else if (call.users.length >= 2) {
          socket.emit("validateRoom", "full", roomId)
        }
        else if (call.teacherStatus === "dnd" || call.teacherStatus === "idle") {
          socket.emit("validateRoom", "teacherUnavailable", roomId)
        }
        else {
          socket.emit("validateRoom", false)
        }
    })
}