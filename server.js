const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conexão com seu banco de dados no Railway
const MONGO_URI = process.env.URL_MONGO;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ Banco conectado com sucesso!"))
        .catch(err => console.log("❌ Erro no banco:", err));
}

const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    date: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

io.on('connection', async (socket) => {
    // Carrega o histórico assim que o login é feito
    try {
        const history = await Message.find().sort({ date: 1 }).limit(100);
        socket.emit('previous messages', history);
    } catch (err) {
        console.log("Erro no histórico.");
    }

    socket.on('chat message', async (data) => {
        io.emit('chat message', data);
        try {
            const msg = new Message(data);
            await msg.save();
        } catch (err) {
            console.log("Erro ao salvar.");
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Rodando na porta ${PORT}`));