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
        app.use(cookieParser());
        app.use(
            session({
                secret: COOKIE_SECRET,
                saveUninitialized: true,
                cookie: { maxAge: 1000 * 60 * 60 * 24 }, // ONE DAY
                resave: false,
            })
        );

        // GOOGLE AUTH
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);

        app.use(async (req, res, next) => {
            const user = await UserDB.findById(req.session.user_id) 
            req.user = user;
            next();
        });

        app.post('/api/v1/auth/google', async (req, res) => {
            const { token } = req.body;

            if(!token) return;

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
        });

        
        app.get('/logout',(req,res) => {
            req.session.destroy();
            req.user = null
            console.log(req.session)
            console.log(req.user)
            res.status(200)
            res.send("Successfully logged out from account")
        });
        
        app.get('/me', async (req, res) => {
            res.json(req.user);            
        });


        // GOOGLE AUTH

        // POMODORO START
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
        const WaitingCalls = require('./classes/Lesson/WaitingCalls');
        const WaitingCall = require('./classes/Lesson/WaitingCall');
        const User = require('./classes/Lesson/User');

        const MyWaitingCalls = new WaitingCalls();
        // VIDEO CHAT END

        app.get('/api/getWaitingCalls', (req, res) => {
            res.json(MyWaitingCalls);
        });

        app.get('/api/getPomodoroRooms', (req, res) => {
            res.json(MyPomodoroRooms.rooms);
        });

        app.get('/api/getPomodoroRoom/:room', (req, res) => {
            res.json(MyPomodoroRooms.GetRoomFromId(req.params.room));
        });

        io.on('connection', (socket) => {
            // POMODORO -----------------------------------------------------------------------------------------------------
            socket.on('join pomodoro room', (roomId, userData) => {
                const room = MyPomodoroRooms.GetRoomFromId(roomId);
                console.log('join pomodoro room', room);
                if (room) {
                    const length = room.users.length;
                    if (length === 12) {
                        socket.emit('room full');
                        return;
                    }
                    room.AddUser(new User(socket.id, userData.email, userData.name, userData.pp, null));
                    const usersInThisRoom = room.users.filter((user) => user.id !== socket.id); // get users except me

                    socket.emit('all users', usersInThisRoom);
                    console.log('all users', usersInThisRoom);
                }
            });

            socket.on('sending signal', (data) => {
                io.to(data.to).emit('user joined', { signal: data.signal, caller: data.caller });
            });

            socket.on('returning signal', (data) => {
                io.to(data.to).emit('receiving returned signal', { signal: data.signal, id: socket.id });
            });

            socket.on('disconnect', () => {
                const room = MyPomodoroRooms.GetRoomFromUserId(socket.id);
                if (room) {
                    room.RemoveUser(socket.id);
                    room.users.map((user) => {
                        io.to(user.id).emit('user disconnected', socket.id);
                    });
                }
            });
            // POMODORO -----------------------------------------------------------------------------------------------------

            // VIDEO CHAT ---------------------------------------------------------------------------------------------------
            socket.emit('me', socket.id);

            socket.on('disconnect', () => {
                console.log('A user disconnected.');
                const call = MyWaitingCalls.GetCallFromUserId(socket.id);
                if (call) {
                    call.RemoveUser(socket.id);
                    if (call.users.length > 0) {
                        io.to(call.users[0].id).emit('userLeft');
                    }
                    MyWaitingCalls.RemoveEmptyCalls();
                }
            });
            socket.on('callUser', ({ userToCall, callFrom, signal }) => {
                io.to(userToCall).emit('callUser', { signal, callFrom });
            });

            socket.on('answerCall', ({ signal, to, from, }) => {
                io.to(to.id).emit('callAccepted', { signal, from });

                const user = new User(to.id, to.email, to.name, to.pp, false);
                const waitingCall = MyWaitingCalls.GetCallFromUserId(from.id);
                waitingCall.AddUser(user);
            });

            socket.on('waitingCall', ({ initiator, lesson }) => {
                console.log(initiator);
                const newInitiator = new User(initiator.id, initiator.email, initiator.name, initiator.pp, true);
                const waitingcall = new WaitingCall(newInitiator, lesson);

                waitingcall.AddUser(newInitiator);
                MyWaitingCalls.waitingCalls.push(waitingcall);

                console.log('new waiting call ', waitingcall);
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
