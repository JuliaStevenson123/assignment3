const mongoose = require("mongoose");

module.exports = function connectDB() {
  mongoose
    .connect(process.env.mongoose)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));
};