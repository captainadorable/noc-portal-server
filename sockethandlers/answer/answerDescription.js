const answerDescription = (io, socket, MyCalls) => {
    socket.on("answerDescription", (data) => {
        const call = MyCalls.calls.find(call => call.id == data.callId)
        call.answerDesc = data.answerDesc
        call.AddUser({ id: socket.id, session: data.userData })
    
        let user = call.users.filter(function(u) {
          return u.id != socket.id
        });
    
        io.to(user[0].id).emit('remoteDescription', call.answerDesc)
        socket.emit("getOfferCandidates", call.offerCandidates)
    
        call.connectedDate = Date.now()
        call.StartTimeCounter(io)
    });
}

module.exports = answerDescription