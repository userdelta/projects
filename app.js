const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const path = require("path");
const methodOverride = require("method-override");//for update and delete
const ejsMate = require('ejs-mate');
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const {listingSchema,reviewSchema} = require("./schema.js");
const Review = require("../models/review.js");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("../models/user.js");

const session=require("express-session");
const MongoStore = require('connect-mongo');


const listingRouter =require("./routes/listing.js");
const reviewsRouter =require("./routes/review.js");
const userRouter =require("./routes/user.js");

app.set("view engine","ejs");//views
app.set("views",path.join(__dirname,"views"));//views

app.use(express.urlencoded({extended:true}));//express
app.use(methodOverride("_method"));//for update and delete
app.use(express.static(path.join(__dirname,"public")));//public folder

// use ejs-locals for all ejs templates:
app.engine('ejs', ejsMate);


const dbUrl = process.env.ATLASDB_URL

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

const store=MongoStore.create({
  mongoUrl:dbUrl,
  crypto:{
    secret:process.env.SECRET
  },
  touchAfter:24 * 3600,
})

store.on("error",() =>{
  console.log("ERROR IN MONGO SESSION STORE",err)
})

const sessionOptions={
  store,
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
    expire:Date.now()+7*24*60*60*1000,
    maxAge:7*24*60*60*1000,
    httpOnly:true
  }
};



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) =>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next();
})

// app.get("/demouser",async(req,res) =>{
//   let fakeUser=new User({
//     email:"student@gmail.com",
//     username:"delat_student"
//   })

//   let registeredUser = await User.register(fakeUser,"helloworld");
//   res.send(registeredUser);
// })


app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewsRouter);
app.use("/",userRouter);

app.listen(8080,() =>{
    console.log("server is listening to port 8080");
})  

//home Route
// app.get("/",(req,res) =>{
//   res.send("welcome");
// })



  // app.get("/testlistings", async (req, res) => {
  //       let sampleListing= new Listing({
  //           title:"My home",
  //           description :"On mountain",
  //           price:1500,
  //           location:"Adasa Taluka Saoner Dist Nagpur ",
  //           country:"India",    
  //       })
  //       await sampleListing.save();
  //       console.log("sample was saved");
  //       res.send("successfull Testing");
  // });
app.all("*",(req,res,next) => {
    next(new ExpressError(404,"page not found"))
});

app.use((err,req,res,next) =>{
    let { statusCode=500 , message="Some error Occured" } = err;
    res.status(statusCode).render("error.ejs",{message});
    //res.status(status).send(message);
});
  