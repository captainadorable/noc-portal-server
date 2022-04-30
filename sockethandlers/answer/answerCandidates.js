const answerCandidates = (io, socket, MyCalls) => {
    socket.on("answerCandidates", data => {

        const call = MyCalls.GetCallFromUserId(socket.id)
        call.answerCandidates.push(data.candidates)

        let user = call.users.filter(function(u) {
          return u.id != socket.id
        });

        io.to(user[0].id).emit("answerCandidates", data.candidates)
    })
}

module.exports = answerCandidates