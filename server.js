
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; 
import { close } from './dataMongo.js';
import indexRoute from './indexRoute.js'; 
import rateLimit from 'express-rate-limit'
import setupSwagger from './swagger.js'
// import jwt from 'jsonwebtoken';
// import crypto from 'crypto';



// const SECRET_KEY = crypto.randomBytes(32).toString('hex');

const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, try again later'
});

const limitLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:1000,
    message: 'Too many requests from login, try again later'
});



// const authenticateToken = (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1]; 

//     if (!token) return res.sendStatus(401); 

//     jwt.verify(token, SECRET_KEY, (err, user) => {
//         if (err) return res.sendStatus(403);
//         req.user = user;
//         next();
//     });
// };


const app = express();
const port = 3000;

setupSwagger(app);
app.use(cors({
    origin: '*', 
    methods: ['GET','PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));


app.use('/api/login',limitLogin,authenticateToken)
app.use('/api/login',limitLogin)
app.use(limit);
app.use(express.json());
app.use('/api', indexRoute);




app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    try{
        await close();
        process.exit();
    }catch(error){
        console.error("close mongo error is:"+error);
        process.exit(1);
    }
   
});
