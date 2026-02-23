const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Variável que você configurou no Railway
const MONGO_URI = process.env.URL_MONGO;

// Tenta conectar ao banco de dados
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ CONEXÃO ESTABELECIDA COM O MONGODB!"))
        .catch(err => console.log("❌ ERRO AO CONECTAR AO BANCO: ", err));
} else {
    console.log("❌ VARIÁVEL 'URL_MONGO' NÃO ENCONTRADA NO RAILWAY!");
}

// Estrutura das mensagens
const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    date: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

io.on('connection', async (socket) => {
    console.log("Novo usuário logado no chat.");

    // BUSCA HISTÓRICO: O servidor busca as últimas 100 mensagens salvas
    try {
        const history = await Message.find().sort({ date: 1 }).limit(100);
        socket.emit('previous messages', history);
    } catch (err) {
        console.log("Erro ao carregar histórico: ", err);
    }

    // RECEBE E SALVA: Quando alguém envia, o servidor salva no banco
    socket.on('chat message', async (data) => {
        io.emit('chat message', data); // Envia na hora para a tela
        
        try {
            const msg = new Message(data);
            await msg.save(); // Salva permanentemente no MongoDB Atlas
            console.log("Mensagem salva no banco com sucesso!");
        } catch (err) {
            console.log("Erro ao salvar mensagem: ", err);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});