const updateTotalLessons = async (user, UserDB) => {
    await UserDB.updateOne({ email: user.session.email }, { $inc: { totalLessons: 1 }})
  }

const updateTotalLessonTime = async (user, UserDB, time) => {
    await UserDB.updateOne({ email: user.session.email }, { $inc: { totalLessonTime: time }})
}

module.exports = { updateTotalLessons, updateTotalLessonTime }