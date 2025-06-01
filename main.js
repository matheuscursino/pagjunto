import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import dotenv  from 'dotenv'

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

app.get('/', (req, res) =>  {
    res.send('index')
})

app.get('/:partnerId/:orderId', (req, res) => {
    axios.get('http://127.0.0.1:3000/partner', {
        data: {
            'partnerId': req.params.partnerId
        }
    }, axiosConfig).then((response) => {
        axios.get('http://127.0.0.1:3000/order', {
            data: {
                'orderId': req.params.orderId
            }
        }, axiosConfig).then((response2) => {
            console.log(response2)
        }).catch((error2) => {
            res.send("order doesnt exist")
        })
    }).catch((error) => {
        res.send("partner doesnt exist")
    })

   // res.render('order', {partnerId: req.params.partnerId, orderId: req.params.orderId})
})

app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})