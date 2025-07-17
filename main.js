import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import dotenv  from 'dotenv'
import signinRouter from './route/signin.route.js'
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
const port = 80

// NOTA: Para requisições GET com 'data' no Axios, o correto é usar 'params'
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

// ROTA DO DASHBOARD CORRIGIDA E REATORADA
app.get('/dashboard', (req, res) => {
    const token = req.cookies.access_token;

    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, process.env.SEGREDO, async (err, decoded) => {
        if (err) {
            console.error("Erro na verificação do JWT:", err);
            return res.redirect('/login');
        }

        try {
            // 1. Buscar os dados do parceiro/funcionário logado
            const partnerResponse = await axios.get(`${process.env.API_SITE_URL}/partner`, {
                params: { partnerId: decoded.partnerId }, // Para GET, use 'params'
                headers: axiosConfig.headers
            });
            const partnerData = partnerResponse.data;

            // 2. Determinar qual ID usar para buscar os pedidos
            let idParaBuscaDePedidos;
            if (partnerData.role === 'employee' && partnerData.partnerRef) {
                // Se for funcionário, usa a referência do parceiro principal
                idParaBuscaDePedidos = partnerData.partnerRef;
            } else {
                // Se for o parceiro principal, usa o próprio ID
                idParaBuscaDePedidos = partnerData.partnerId;
            }

            // 3. Buscar os pedidos usando o ID correto
            const ordersResponse = await axios.get(`${process.env.API_SITE_URL}/order/by-partner`, {
                params: { partnerId: idParaBuscaDePedidos }, // Usando a variável correta
                headers: axiosConfig.headers
            });
            const dashboardData = ordersResponse.data;

            let balance = {}; // Inicializa o saldo como objeto vazio

            // 4. Buscar o saldo APENAS se for o parceiro principal
            if (partnerData.role !== 'employee') {
                const balanceResponse = await axios.get(`${process.env.API_SITE_URL}/partner/balance`, {
                    params: { recipient_id: partnerData.recipient_id },
                    headers: axiosConfig.headers
                });
                balance = balanceResponse.data;
            }

            // 5. Renderizar a página com todos os dados coletados
            res.render('dashboard', {
                partnerData: partnerData,
                balance: balance,
                stats: dashboardData.stats,
                orders: dashboardData.recentOrders
            });

        } catch (error) {
            console.error("Erro ao buscar dados para o dashboard:", error.response ? error.response.data : error.message);
            // Renderiza uma página de erro ou redireciona
            res.status(500).send("Ocorreu um erro ao carregar as informações do dashboard.");
        }
    });
});


app.get('/:partnerId/:orderId', (req, res) => {
    axios.get('https://api.pagjunto.com/v1/partner', {
        params: { 'partnerId': req.params.partnerId } // Correção: GET usa 'params'
    }, axiosConfig).then((response) => {
        var partnerData = response.data
        axios.get('https://api.pagjunto.com/v1/order', {
            params: { orderId: req.params.orderId } // Correção: GET usa 'params'
        }, axiosConfig).then((response2) => {
            res.render('order', {orderData: response2.data, partnerData})
        }).catch((error2) => {
            res.render('orderNotFound')
        })
    }).catch((error) => {
        res.render('orderNotFound') // Corrigido para renderizar a página de não encontrado
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
  res.status(404).render("404") // Adicionado status 404 para clareza
});

app.listen(port, () => {
    console.log(`Servidor iniciado na porta: ${port}`)
})