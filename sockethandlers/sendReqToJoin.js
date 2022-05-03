module.exports = (io, socket, MyCalls) => {
  socket.on("sendReqToJoin", (data) => { // callId, session
      const call = MyCalls.calls.find(call => call.id == data.callId)
  
      if (!call) {
        socket.emit("roomNotFound");
        return
      }

      if (call.waitingStudents.find(student => student.userData.email === data.session.email)) return
    
      call.waitingStudents.push({ id: socket.id, userData: data.session })
  
      io.to(call.id).emit("joinRequests", call.waitingStudents) // call.id = to teacher
  })
}
