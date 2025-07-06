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

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/dashboard', (req, res) => {
    if (req.cookies.access_token == undefined){
        res
            .redirect('/login')
    } else {
        jwt.verify(req.cookies.access_token, process.env.SEGREDO, function(err, decoded){
            axios.get(`${process.env.API_SITE_URL}/partner`, {
                data: {
                    partnerId: decoded.partnerId
                }
            }, axiosConfig).then((response) => {
                var partnerData = response.data
                axios.get(`${process.env.API_SITE_URL}/order/by-partner`, {
                    data: {
                        partnerId: decoded.partnerId
                    }
                }, axiosConfig).then((response2) => {
                    var dashboardData = response2.data
                    axios.get(`${process.env.API_SITE_URL}/partner/balance`, {
                        data: {
                            recipient_id: partnerData.recipient_id
                        }
                    }, axiosConfig).then((response3)=> {
                        var balance = response3.data
                        res.render('dashboard', {
                            partnerData:partnerData,
                            balance: balance,
                            stats: dashboardData.stats, 
                            orders: dashboardData.recentOrders})

                    })
                })
            })
        })
    }
})

app.get('/:partnerId/:orderId', (req, res) => {
    axios.get('https://api.pagjunto.com/partner', {
        data: {
            'partnerId': req.params.partnerId
        }
    }, axiosConfig).then((response) => {
        var partnerData = response.data
        axios.get('https://api.pagjunto.com/order', {
            data: {
                orderId: req.params.orderId
            }
        }, axiosConfig).then((response2) => {
            res.render('order', {orderData: response2.data, partnerData})
        }).catch((error2) => {
            res.send("order doesnt exist")
        })
    }).catch((error) => {
        res.send("partner doesnt exist")
    })
})

app.get('/logout', (req, res) => {
    res
    .clearCookie('access_token', {path:'/'})
    .status(200)
    .redirect('/login')
})

app.use('/signin', signinRouter)


app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})