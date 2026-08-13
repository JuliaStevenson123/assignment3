require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const Users = require("./models/Users");
require('pg'); // explicitly require the "pg" module (for Vercel) 
const Sequelize = require("sequelize");

const app = express();

//Cookie/Login Stuff
const clientSessions = require('client-sessions');
app.use(
  clientSessions({
    cookieName: "session", // this is the object name that will be added to 'req'
    secret: "o6LjQ5EVNC28ZgK64hDELM18ScpFQr", // this should be a long un-guessable string.
    duration: 30 * 60 * 1000, // duration of the session in milliseconds (30 minutes)
    activeDuration: 1000 * 60, // the session will be extended by this many ms each request (1 minute)
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Connect to Databases
connectDB(); // MongoDB
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {require: true, rejectUnauthorized: false},
  },
});

// Define Tasks model
const Tasks = sequelize.define('Tasks', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,//auto generate
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,//required
  },
  description: { type: Sequelize.TEXT,
    defaultValue: "" //default value
  },
  dueDate: Sequelize.DATE, 
  status: {
    type: Sequelize.STRING,
    defaultValue: "Pending",//default value
  },
  userId: {
    type: Sequelize.STRING,
    allowNull: false,//required
  },
  createdAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,//default value
  },
  updatedAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,//default value
  },
});

// Sync or create table in postgres
sequelize.sync().then(() => {
  // create a new "Project" and add it to the database
  Tasks.create({
    title: 'Test',
    userId: 'Test'
  }).then((tasks) => {
      console.log('SQL table success!');
  }).catch((error) => {
      console.log('something went wrong!: ' + error);
  });
});

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
  const { username, password } = req.body;

  //Get user from database
  const user = await Users.find({ username: username, password: password });
  
  if (!user.length) { //User and pass word not correct or user not found
    res.render("login", { accountNotFound: "User and password not found. Please try again or register." });
  } else { //Login User
    req.session.user = user[0]; //Store user in session
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
  const users = await Users.find({username}) + await Users.find({email});

  console.log(users)
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

//Dashboard
app.get("/dashboard", ensureLogin, (req, res) => {
  res.render("dashboard", { username: req.session.user.username });
});

// Display list of tasks
app.get("/tasks", ensureLogin, (req, res) => {
  Tasks.findAll({
    attributes: [title, description, dueDate, status, createdAt, updatedAt], //List of retreived data
    where: { userId: req.session.user.id }, //Filter by userId
  }).then((tasks) => {
    res.render("tasks", { tasks: tasks, id: req.session.user.id });
  });
});

//load form to add new task
app.get("/tasks/add", ensureLogin, (req, res) => {
  res.render("add");
});

app.post("/tasks/add", async, ensureLogin, (req, res) => {
  //Get form answers
  const { title, description, dueDate } = req.body;

  //Add task to SQL database
  await Tasks.create({
    title: title,
    description: description,
    dueDate: dueDate,
    userId: req.session.user.id
  });

  //Redirect to tasks page after submitting
  res.redirect("/tasks");
});

app.get("/task/edit/:id", ensureLogin, (req, res) => {
  Tasks.findAll({
    attributes: [title, description, dueDate], //List of retreived data
    where: { id: req.params.id }, //Filter by task id
  }).then((tasks) => {// render page with preloaded data
    res.render("tasks", { title: tasks[0].title, description: tasks[0].description, dueDate: tasks[0].dueDate});
  });
});

app.post("/task/edit/:id", async, ensureLogin, (req, res) => {
  const { title, description, dueDate } = req.body;
  Tasks.update({
      title: title,
      description: description,
      dueDate: dueDate
    },{
      where: { id: req.params.id }, //Get task by id
  })
});

app.post("/tasks/delete/:id", async, ensureLogin, (req, res) => {
  Tasks.destroy({
    where: { id: req.params.id }, //Delete task by id
  })

  //reload page
  res.redirect('/tasks');
});

app.post("/tasks/status/:id", async, ensureLogin, (req, res) => {
  Tasks.findAll({status},{//get status}
      where: { id: req.params.id }, //get by task id
  }).then((tasks) => {
    const currentStatus = tasks[0].status;
    //status is pending if complete and complete if pending
    const newStatus = currentStatus == "Pending" ? "Complete" : "Pending";

    //update task
    Name.update({status: newStatus,},{
      where: { id: req.params.id }, //get task by id
    })
  });

  //reload page
  res.redirect('/tasks');
});
















//Make sure user is logged in
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

app.listen(8080, () => console.log("Server running at http://localhost:8080"));
