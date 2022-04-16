class WaitingCalls {
    constructor() { //user is the creator of room
      this.waitingCalls = []
    }

    RemoveEmptyCalls() {
      this.waitingCalls = this.waitingCalls.filter(function(ele) {
        return ele.users.length != 0
      });
    }

    GetCallFromUserId(userId) {
      let foundCall = this.waitingCalls.find(r => r.users.find(u => u.id == userId));
      return foundCall ? foundCall : null
    }
  };
  
  module.exports = WaitingCalls;