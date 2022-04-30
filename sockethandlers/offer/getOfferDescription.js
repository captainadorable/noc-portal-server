const getOfferDesc = (io, socket, MyCalls) => {
    socket.on("getOfferDesc", (callId) => {
    
        const call = MyCalls.calls.find(call => call.id == callId)
        if (!call) {
          socket.emit("roomNotFound");
          return
        }
        const offerDesc = call.offerDesc
        socket.emit("getOfferDesc", offerDesc, call.lesson)
    })
}


module.exports = getOfferDesc