const offerCandidates = (io, socket, MyCalls) => {
    socket.on("offerCandidates", data => {  

        const call = MyCalls.GetCallFromUserId(socket.id)
        call.offerCandidates.push(data.candidates)

        if (call.users.length == 2) {
          let user = call.users.filter(func).filter(function(u) {
            return u.id != socket.id
          });

          io.to(user[0].id).emit("offerCandidates", data.candidates)
        }
    })
}

module.exports = offerCandidates