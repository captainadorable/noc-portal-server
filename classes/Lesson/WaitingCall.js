class WaitingCall {
    constructor(initiator, lesson) { //user is the creator of room
      this.initiator = initiator
      this.lesson = lesson
      this.users = []
    }

    AddUser(user) {
      this.users.push(user)
    }
  
    RemoveUser(userId) {
      this.users = this.users.filter(function(ele) {
        return ele.id != userId
      });
    }
  };
  
  module.exports = WaitingCall;