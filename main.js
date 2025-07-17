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

app.get('/dashboard', async (req, res) => {
    const token = req.cookies.access_token;
    if (!token) {
        return res.redirect('/login');
    }

    try {
        // Usa uma Promise para poder usar async/await com a callback do jwt.verify
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.SEGREDO, (err, decodedPayload) => {
                if (err) return reject(err);
                resolve(decodedPayload);
            });
        });
        
        console.log("LOG: Token decodificado. ID do usuário:", decoded.partnerId);

        // 1. Busca os dados do usuário (partner ou employee)
        const partnerResponse = await axios.get(`${process.env.API_SITE_URL}/partner`, {
            data: { partnerId: decoded.partnerId }
        });
        const partnerData = partnerResponse.data;
        console.log(`LOG: Dados do usuário encontrados. Role: ${partnerData.role}, PartnerRef: ${partnerData.partnerRef}`);

        // 2. Define o ID correto para a busca de pedidos
        let idParaBuscaDePedidos;
        if (partnerData.role === 'employee' && partnerData.partnerRef) {
            idParaBuscaDePedidos = partnerData.partnerRef;
        } else {
            idParaBuscaDePedidos = partnerData.partnerId;
        }
        console.log("LOG: ID que será usado para buscar os pedidos:", idParaBuscaDePedidos);

        // 3. Busca os pedidos com o ID correto
        const ordersResponse = await axios.get(`${process.env.API_SITE_URL}/order/by-partner`, {
            data: { partnerId: idParaBuscaDePedidos }
        });
        const dashboardData = ordersResponse.data;
        
        // Verificação importante: Confira se a resposta da API tem o formato esperado
        console.log(`LOG: Resposta da API de pedidos recebida. A resposta contém a chave 'recentOrders'?`, dashboardData.hasOwnProperty('recentOrders'));
        if (dashboardData.recentOrders) {
            console.log(`LOG: Número de pedidos encontrados: ${dashboardData.recentOrders.length}`);
        }

        // 4. Busca o saldo (apenas para o partner principal)
        let balance = {};
        if (partnerData.role !== 'employee') {
            const balanceResponse = await axios.get(`${process.env.API_SITE_URL}/partner/balance`, {
                data: { recipient_id: partnerData.recipient_id }
            });
            balance = balanceResponse.data;
        }

        // 5. Renderiza a página
        res.render('dashboard', {
            partnerData,
            balance,
            stats: dashboardData.stats || {},
            orders: dashboardData.recentOrders || [] // Garante que 'orders' seja sempre um array
        });

    } catch (error) {
        // Se qualquer etapa acima falhar, o erro será capturado aqui
        console.error("--- ERRO NO FLUXO DO DASHBOARD ---");
        if (error.response) {
            console.error("Erro da API:", {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url
            });
        } else {
            console.error("Erro geral:", error.message);
        }
        // Redireciona para o login em caso de token inválido, ou mostra erro genérico
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.redirect('/login');
        }
        res.status(500).send("Ocorreu um erro ao carregar o dashboard. Verifique o console do servidor.");
    }
});

app.get('/:partnerId/:orderId', (req, res) => {
    axios.get('https://api.pagjunto.com/v1/partner', {
        data: {
            'partnerId': req.params.partnerId
        }
    }).then((response) => {
        var partnerData = response.data
        axios.get('https://api.pagjunto.com/v1/order', {
            data: {
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