class Calls {
    constructor() { //user is the creator of room
      this.calls = []
    }

    GetCallFromUserId(userId) {
      let foundCall = this.calls.find(r => r.users.find(u => u.id == userId));
      return foundCall ? foundCall : null
    }

    RemoveCall(callId) {
      this.calls = this.calls.filter(function(call) {
        return call.id != callId
      })
    }
  };
  
  module.exports = Calls;