module.exports = (io, socket, MyCalls) => {
  socket.on("disconnect", () => {
      const call = MyCalls.GetCallFromUserId(socket.id)
      if (call) {
        let user = call.users.filter(function(u) {
          return u.id != socket.id
        });

        MyCalls.RemoveCall(call.id)

        if (!user[0]) return

        io.to(user[0].id).emit("remoteDisconnected")

      }
  });
}