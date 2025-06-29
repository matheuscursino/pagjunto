import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import dotenv  from 'dotenv'
import signinRouter from './route/signin.route.js'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser'


const app = express()
const port = 80

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
            axios.get('http://127.0.0.1:3000/partner', {
                data: {
                    partnerId: decoded.partnerId
                }
            }, axiosConfig).then((response) => {
                var partnerData = response.data
                axios.get('http://127.0.0.1:3000/order/by-partner', {
                    data: {
                        partnerId: decoded.partnerId
                    }
                }, axiosConfig).then((response2) => {
                    var orders = response2.data
                    res.render('dashboard', {partnerData, orders})
                })
            })
        })
    }
})

app.get('/:partnerId/:orderId', (req, res) => {
    axios.get('http://127.0.0.1:3000/partner', {
        data: {
            'partnerId': req.params.partnerId
        }
    }, axiosConfig).then((response) => {
        var partnerData = response.data
        axios.get('http://127.0.0.1:3000/order', {
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

app.use('/signin', signinRouter)


app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})