// import xRouter from './routes/x.route.js'

import express from 'express'
import bodyParser from 'body-parser'
import dotenv  from 'dotenv'

const app = express()
const port = 80

dotenv.config()

app.use(bodyParser.urlencoded({
    extended: true
  }))

app.use(bodyParser.json())
app.set('view engine', 'ejs')
app.set('views', './view')

app.get('/', (req, res) =>  {
    res.send('index')
})

// app.use('/x', xRouter)

app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})