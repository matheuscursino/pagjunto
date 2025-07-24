import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import dotenv  from 'dotenv'
import signinRouter from './route/signin.route.js'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express()
const port = 80

const axiosConfig = {
  headers: {
    'Content-Type': 'application/json'
  }
}

dotenv.config()

const corsOptions = {
  origin: ['https://www.pagjunto.com', 'https://pagjunto.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

app.options(/(.*)/, cors(corsOptions));


app.use(bodyParser.urlencoded({
    extended: true
  }))

app.use(bodyParser.json())
app.set('view engine', 'ejs')

app.use(cookieParser())

app.use(express.static(join(__dirname, 'public')));



app.get('/', (req, res) =>  {
    res.render('lp')
})


app.get('/:orderId', (req, res) => {
        axios.get('https://api.pagjunto.com/v1/order', {
            data: {
                orderId: req.params.orderId
            }
        }).then((response) => {
            res.render('order', {orderData: response.data})
        }).catch((error2) => {
            res.render('orderNotFound')
        })
})

app.use((req, res, next) => {
  res.status(404).render("404")
});

app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})