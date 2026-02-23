const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Certifique-se de que no Railway o nome agora é MONGO_URL
const MONGO_URI = process.env.MONGO_URL;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
        .then(() => console.log("✅ BANCO CONECTADO!"))
        .catch(err => console.log("❌ ERRO NO BANCO:", err.message));
}

const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    date: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

io.on('connection', async (socket) => {
    // Envia o histórico ao conectar
    try {
        const history = await Message.find().sort({ date: 1 }).limit(100);
        socket.emit('previous messages', history);
    } catch (err) {
        console.log("Erro ao buscar histórico");
    }

    // Recebe e salva mensagem
    socket.on('chat message', async (data) => {
        io.emit('chat message', data);
        try {
            const msg = new Message(data);
            await msg.save();
        } catch (err) {
            console.log("Erro ao salvar mensagem");
        }
    });

    // FUNÇÃO PARA EXCLUIR TUDO
    socket.on('delete messages', async () => {
        try {
            await Message.deleteMany({}); // Apaga tudo no MongoDB
            io.emit('clear screen'); // Avisa todos os usuários para limparem a tela
            console.log("Histórico apagado pelo usuário.");
        } catch (err) {
            console.log("Erro ao deletar mensagens");
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Rodando na porta ${PORT}`));