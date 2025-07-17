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

// Substitua sua rota app.get('/dashboard', ...) em main.js por esta:

app.get('/dashboard', async (req, res) => {
    const token = req.cookies.access_token;
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.SEGREDO, (err, decodedPayload) => {
                if (err) return reject(err);
                resolve(decodedPayload);
            });
        });

        // 1. Busca os dados do usuário logado (o funcionário)
        const employeeResponse = await axios.get(`${process.env.API_SITE_URL}/partner`, {
            data: { partnerId: decoded.partnerId }
        });
        const employeeData = employeeResponse.data;

        // Prepara os dados que serão enviados para o template
        let dataParaTemplate = { ...employeeData };
        let idParaBuscaDePedidos = employeeData.partnerId;

        // 2. SE for um funcionário, busca os dados do parceiro principal
        if (employeeData.role === 'employee' && employeeData.partnerRef) {
            idParaBuscaDePedidos = employeeData.partnerRef; // Pedidos são do chefe

            const partnerResponse = await axios.get(`${process.env.API_SITE_URL}/partner`, {
                data: { partnerId: employeeData.partnerRef }
            });
            const partnerData = partnerResponse.data;

            // 3. SOBRESCREVE a apiKey no objeto que vai para o template
            // Agora o frontend terá a apiKey do chefe para usar na criação de pedidos
            dataParaTemplate.apiKey = partnerData.apiKey;
        }

        // 4. Busca os pedidos com o ID correto (do chefe ou do próprio parceiro)
        const ordersResponse = await axios.get(`${process.env.API_SITE_URL}/order/by-partner`, {
            data: { partnerId: idParaBuscaDePedidos }
        });
        const dashboardData = ordersResponse.data;

        // 5. Busca o saldo (apenas para o partner principal)
        let balance = {};
        if (employeeData.role !== 'employee') {
            const balanceResponse = await axios.get(`${process.env.API_SITE_URL}/partner/balance`, {
                data: { recipient_id: employeeData.recipient_id }
            });
            balance = balanceResponse.data;
        }

        // 6. Renderiza a página com os dados corretos
        res.render('dashboard', {
            partnerData: dataParaTemplate, // Envia o objeto com a apiKey correta!
            balance,
            stats: dashboardData.stats || {},
            orders: dashboardData.recentOrders || []
        });

    } catch (error) {
        console.error("--- ERRO NO FLUXO DO DASHBOARD ---", error.message);
        if (error.name === 'JsonWebTokenError') return res.redirect('/login');
        res.status(500).send("Ocorreu um erro ao carregar o dashboard.");
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