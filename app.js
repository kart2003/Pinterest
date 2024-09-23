const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const upload = require("./config/multerconfig");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

const userModel = require("./models/user");
const postModel = require("./models/post");

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");

  res.render("profile", { user });
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/profile/upload", (req, res) => {
  res.render("profileupload");
});

app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  user.profilepic = req.file.filename;
  await user.save();
  console.log(user);
  res.redirect("/profile");
});

app.get("/like/:postid", isLoggedIn, async (req, res) => {
  let post = await postModel
    .findOne({ _id: req.params.postid })
    .populate("user");
  console.log(post);
  if (post.likes.indexOf(post.user._id) === -1) {
    post.likes.push(post.user._id);
  } else {
    post.likes.splice(post.likes.indexOf(post.user._id), 1);
  }

  await post.save();
  res.redirect("/profile");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/edit/:postid", async (req, res) => {
  let post = await postModel
    .findOne({ _id: req.params.postid })
    .populate("user");
  res.render("edit", { post });
});

app.post("/edit/:postid", async (req, res) => {
  let { content } = req.body;
  await postModel.findOneAndUpdate(
    { _id: req.params.postid },
    { content: content }
  );
  res.redirect("/profile");
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email: email });
  if (!user) {
    res.render("somethingwentwrong");
  } else {
    bcrypt.compare(password, user.password, function (err, result) {
      if (result === true) {
        let token = jwt.sign({ email: email, userid: user._id }, "Shhhhh");
        res.cookie("token", token);
        res.redirect("/profile");
      } else {
        res.render("incorrectpassword");
      }
    });
  }
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.render("login");
});

app.post("/register", async (req, res) => {
  let { username, name, email, age, password } = req.body;
  const user = await userModel.findOne({ email: email });
  if (user) return res.status(500).render("alreadyregistered");
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      const user = await userModel.create({
        name: name,
        email: email,
        password: hash,
        age: age,
        username: username,
      });
      let token = jwt.sign({ email: email, userid: user._id }, "Shhhhh");
      res.cookie("token", token);

      res.render("registered");
    });
  });
});

app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postModel.create({
    user: user._id,
    content: content,
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") return res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token, "Shhhhh");
    req.user = data;
  }
  next();
}

app.listen(3000);
