const offerDescription = (io, socket, MyCalls, Call) => {
  socket.on("offerDescription", data => {

    const newCall = new Call(socket.id, data.lesson)
    newCall.AddUser({ id: socket.id, session: data.userData })
    newCall.offerDesc = data.offer
    MyCalls.calls.push(newCall)

    socket.on("changeStatus", (status) => {
      newCall.teacherStatus = status
    })

    socket.on("answerReq", (req, state) => {
      const foundReq = newCall.waitingStudents.find(std => std.id == req.id);

      if (!foundReq) return

      if (state) {
        newCall.waitingStudents = []
      }
      else {
        newCall.waitingStudents = newCall.waitingStudents.filter(function(student) {
          return student.id != req.id
        })

      }

      io.to(foundReq.id).emit("reqAnswered", state);
      io.to(newCall.id).emit("joinRequests", newCall.waitingStudents) // call.id = to teacher  
    });
    
  })
}

module.exports = offerDescription