class Call {
    constructor(id, lesson) { //user is the creator of room
      this.lesson = lesson
      this.id = id
      this.users = []
      this.offerCandidates = []
      this.answerCandidates = []
      this.offerDesc;
      this.answerDesc;
    }

    AddUser(user) {
      this.users.push(user)
    }
  
    RemoveUser(userId) {
      this.users = this.users.filter(function(user) {
        return user.id != userId
      });
    }
  };
  
  module.exports = Call;