const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// USANDO O NOME PADRÃO MONGO_URL
const MONGO_URI = process.env.MONGO_URL;

if (MONGO_URI) {
    // Adicionamos configurações para evitar o erro de Timeout do log
    mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
        .then(() => console.log("✅ BANCO CONECTADO COM SUCESSO!"))
        .catch(err => console.log("❌ ERRO NO BANCO:", err.message));
}

const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    date: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

io.on('connection', async (socket) => {
    // Busca o histórico e envia para o usuário
    try {
        const history = await Message.find().sort({ date: 1 }).limit(100);
        socket.emit('previous messages', history);
        console.log(`Enviadas ${history.length} mensagens de histórico.`);
    } catch (err) {
        console.log("Erro ao ler histórico:", err.message);
    }

    socket.on('chat message', async (data) => {
        io.emit('chat message', data);
        try {
            const msg = new Message(data);
            await msg.save();
            console.log("Mensagem salva!");
        } catch (err) {
            console.log("Erro ao salvar:", err.message);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Rodando na porta ${PORT}`));