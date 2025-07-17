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
            if (err) {
                // Se o token for inválido, redireciona para o login
                return res.redirect('/login');
            }
            // A primeira chamada busca os dados do usuário logado (partner ou employee)
            axios.get(`${process.env.API_SITE_URL}/partner`, {
                // Nota: Para GET, o correto é usar 'params', não 'data'.
                // Se sua API não funcionar com 'data', mude para 'params'.
                params: {
                    partnerId: decoded.partnerId
                }
            }).then((response) => {
                var partnerData = response.data

                // --- INÍCIO DA ALTERAÇÃO ---
                let idParaBuscaDePedidos;

                // Verifica se o usuário é um 'employee' e tem um 'partnerRef'
                if (partnerData.role === 'employee' && partnerData.partnerRef) {
                    // Se sim, usa o ID do parceiro principal para buscar os pedidos
                    idParaBuscaDePedidos = partnerData.partnerRef;
                } else {
                    // Senão (se for o parceiro principal), usa o próprio ID
                    idParaBuscaDePedidos = partnerData.partnerId;
                }
                // --- FIM DA ALTERAÇÃO ---

                // A segunda chamada agora usa o ID correto para buscar os pedidos
                axios.get(`${process.env.API_SITE_URL}/order/by-partner`, {
                    params: {
                        partnerId: idParaBuscaDePedidos // Usa a variável com o ID correto
                    }
                }).then((response2) => {
                    var dashboardData = response2.data

                    // Se for um funcionário, não busca o saldo e renderiza a página
                    if (partnerData.role === 'employee') {
                        return res.render('dashboard', {
                            partnerData: partnerData,
                            balance: {}, // Envia um objeto de saldo vazio
                            stats: dashboardData.stats, 
                            orders: dashboardData.recentOrders
                        });
                    }
                    
                    // Se for o parceiro principal, continua para buscar o saldo
                    axios.get(`${process.env.API_SITE_URL}/partner/balance`, {
                        params: {
                            recipient_id: partnerData.recipient_id
                        }
                    }).then((response3)=> {
                        var balance = response3.data
                        res.render('dashboard', {
                            partnerData:partnerData,
                            balance: balance,
                            stats: dashboardData.stats, 
                            orders: dashboardData.recentOrders
                        })
                    }).catch((e) => {
                        console.log("Erro ao buscar saldo:", e.message);
                        res.status(500).send("Erro ao buscar saldo do parceiro.");
                    })
                }).catch((e) => {
                    console.log("Erro ao buscar pedidos:", e.message);
                    res.status(500).send("Erro ao buscar pedidos.");
                })
            }).catch((e) => {
                console.log("Erro ao buscar dados do parceiro:", e.message);
                res.status(500).send("Erro ao buscar dados do parceiro.");
            })
        })
    }
})

app.get('/:partnerId/:orderId', (req, res) => {
    axios.get('https://api.pagjunto.com/v1/partner', {
        params: {
            'partnerId': req.params.partnerId
        }
    }).then((response) => {
        var partnerData = response.data
        axios.get('https://api.pagjunto.com/v1/order', {
            params: {
                orderId: req.params.orderId
            }
        }).then((response2) => {
            res.render('order', {orderData: response2.data, partnerData})
        }).catch((error2) => {
            res.render('orderNotFound')
        })
    }).catch((error) => {
        res.render('orderNotFound')
    })
})

app.get('/logout', (req, res) => {
    res
    .clearCookie('access_token', {path:'/'})
    .status(200)
    .redirect('/login')
})

app.use('/signin', signinRouter)

app.get('/docs', (req,res) => {
    res.render('docs')
})

app.use((req, res, next) => {
  res.status(404).render("404")
});

app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})