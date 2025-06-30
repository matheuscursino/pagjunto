import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function login(req, res) {
    const { email, senha } = req.body;

    // Basic input validation
    if (!email || !senha) {
        return res.status(400).send({ erro: 'Email e senha são obrigatórios.' });
    }

    try {
        // 🔗 Consulta a API com Axios
        const response = await axios.get('https://api.pagjunto.com/partner/by-email', { data:{ 'email': email }});

        // Destructure directly and handle cases where data might be missing
        const { password: senhaCriptografada, partnerId } = response.data || {};

        if (!senhaCriptografada || !partnerId) {
            // This case might occur if the API returns an empty data object but status 200
            return res.status(500).send({ erro: 'Dados do parceiro incompletos recebidos da API.' });
        }

        // 🔐 Verifica a senha
        const senhaCorreta = await bcrypt.compare(senha, senhaCriptografada);

        if (!senhaCorreta) {
            return res.status(401).send({ erro: 'Credenciais inválidas.' }); // More generic message for security
        }

        // 🎟️ Cria o JWT
        // Ensure process.env.SEGREDO is defined in your .env file
        if (!process.env.SEGREDO) {
            console.error('Erro: Variável de ambiente SEGREDO não definida.');
            return res.status(500).send({ erro: 'Erro de configuração do servidor.' });
        }
        const token = jwt.sign({ partnerId }, process.env.SEGREDO, { expiresIn: '1h' }); // Add expiration time

        // 🍪 Envia cookie com token
        // Use `secure: true` in production and `sameSite: 'Strict'` for better security
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: 'Strict', // More secure, consider 'Lax' if cross-site requests are needed
            maxAge: 3600000, // 1 hour in milliseconds, matches JWT expiration
            path: '/', // The path for which the cookie is valid
        })
        .status(200)
        .send({ mensagem: 'Login feito com sucesso', token }); // Optionally send token in body too
    } catch (err) {
        if (err.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            if (err.response.status === 404) {
                return res.status(404).send({ erro: 'Usuário não encontrado.' });
            } else if (err.response.status === 401) {
                return res.status(401).send({ erro: 'Não autorizado pela API externa.' });
            }
            // For other API errors
            return res.status(err.response.status).send({ erro: err.response.data.message || 'Erro na comunicação com a API de parceiros.' });
        } else if (err.request) {
            // The request was made but no response was received
            console.error('Erro de rede: Nenhuma resposta recebida da API externa.', err.message);
            return res.status(503).send({ erro: 'Serviço de autenticação temporariamente indisponível.' });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Erro inesperado durante o login:', err.message);
            return res.status(500).send({ erro: 'Erro interno no servidor.' });
        }
    }
}