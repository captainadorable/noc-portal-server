const TotalStatsHandler = require("../databasehandlers/LessonStats/TotalStatsHandler")

module.exports = (io, socket, MyCalls, UserDB) => {
  socket.on("disconnect", () => {
      const call = MyCalls.GetCallFromUserId(socket.id)
      if (call) {
        
        call.users.forEach(user => {
          TotalStatsHandler.updateTotalLessons(user, UserDB)
          TotalStatsHandler.updateTotalLessonTime(user, UserDB, Math.floor(call.elapsedTime / 1000))
        });
        
        let user = call.users.filter(function(u) {
          return u.id != socket.id
        });

        MyCalls.RemoveCall(call.id)

        if (!user[0]) return

        io.to(user[0].id).emit("remoteDisconnected")

      }
  });
}