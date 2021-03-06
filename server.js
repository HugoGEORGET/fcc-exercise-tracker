const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Hugo Georget

const userSchema = mongoose.Schema({
  name: String,
  exercises: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date, default: Date.now }
    }
  ]
});

const User = mongoose.model("User", userSchema);

app.post("/api/exercise/new-user", (req, res) => {
  let newUser = new User({
    name: req.body.username
  });

  newUser.save((err, user) => {
    if (err) return console.log(err);
    res.json({ _id: user.id, name: req.body.username });
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find({})
    .select("_id name")
    .exec((err, users) => {
      if (err) return console.log(err);
      res.json({ users });
    });
});

app.post("/api/exercise/add", (req, res) => {
  let date = req.body.date ? req.body.date : Date.now();
  console.log(date);

  User.findById(req.body.userId, (err, user) => {
    if (err) return console.log(err);
    user.exercises.push({
      description: req.body.description,
      duration: req.body.duration,
      date: date
    });
    user.save((err, editedUser) => {
      res.json(editedUser);
    });
  });
});

app.get("/api/exercise/log", (req, res) => {
  if (!req.query.userId) {
    res.json({ error: "No userId defined" });
  } else if ((req.query.from && req.query.to) || req.query.limit) {
    // add additionnal parameter to query
    if (req.query.from && req.query.to && req.query.limit) {
      // all parameters
      User.findById(req.query.userId)
        .lean()
        .find({
          exercises: { date: { $gte: req.query.from, $lte: req.query.to } }
        })
        .limit(req.query.limit)
        .exec((err, user) => {
          if (err) return console.log(err);
          user.exercise_count = user.exercises.length;
          res.json(user);
        });
    } else if (req.query.limit) {
      User.findById(req.query.userId)
        .lean()
        .find({
          exercises: { date: { $gte: req.query.from, $lte: req.query.to } }
        })
        .limit(req.query.limit)
        .exec((err, user) => {
          if (err) return console.log(err);
          user.exercise_count = user.exercises.length;
          res.json(user);
        });
    }
  }
  User.findById(req.query.userId)
    .lean()
    .exec((err, user) => {
      if (err) return console.log(err);
      user.exercise_count = user.exercises.length;
      res.json(user);
    });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
