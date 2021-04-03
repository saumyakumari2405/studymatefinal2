require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const flash = require('connect-flash');
// const session = require("express-session");
const cookieParser = require('cookie-parser');

const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {

    api_key: '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'
  }
}));

const app = express();

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser('secret'));
app.use(express.static("public"));
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false,

}));








app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next) => {
  app.locals.message1 = req.flash('error');
  delete req.flash('error');
  next();
});
app.set('view engine', 'ejs');

// mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true,  useUnifiedTopology: true });
// mongoose.connect("mongodb+srv://netninja:Test123@cluster0.eejjk.mongodb.net/node-auth?retryWrites=true&w=majority", {useNewUrlParser: true,  useUnifiedTopology: true });
// mongoose.connect("mongodb+srv://abc:123@cluster0.jbqo9.mongodb.net/auth?retryWrites=true&w=majority", {useNewUrlParser: true,  useUnifiedTopology: true });
mongoose.connect("mongodb+srv://studymate:Test1234@cluster0.zm0pa.mongodb.net/studymatedb?retryWrites=true&w=majority", {useNewUrlParser: true,  useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"]
}));

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res) {
  let message1 = req.flash('error');
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets")
        });
      }
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

// Just trying to update

app.post("/register", function(req, res){
  
  const username = req.body.username;
  const pw = req.body.password;
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {

    if (err) {
      console.log(err);

      req.flash('error', 'User is already registered');
      res.redirect("/register");}

    // } 
    else {
      passport.authenticate("local")(req, res, async function(){
        res.redirect("/secrets");
        await transporter.sendMail({
          to: user.username,
          from: 'riya.rashi141@gmail.com',
          subject: 'Welcome to Study Mate',
          html: '<h1>Thank You for Signing Up with Study Mate</h1> <p>We look forward to Your Effective Utilization and Hardworking Contribution to the students society</p>'
        });
      });
    }
  });

});



// app.post("/register1", function(req, res) {
//   const username = req.body.username;
//   const pw = req.body.password;
//   User.register({
//     username: req.body.username
//   }, req.body.password, function(err, user) {

//     if (pw.length === 0 || username.length === 0) {
//       console.log(err);
//       req.flash('error', 'Empty!!please fill the details.');
//       //req.flash(err);
//       res.redirect("/register");
//     } else if (err) {
//       console.log(err);

//       req.flash('error', 'User is already registered');
//       res.redirect("/register");
//     } else if (username.length > 20 || pw.length > 15) {
//       console.log('too long');
//       req.flash('error', 'User or password too long. ');
//       //req.flash(err);
//       res.redirect("/register");
//     } else if (pw.length > 0 && pw.length < 4) {
//       console.log('less');

//       req.flash('error', 'size of password must be more than 4');
//       res.redirect("/register");
//     } else if (pw.includes('@') === false && pw.includes('#') === false && pw.includes('*') === false && pw.includes('$') === false) {
//       console.log('special chars missing');

//       req.flash('error', 'must include any of the following @,#,*,$');
//       res.redirect("/register");
//     } 
//       });
//     }
//   });
// });



app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
});

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
