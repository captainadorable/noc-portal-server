const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    email: String,
    name: String,
    permission: String,
    username: { type: String, required: true, default: "nousername"},
    profileBio: { type: String, required: true, default: ""},
    totalLessons: { type: Number, required: true, default: 0},
    totalLessonTime: { type: Number, required: true, default: 0},
    profilePicture: String
})

schema.path("username").validate(function (value) {
  return value.match(/^[a-zA-Z\-]+$/)
}, 'Invalid username');

module.exports = mongoose.model("UserDB", schema);