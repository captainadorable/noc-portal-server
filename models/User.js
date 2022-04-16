const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    email: String,
    name: String,
    permission: String,
    profilePicture: String
})

module.exports = mongoose.model("UserDB", schema);