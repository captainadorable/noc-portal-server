class Rooms {
    constructor() {
      this.rooms = []
    }
  
    CreateRoom(room) {
      this.rooms.push(room);
    }

    GetRoomFromId(roomId) {
      let foundRoom = this.rooms.find(r => r.id == roomId);
      return foundRoom ? foundRoom : null;
    }
  
    GetRoomFromUserId(userId) {
      let foundRoom = this.rooms.find(r => r.FindUser(userId));
      return foundRoom ? foundRoom : undefined
    }
  };
  
  module.exports = Rooms;