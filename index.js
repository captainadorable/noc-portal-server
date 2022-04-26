const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config()
const MONGO_DB_CONNECTION = process.env.MONGODB_CONNECT;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const UserDB = require('./models/User');
mongoose
    .connect(MONGO_DB_CONNECTION, {})
    .then(() => {
        const app = express();
        const server = require('http').Server(app);
        const io = require('socket.io')(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });
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
          console.log("userid", req.session.user_id)
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

            if(!token) return res.json({ error: "Token not found!"});

            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: GOOGLE_CLIENT_ID,
            });
            const { name, email, picture } = ticket.getPayload();

            let foundUser = await UserDB.findOne({ email: email });

            if (!foundUser) {
                let user = new UserDB({ email: email, name: name, profilePicture: picture, permission: "student"});
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

        
        app.get('/logout', auth, (req,res) => {
            req.session.destroy();
            req.user = null
            console.log(req.session)
            console.log(req.user)
            res.status(200)
            res.send("Successfully logged out from account")
        });
        
        app.get('/me', auth, setUser, async (req, res) => {
            res.json(req.user);            
        });
        // GOOGLE AUTH

        // POMODORO CREATE ROOMS
        const PomodoroRooms = require('./classes/Pomodoro/Rooms');
        const PomodoroRoom = require('./classes/Pomodoro/Room');
        const PomodoroUser = require('./classes/Pomodoro/User');

        const MyPomodoroRooms = new PomodoroRooms();
        for (let i = 1; i <= 10; i++) {
            let room = new PomodoroRoom(`pomodoro-${i}`, `Pomodoro ${i}`);
            MyPomodoroRooms.CreateRoom(room);
        }
        // POMODORO END

        // VIDEO CHAT START
        const Calls = require('./classes/Lesson/Calls');
        const Call = require('./classes/Lesson/Call');

        const MyCalls = new Calls();

        app.get("/api/getCalls", auth, setUser, (req, res) => {
          res.json(MyCalls.calls)
        })
        // VIDEO CHAT END
  
        io.on('connection', (socket) => {

            // VIDEO CHAT ---------------------------------------------------------------------------------------------------
            socket.on("offerDescription", data => {
              console.log("Offer-Desc", data)
              
              const newCall = new Call(socket.id, "Matematik")
              newCall.AddUser({ id: socket.id, session: data.userData })
              newCall.offerDesc = data.offer
              MyCalls.calls.push(newCall)

            })
          
            socket.on("offerCandidates", data => {
              
              const call = MyCalls.GetCallFromUserId(socket.id)
              call.offerCandidates.push(data.candidates)

              if (call.users.length == 2) {
                let user = call.users.filter(func).filter(function(u) {
                  return u.id != socket.id
                });

                io.to(user[0].id).emit("offerCandidates", data.candidates)
              }
            })

            socket.on("validateRoom", (roomId) => {
              const call = MyCalls.calls.find(call => call.id == roomId)
              if (call) {
                socket.emit("validateRoom", true, roomId)
              }
              else {
                socket.emit("validateRoom", false)
              }
            })
          
            socket.on("getOfferDesc", (callId) => {
              console.log("Get-Offer-Desc", callId)
              
              const call = MyCalls.calls.find(call => call.id == callId)
              if (!call) {
                socket.emit("roomNotFound");
                return
              }
              const offerDesc = call.offerDesc
              socket.emit("getOfferDesc", (offerDesc))
            })
          
            socket.on("getRemoteUserSession", () => {
              console.log("Get-Remote-Session")
              
              const call = MyCalls.GetCallFromUserId(socket.id)
              let user = call.users.filter(function(u) {
                  return u.id != socket.id
              });

              console.log("Call: ", call)
              console.log("User: ", user)
              
              socket.emit("getRemoteUserSession", (user[0].session))
            })
          
            socket.on("answerDescription", (data) => {
              console.log("Answer-Description", data)
              
              const call = MyCalls.calls.find(call => call.id == data.callId)
              call.answerDesc = data.answerDesc
              call.AddUser({ id: socket.id, session: data.userData })

              let user = call.users.filter(function(u) {
                return u.id != socket.id
              });
              
              io.to(user[0].id).emit('remoteDescription', call.answerDesc)
              socket.emit("getOfferCandidates", call.offerCandidates)
            });
          
            socket.on("answerCandidates", data => {
              
              const call = MyCalls.GetCallFromUserId(socket.id)
              call.answerCandidates.push(data.candidates)
              
              let user = call.users.filter(function(u) {
                return u.id != socket.id
              });

              console.log(socket.id)
              console.log(user[0].id)
              io.to(user.id).emit("answerCandidates", data.candidates)
            })


          
            socket.on("disconnect", () => {
              const call = MyCalls.GetCallFromUserId(socket.id)
              if (call) {
                let user = call.users.filter(function(u) {
                  return u.id != socket.id
                });
  
                io.to(user[0].id).emit("remoteDisconnected")
  
                MyCalls.RemoveCall(call.id)
              }
            });       
            // VIDEO CHAT ---------------------------------------------------------------------------------------------------
        });

        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            console.log(`Listening port: ${PORT}`);
        });
    })
    .catch((err) => {
        console.log('Database connection error!', err);
    });
