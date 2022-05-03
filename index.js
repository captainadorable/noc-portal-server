const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config()
const MONGO_DB_CONNECTION = process.env.MONGODB_CONNECT;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const PRODUCTION = process.env.PRODUCTION;
const UserDB = require('./models/User');

if (PRODUCTION == "true") console.log("PRODUCTION")

mongoose
  .connect(MONGO_DB_CONNECTION, {})
  .then(() => {
    const app = express();
    const server = require('http').Server(app);

    let io;

    if (PRODUCTION == "true") {
      const fs = require('fs');
      const privateKey = fs.readFileSync('./privkey.pem', 'utf8');
      const certificate = fs.readFileSync('./cert.pem', 'utf8');
      const ca = fs.readFileSync('./chain.pem', 'utf8');

      const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
      };

      const https = require('https');
      const httpsServer = https.createServer(credentials, app);

      io = require('socket.io')(httpsServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
      });

      httpsServer.listen(443, () => {
        console.log('HTTPS Server running on port 443');
      });
    }
    else {
      io = require('socket.io')(server, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
      });
    }

    const cors = require('cors');

    const corsConfig = {
      credentials: true,
      origin: true,
    };
    app.use(cors(corsConfig));

    const bodyParser = require('body-parser');
    app.use(bodyParser.json());

    const session = require('express-session');
    const cookieParser = require('cookie-parser');
    app.set('trust proxy', 1);
    app.use(cookieParser(COOKIE_SECRET));
    app.use(
      session({
        secret: COOKIE_SECRET,
        proxy: true,
        saveUninitialized: true,
        cookie: { maxAge: 1000 * 60 * 60 * 24, sameSite: "None", secure: true }, // Max age one day, https for production, http for development
        resave: false,
      })
    );

    // GOOGLE AUTH
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const auth = async (req, res, next) => {
      console.log("[Auth]: ", req.session.user_id)
      try {
        if (req.session.user_id) {
          next();
        }
        else {
          throw "Invalid User ID"
        }
      }
      catch {
        res.json(null);
      }
    }

    const setUser = (async (req, res, next) => {
      const user = await UserDB.findById(req.session.user_id)
      req.user = user;
      next();
    });

    app.post('/api/v1/auth/google', async (req, res) => {
      const { token } = req.body;

      if (!token) return res.json({ error: "Token not found!" });

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
      const { name, email, picture } = ticket.getPayload();

      let foundUser = await UserDB.findOne({ email: email });

      if (!foundUser) {
        let user = new UserDB({ email: email, name: name, profilePicture: picture, permission: "student" });
        await user.save();

        req.session.user_id = user.id;

        res.status(200)
        res.json(user);
      }
      else {
        req.session.user_id = foundUser.id

        res.status(200)
        res.json(foundUser);
      }
      console.log("created cookie", req.session)
    });


    app.get('/logout', auth, (req, res) => {
      req.session.destroy();
      req.user = null
      res.status(200)
      res.send("Successfully logged out from account")
    });

    app.get('/me', auth, setUser, async (req, res) => {
      res.json(req.user);
    });

    app.post('/updateMyProfile', auth, setUser, async (req, res) => {
      const body = req.body
      const changes = body.changes

      if (changes) {

        try {
          await UserDB.updateOne({ email: req.user.email}, { username: changes.username.value })
          await UserDB.updateOne({ email: req.user.email}, { profileBio: changes.profileBio.value })
          res.json({ succes: "Profile updated succesfully"})
        }
        catch {
          res.json({ error: "An error occured"})
        }
      }

      const user = await UserDB.findById(req.session.user_id)
      req.user = user;
    });
    // GOOGLE AUTH

    // VIDEO CHAT START
    const offer = require("./sockethandlers/offer")
    const answer = require("./sockethandlers/answer")
    const getRemoteUserSession = require("./sockethandlers/getRemoteUserSession")
    const sendReqToJoin = require("./sockethandlers/sendReqToJoin")
    const validateRoom = require("./sockethandlers/validateRoom")
    const disconnect = require("./sockethandlers/disconnect")
    
    const Calls = require('./classes/Lesson/Calls');
    const Call = require('./classes/Lesson/Call');

    const MyCalls = new Calls();

    app.get("/api/getCalls", (req, res) => {
      const calls = MyCalls.calls.filter(function(call) {
        return call.users.length < 2
      })
      res.json(calls)
    })

    const onConnection = (socket) => {
      offer.offerDescription(io, socket, MyCalls, Call)
      offer.offerCandidates(io, socket, MyCalls)
      offer.getOfferDescription(io, socket, MyCalls)
      answer.answerDescription(io, socket, MyCalls)
      answer.answerCandidates(io, socket, MyCalls)

      getRemoteUserSession(io, socket, MyCalls)
      validateRoom(io, socket, MyCalls)
      sendReqToJoin(io, socket, MyCalls)
      disconnect(io, socket, MyCalls, UserDB)
    }
    
    io.on('connection', onConnection)

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Listening port: ${PORT}`);
    });


  })
  .catch((err) => {
    console.log('Database connection error!', err);
  });
