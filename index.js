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
            //console.log(req.session)
            //console.log(req.user)
            res.status(200)
            res.send("Successfully logged out from account")
        });
        
        app.get('/me', auth, setUser, async (req, res) => {
            res.json(req.user);            
        });
        // GOOGLE AUTH

        // VIDEO CHAT START
        const Calls = require('./classes/Lesson/Calls');
        const Call = require('./classes/Lesson/Call');

        const MyCalls = new Calls();

        app.get("/api/getCalls", (req, res) => {
          const calls = MyCalls.calls.filter(function(call) {
            return call.users.length < 2
          })
          res.json(calls)
        })
        // VIDEO CHAT END
  
        io.on('connection', (socket) => {

            // VIDEO CHAT ---------------------------------------------------------------------------------------------------
            socket.on("offerDescription", data => {
              //console.log("Offer-Desc", data)
              
              const newCall = new Call(socket.id, data.lesson)
              newCall.AddUser({ id: socket.id, session: data.userData })
              newCall.offerDesc = data.offer
              MyCalls.calls.push(newCall)

              socket.on("changeStatus", (status) => {
                newCall.teacherStatus = status
              })
              
              socket.on("answerReq", (req, state) => {
                const foundReq = newCall.waitingStudents.find(std => std.id == req.id);

                if (!foundReq) return

                if (state) {
                  newCall.waitingStudents = []
                }
                else {
                  newCall.waitingStudents = newCall.waitingStudents.filter(function(student) {
                    return student.id != req.id
                  })
                  
                }
                
                io.to(foundReq.id).emit("reqAnswered", state);
                io.to(newCall.id).emit("joinRequests", newCall.waitingStudents) // call.id = to teacher  
              }); 
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
                socket.emit("validateRoom", call.users.length < 2 ? true : "full", roomId)
              }
              else {
                socket.emit("validateRoom", false)
              }
            })

            socket.on("sendReqToJoin", (data) => { // callId, session
              const call = MyCalls.calls.find(call => call.id == data.callId)
              
              if (!call) {
                socket.emit("roomNotFound");
                return
              }

              call.waitingStudents.push({ id: socket.id, userData: data.session})

              io.to(call.id).emit("joinRequests", call.waitingStudents) // call.id = to teacher
            })
          
            socket.on("getOfferDesc", (callId) => {
              //console.log("Get-Offer-Desc", callId)
              
              const call = MyCalls.calls.find(call => call.id == callId)
              if (!call) {
                socket.emit("roomNotFound");
                return
              }
              const offerDesc = call.offerDesc
              //console.log(call)
              socket.emit("getOfferDesc", offerDesc, call.lesson)
            })
          
            socket.on("getRemoteUserSession", () => {
              //console.log("Get-Remote-Session")
              
              const call = MyCalls.GetCallFromUserId(socket.id)
              let user = call.users.filter(function(u) {
                  return u.id != socket.id
              });

              //console.log("Call: ", call)
              //console.log("User: ", user)
              
              socket.emit("getRemoteUserSession", (user[0].session))
            })
          
            socket.on("answerDescription", (data) => {
              //console.log("Answer-Description", data)
              
              const call = MyCalls.calls.find(call => call.id == data.callId)
              call.answerDesc = data.answerDesc
              call.AddUser({ id: socket.id, session: data.userData })

              let user = call.users.filter(function(u) {
                return u.id != socket.id
              });
              
              io.to(user[0].id).emit('remoteDescription', call.answerDesc)
              socket.emit("getOfferCandidates", call.offerCandidates)

              call.connectedDate = Date.now()
              call.StartTimeCounter(io)
            });
          
            socket.on("answerCandidates", data => {
              
              const call = MyCalls.GetCallFromUserId(socket.id)
              call.answerCandidates.push(data.candidates)
              
              let user = call.users.filter(function(u) {
                return u.id != socket.id
              });

              io.to(user[0].id).emit("answerCandidates", data.candidates)
            })


          
            socket.on("disconnect", () => {
              const call = MyCalls.GetCallFromUserId(socket.id)
              if (call) {
                let user = call.users.filter(function(u) {
                  return u.id != socket.id
                });

                MyCalls.RemoveCall(call.id)
                
                if (!user[0]) return
  
                io.to(user[0].id).emit("remoteDisconnected")
  
              }
            });       
            // VIDEO CHAT ---------------------------------------------------------------------------------------------------
        });

        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            console.log(`Listening port: ${PORT}`);
        });
	
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

		httpsServer.listen(443, () => {
			console.log('HTTPS Server running on port 443');
		});
	}
    })
    .catch((err) => {
        console.log('Database connection error!', err);
    });
