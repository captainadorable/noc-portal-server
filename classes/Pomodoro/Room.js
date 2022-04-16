class Room {
    constructor(roomId, name) { //user is the creator of room
      this.id = roomId
      this.name = name
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

    FindUser(userId) {
      let user = this.users.filter(function(ele) {
        return ele.id == userId
      })
      return user ? user : undefined
    }
  };
  
  module.exports = Room;