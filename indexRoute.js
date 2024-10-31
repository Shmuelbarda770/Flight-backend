

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: Success
 */

import express from 'express';
import { getCollection } from './dataMongo.js';
import fetch from 'node-fetch'; 
import {ObjectId} from 'mongodb'
import fs from 'fs';
import tf  from '@tensorflow/tfjs-node';
import {mailjet} from 'node-mailjet';

const API_KEY=process.env.API_KEY||'';
const API_SECRET=process.env.API_SECRET||'';


// const mailjetClient = mailjet.connect({ apiKey: API_KEY, apiSecret: API_SECRET });

import axios from 'axios'
const router = express.Router();
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY||"";


// const authenticateToken = (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1];

//     if (!token) return res.sendStatus(401);

//     jwt.verify(token, SECRET_KEY, (err, user) => {
//         if (err) return res.sendStatus(403);
//         req.user = user;
//         next();
//     });
// };


router.post('/home', async (req, res) => {
    const { airport } = req.body;

    try {
        const allData = getCollection('AirpotCiti');
        const findArr = await allData.find({
            city: { $regex: airport, $options: 'i' } 
        }).toArray();

        if (findArr.length > 0) {
            res.status(200).json(findArr);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to get home data', error: err });
    }
});

router.put('/signin', async (req, res) => {
    const { email, userName, password } = req.body;

    try {
        const allDataUsers = getCollection('dataUser');
        const findExistsUser = await allDataUsers.find({ email: email }).toArray();
        
        if (findExistsUser.length === 0) {
            const newUser = { email, userName, password };
            await allDataUsers.insertOne(newUser);
            res.status(201).json({ message: 'User added successfully' });
        } else {
            res.status(400).json({ message: 'User already exists' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to add user', error: err });
    }
});

router.post('/feedback', async (req, res) => {
    const { email, name, message, number, interested } = req.body;

    try {
        const feedbackCheckBoxCollection = getCollection('FeedbackChackbox');
        const existingUsers = await feedbackCheckBoxCollection.find({ email }).toArray();

        if (interested && existingUsers.length === 0) {
            const personForSMS = { name, email, number };
            await feedbackCheckBoxCollection.insertOne(personForSMS);
        }
        const hendled=false;
        const personFeedback = { email, name, message, number,hendled };
        const feedbackCollection = getCollection('Feedback');
        await feedbackCollection.insertOne(personFeedback);
        res.status(200).json({ message: 'Feedback added successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add feedback', error: err.message });
    }
});

router.get('/travel', async (req, res) => {
    try {
        const col = getCollection('PopularDestination');
        const destinations = await col.find({}).toArray(); 
        const orderedData = destinations.sort((a, b) => (b.price - a.price));
        res.status(200).json(orderedData);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get travel data', error: err });
    }
});

router.post('/hotels', async (req, res) => {
    const { flyTo } = req.body;
    try {
        const col = getCollection('hotels');
        const cityArr = await col.find({
            city: { $regex: new RegExp(flyTo, 'i') }
        }).toArray();
        res.status(200).json(cityArr);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get hotels', error: err });
    }
});


router.post('/dashboard', async (req, res) => {
    const { year, month, day } = req.body;

    try {
        const col = getCollection('PastFlightInformation');
        const allpropit = await col.find({}).toArray();

        const yearPropit = allpropit.filter(record => {
            const purchaseDate = new Date(record.purchaseDate);
            return purchaseDate >= new Date(`${year}-01-01T00:00:00Z`) &&
                   purchaseDate < new Date(`${year + 1}-01-01T00:00:00Z`);
        });
        const totalYear = yearPropit.reduce((sum, record) => sum + record.profit, 0);

        const monthPropit = allpropit.filter(record => {
            const purchaseDate = new Date(record.purchaseDate);
            return purchaseDate >= new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`) &&
                   purchaseDate < new Date(`${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00Z`);
        });
        const totalMonth = monthPropit.reduce((sum, record) => sum + record.profit, 0);

        const dayPropit = allpropit.filter(record => {
            const purchaseDate = new Date(record.purchaseDate);
            return purchaseDate >= new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`) &&
                   purchaseDate < new Date(`${year}-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}T00:00:00Z`);
        });
        const totalDay = dayPropit.reduce((sum, record) => sum + record.profit, 0);

        
        const totalPropit = allpropit.reduce((sum, record) => sum + record.profit, 0);
        
        res.status(200).json({ totalProfit: totalPropit, totalYear, totalMonth, totalDay });


    } catch (error) {
        console.error('Error is not good:', error);
        res.status(501).json({ message: 'Failed to retrieve data', error: error.message });
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const col = getCollection('PastFlightInformation');
        const allpropit = await col.find({}).toArray();
        const mapData=new Map();
       
        allpropit.forEach(item => {
            const city = item.origin;
            mapData.set(city, (mapData.get(city) || 0) + 1);
        });        
        const result = Array(...mapData)
        res.status(200).json({result});
    } catch (error) {
        console.error('Error is not good:', error);
        res.status(501).json({ message: 'Failed to retrieve data', error: error.message });
    }
});

router.post('/dateFly', async (req, res) => {
    const { flyFrom, flyTo } = req.body;

    console.log('Received request with:', { flyFrom, flyTo });

    try {
        const col = getCollection('dataFly');
        const dataFlyFilter = await col.find({
            origin: flyFrom,
            destination: flyTo
        }).toArray();

        console.log('Data fetched:', dataFlyFilter);

        if (dataFlyFilter.length > 0) {
            res.status(200).json(dataFlyFilter);
        } else {
            res.status(404).json({ message: 'No matching documents found' });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Failed to get DateFly', error: error.message });
    }
});


const codeForLogin = Math.floor(Math.random() * 1000000);
router.post('/login', async (req, res) => {
    const { username, password, status } = req.body;

    try {
        let col;

        console.log('1');
        switch (status) {
            case 'Clients':
                col = getCollection('dataUser');
                break;
            case 'Employed':
                col = getCollection('Employed');
                break;
            case 'Managers':
                col = getCollection('managers');
                console.log('2');
                break;
            default:
                return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await col.findOne({ username });
        // const a = await bcrypt.compare(password, user.password);
        console.log(password === user.password);
        
        if (user && password === user.password) {
            console.log('4');

            
            const sendEmail = async (codeForLogin) => {
                // const request = mailjetClient
                //     .post('send', { version: 'v3.1' })
                //     .request({
                //         Messages: [
                //             {
                //                 From: {
                //                     Email: 'shmuelbarda770@gmail.com',
                //                     Name: 'Your Name',
                //                 },
                //                 To: [
                //                     {
                //                         Email: 'shmuelbarda770@gmail.com',
                //                         Name: 'Recipient Name',
                //                     },
                //                 ],
                //                 Subject: 'Hello!',
                //                 TextPart: `This is a test email number to log in ${codeForLogin}`,
                //             },
                //         ],
                //     });
                
                // try {
                //     const result = await request;
                //     console.log('Email sent successfully:', result.body);
                // } catch (error) {
                //     console.error('Error sending email:', error);
                //     return { message: 'Email sending failed', error: error.message };
                // }
            };
            
            
            // await sendEmail(codeForLogin);
            
            res.status(200).json({ message: `User ${status} logged in successfully` });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
            console.log('6');
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to log in user', error: err.message });
    }
});

router.post('/login/sendmail', async (req, res) => {
    try {
        const { code, status, userIn } = req.body;
        if (userIn === true && code === codeForLogin && status === 'Managers') {
            res.status(200).json({ goodUser: true });
        } else {
            res.status(401).json({ message: 'Invalid code or user status' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to log in user', error: err.message });
    }
});
router.get('/reports/users', async (req, res) => {
try {
    const col = getCollection('Feedback'); 
    const userFeedback = await col.find({"hendled":false}).toArray();
    if(userFeedback && userFeedback.length>0){
        res.status(200).json({userFeedback})
    }
    console.log(userFeedback);

    } catch (err) {
        res.status(500).json({ message: 'Failed to find feedback of users and the err is:', error: err.message });
    }
});

router.patch('/reports/users/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const col = getCollection('Feedback'); 
        const userFeedback = await col.findOne({ _id: new ObjectId(id) });
       
        if (userFeedback) { 
            await col.updateOne(
                { _id: new ObjectId(id) },
                { $set: { hendled: true } }
            );
            res.status(200).json({ message: 'Feedback handled successfully.' });
        } else {
            res.status(404).json({ message: 'Feedback not found.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to find feedback of users', error: err.message });
    }
});

router.post('/submit', async (req, res) => {
    const { recaptchaToken } = req.body;
    try {
        const recaptchaResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
        });
        
        const recaptchaData = await recaptchaResponse.json();
        
        if (recaptchaData.success) {
            res.status(200).json({ message: 'reCAPTCHA verified successfully' });
        } else {
            res.status(400).json({ message: 'reCAPTCHA verification failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});



let model;
let vocab = {};
    const answers = JSON.parse(fs.readFileSync('./dataServer/answer.json','utf-8'))
    const questions = JSON.parse(fs.readFileSync('./dataServer/question.json','utf-8'))
    console.log(answers[5]);
    console.log(questions[5]);

const tokenize = (data) => {
    const vocab = {};
    let index = 1; 

    data.forEach(question => {
        const words = question.split(" ");
        words.forEach(word => {
            if (!vocab[word]) {
                vocab[word] = index++;
            }
        });
    });
    return vocab;
};


const createModel = (vocabSize) => {
    const model = tf.sequential();
    model.add(tf.layers.embedding({ inputDim: vocabSize + 1, outputDim: 64 }));
    model.add(tf.layers.globalAveragePooling1d());
    model.add(tf.layers.dense({ units: answers.length, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'sparseCategoricalCrossentropy', metrics: ['accuracy'] });
    return model;
};


const trainModel = async () => {
    const vocabSize = Object.keys(vocab).length;
    console.log(vocabSize);
    model = createModel(vocabSize);

    const xs = tf.tensor2d(questions.map(q => 
        q.split(" ").map(word => vocab[word] || 0)
    ));
    

    const ys = tf.tensor1d([...Array(answers.length).keys()], 'int32');

    await model.fit(xs, ys, { epochs: 10 });
};


const predict = async (question) => {
    const input = tf.tensor2d([question.split(" ").map(word => vocab[word] || 0)]);
    const prediction = model.predict(input);
    const predictedIndex = prediction.argMax(-1).dataSync()[0]; 
    return predictedIndex;
};

const initModel = async () => {
    vocab = tokenize(questions);
    await trainModel();
};

router.post('/ask', async (req, res) => {
    const  {question}  = req.body;
    
    try {
        if (!model) {
            await initModel();
        }
        const answerIndex = await predict(question);
        res.json({ answer: answers[answerIndex] });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
        console.log(error.message);
    } 
});

export default router;
