import express from "express";
import cookieSession from "cookie-session";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bodyParser from 'body-parser';
import authRoute from "./routes/auth.js";
import chefRouter from "./routes/chefbot.js";
import accountRouter from "./routes/account.js";

// TODO : regarding the auth routes, don't get user from 
// databases twice since the auth middleware does it

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.use(
    cookieSession({name:"session", keys:["openreplay"], maxAge: 24 * 60 * 60 * 100,})
);

// Don't include strip route in bodyparser
let stripeEvent = function(middleware) {
    return function(req, res, next) {
        if ('/webhook' === req.path) {
            return next();
        } else {
            return middleware(req, res, next);
        }
    };
};

app.use(stripeEvent(express.json()));

//app.use(bodyParser.json()) // TODO: Parsing is interfering with webhook
app.use(express.static('public'))
app.use(cors({
    origin: true, //"http://localhost:5173",
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
    exposedHeaders: 'auth-token',
  })
);

app.use("/auth", authRoute);
app.use("/account", accountRouter);
app.use("/bot", chefRouter);

main().catch(err => console.log(err))

async function main() {
    await mongoose.connect(process.env.REMOTE_DB_ADDRESS);

    app.listen(PORT, () => {
        console.log("server is running!")
    })
}

