import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import dotenv  from 'dotenv'
import signinRouter from './route/signin.route.js'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser'

const app = express()

const axiosConfig = {
  headers: {
    'Content-Type': 'application/json'
  }
}

dotenv.config()

app.use(bodyParser.urlencoded({
    extended: true
  }))

app.use(bodyParser.json())
app.set('view engine', 'ejs')

app.use(cookieParser())

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
            // Replace localhost URLs with your API base URL
            const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3000'
            
            axios.get(`${API_BASE}/partner`, {
                data: {
                    partnerId: decoded.partnerId
                }
            }, axiosConfig).then((response) => {
                var partnerData = response.data
                axios.get(`${API_BASE}/order/by-partner`, {
                    data: {
                        partnerId: decoded.partnerId
                    }
                }, axiosConfig).then((response2) => {
                    var orders = response2.data
                    axios.get(`${API_BASE}/partner/balance`, {
                        data: {
                            recipient_id: partnerData.recipient_id
                        }
                    }, axiosConfig).then((response3)=> {
                        var balance = response3.data
                        res.render('dashboard', {partnerData, orders, balance})
                    })
                })
            })
        })
    }
})

app.get('/:partnerId/:orderId', (req, res) => {
    const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3000'
    
    axios.get(`${API_BASE}/partner`, {
        data: {
            'partnerId': req.params.partnerId
        }
    }, axiosConfig).then((response) => {
        var partnerData = response.data
        axios.get(`${API_BASE}/order`, {
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

// Export the Express app as a serverless function
export default app