module.exports = (io, socket, MyCalls) => {
    socket.on("validateRoom", (roomId) => {
        const call = MyCalls.calls.find(call => call.id == roomId)
  
        if (call.users.length < 2 && call.teacherStatus === "available") {
          socket.emit("validateRoom", true, roomId)
          return
        }
        if (call.users.length >= 2) {
          socket.emit("validateRoom", "full", roomId)
          return
        }
        if (call.teacherStatus !== "available") {
          socket.emit("validateRoom", "teacherUnavailable", roomId)
          return
        }
        else {
          socket.emit("validateRoom", false)
          return
        }
    })
}