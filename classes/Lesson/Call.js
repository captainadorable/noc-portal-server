class Call {
    constructor(id, lesson) { //user is the creator of room
      this.lesson = lesson
      this.id = id
      this.users = []
      this.waitingStudents = []
      this.teacherStatus = "available" // dnd, idle
      this.offerCandidates = []
      this.answerCandidates = []
      this.offerDesc;
      this.answerDesc;
      this.connectedDate;
      this.elapsedTime;
      this.interval;
    }

    AddUser(user) {
      this.users.push(user)
    }
  
    RemoveUser(userId) {
      this.users = this.users.filter(function(user) {
        return user.id != userId
      });
    }

    StartTimeCounter(io) {
      this.interval = setInterval(() => {
        this.elapsedTime = Date.now() - this.connectedDate

        try {
          io.to(this.users[0].id).emit("elapsedTime", this.elapsedTime)
          io.to(this.users[1].id).emit("elapsedTime", this.elapsedTime)
        }
        catch (err) {
          console.log(err)
        }
      }, 1000)
    }
  };
  
  module.exports = Call;