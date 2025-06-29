import express from 'express'
var signinRouter = express.Router()
import { login } from '../controller/signin.controller.js'

signinRouter.post('/', login )

export default signinRouter;