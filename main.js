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

dotenv.config()

const corsOptions = {
  origin: ['https://www.pagjunto.com', 'https://pagjunto.com', 'http://localhost'], // Adicionado localhost para testes
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Simplificado para todas as rotas

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public')));


app.get('/', (req, res) =>  {
    res.render('lp')
})

app.get('/login', (req, res) => {
    res.render('login')
})

// ROTA DO DASHBOARD CORRIGIDA E COM DEPURAÇÃO
app.get('/dashboard', (req, res) => {
    const token = req.cookies.access_token;

    if (!token) {
        console.log("LOG: Token não encontrado. Redirecionando para /login.");
        return res.redirect('/login');
    }

    jwt.verify(token, process.env.SEGREDO, async (err, decoded) => {
        if (err) {
            console.error("LOG: Erro na verificação do JWT. Token inválido ou expirado.", err);
            return res.redirect('/login');
        }

        console.log("LOG: Token decodificado com sucesso. partnerId:", decoded.partnerId);

        try {
            // ETAPA 1: Buscar dados do parceiro/funcionário
            console.log(`LOG: Buscando dados para partnerId: ${decoded.partnerId}`);
            const partnerResponse = await axios.get(`${process.env.API_SITE_URL}/partner`, {
                params: { partnerId: decoded.partnerId }
            });
            const partnerData = partnerResponse.data;
            console.log("LOG: Dados do parceiro recebidos. Role:", partnerData.role);

            // ETAPA 2: Determinar qual ID usar para buscar os pedidos
            let idParaBuscaDePedidos;
            if (partnerData.role === 'employee' && partnerData.partnerRef) {
                idParaBuscaDePedidos = partnerData.partnerRef;
                console.log(`LOG: Usuário é 'employee'. Usando partnerRef para buscar pedidos: ${idParaBuscaDePedidos}`);
            } else {
                idParaBuscaDePedidos = partnerData.partnerId;
                console.log(`LOG: Usuário é 'partner'. Usando partnerId para buscar pedidos: ${idParaBuscaDePedidos}`);
            }

            // ETAPA 3: Buscar os pedidos usando o ID correto
            const ordersResponse = await axios.get(`${process.env.API_SITE_URL}/order/by-partner`, {
                params: { partnerId: idParaBuscaDePedidos }
            });
            const dashboardData = ordersResponse.data;
            console.log(`LOG: ${dashboardData.recentOrders ? dashboardData.recentOrders.length : 0} pedidos encontrados.`);

            let balance = {};

            // ETAPA 4: Buscar o saldo APENAS se for o parceiro principal
            if (partnerData.role !== 'employee') {
                console.log(`LOG: Buscando saldo para recipient_id: ${partnerData.recipient_id}`);
                const balanceResponse = await axios.get(`${process.env.API_SITE_URL}/partner/balance`, {
                    params: { recipient_id: partnerData.recipient_id }
                });
                balance = balanceResponse.data;
                console.log("LOG: Saldo recebido.");
            } else {
                console.log("LOG: Pulando busca de saldo para 'employee'.");
            }

            // ETAPA 5: Renderizar a página
            console.log("LOG: Renderizando a página do dashboard...");
            res.render('dashboard', {
                partnerData: partnerData,
                balance: balance,
                stats: dashboardData.stats,
                orders: dashboardData.recentOrders
            });

        } catch (error) {
            console.error("--- ERRO CRÍTICO AO BUSCAR DADOS PARA O DASHBOARD ---");
            if (error.response) {
                // O erro veio da API (ex: 404, 401, 500)
                console.error("URL:", error.config.url);
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
            } else if (error.request) {
                // A requisição foi feita mas não houve resposta
                console.error("Erro de requisição, sem resposta da API:", error.request);
            } else {
                // Erro na configuração do axios ou outro erro de javascript
                console.error("Erro:", error.message);
            }
            res.status(500).send("Ocorreu um erro ao carregar as informações do dashboard. Verifique o console do servidor para mais detalhes.");
        }
    });
});


app.get('/:partnerId/:orderId', async (req, res) => {
    try {
        const partnerResponse = await axios.get('https://api.pagjunto.com/v1/partner', {
            params: { 'partnerId': req.params.partnerId }
        });
        const partnerData = partnerResponse.data;

        const orderResponse = await axios.get('https://api.pagjunto.com/v1/order', {
            params: { orderId: req.params.orderId }
        });
        const orderData = orderResponse.data;

        res.render('order', { orderData: orderData, partnerData: partnerData });

    } catch (error) {
        console.error("Erro ao buscar pedido/parceiro:", error.response ? error.response.data : error.message);
        res.status(404).render('orderNotFound');
    }
});

app.get('/logout', (req, res) => {
    res
    .clearCookie('access_token', {path:'/'})
    .status(200)
    .redirect('/login');
});

app.use('/signin', signinRouter);

app.get('/docs', (req, res) => {
    res.render('docs');
});

app.use((req, res, next) => {
  res.status(404).render("404");
});

app.listen(port, () => {
    console.log(`Servidor iniciado na porta: ${port}`);
});