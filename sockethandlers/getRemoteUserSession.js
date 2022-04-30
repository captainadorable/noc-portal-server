module.exports = (io, socket, MyCalls) => {
    socket.on("getRemoteUserSession", () => {
    
        const call = MyCalls.GetCallFromUserId(socket.id)
        let user = call.users.filter(function(u) {
          return u.id != socket.id
        });
  
        socket.emit("getRemoteUserSession", (user[0].session))
    })
}