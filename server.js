require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const Users = require("./models/Users");

const app = express();

//Cookie/Login Stuff
const clientSessions = require('client-sessions');
app.use(
  clientSessions({
    cookieName: "session", // this is the object name that will be added to 'req'
    secret: "o6LjQ5EVNC28ZgK64hDELM18ScpFQr", // this should be a long un-guessable string.
    duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
    activeDuration: 1000 * 60, // the session will be extended by this many ms each request (1 minute)
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Connect to DB
connectDB();

//User variable
var user = null;

// Index Page
app.get("/", (req, res) => {
  res.render("index");
});

// Login Page
app.get("/login", async (req, res) => {
  res.render("login", { accountNotFound: "" });
});
app.post("/login", async (req, res) => {
  //const { username, password } = req.body;

  //Get user from database
  const user = await Users.find({ username, password });
  
  if (!user.length) { //User and pass word not correct or user not found
    res.render("login", { accountNotFound: "User and password not found. Please try again or register." });
  } else { //Login User
    req.session.user = username;
    console.log("User logged in: " + req.session.user);
    res.redirect("dashboard");
  }
});

//Register Page
app.get("/register", async (req, res) => {
  res.render("register", { accountFound: "" });
});
app.post("/register", async (req, res) => {
  //Get data to make new account
  const { username, email, password } = req.body;

  //See if user or email already exists in database
  const users = await Users.find({username}) + Users.find({email});

  if (users.length) { //User already Found
    res.render("register", { accountFound: "User already exists. Please try again or login." });
  } else { //Create new user
    const newUser = new Users({ username, email, password });
    await newUser.save().then(() => {
        console.log("New user saved");//success
        res.render("login", { accountNotFound: "" });
      }).catch(err => {console.log(err);});//error}
  }
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard", { username: req.session.user });
});

app.listen(8080, () => console.log("Server running at http://localhost:8080"));
