const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conexão com o Banco de Dados via Variável de Ambiente
const MONGO_URI = process.env.MONGO_URL;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("MongoDB Conectado!"))
        .catch(err => console.error("Erro MongoDB:", err));
}

// Definição de como a mensagem será salva
const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    date: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', async (socket) => {
    // Busca histórico ao conectar
    if (MONGO_URI) {
        const history = await Message.find().sort({ date: 1 }).limit(50);
        socket.emit('previous messages', history);
    }

    socket.on('chat message', async (data) => {
        if (MONGO_URI) {
            const msg = new Message(data);
            await msg.save();
        }
        io.emit('chat message', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});