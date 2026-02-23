const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// IMPORTANTE: Nome da variável exatamente como está no seu Railway
const MONGO_URI = process.env.URL_MONGO; 

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
        .catch(err => console.log("❌ Erro de conexão:", err));
}

// Modelo para salvar as mensagens no banco
const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

io.on('connection', async (socket) => {
    // Quando o usuário loga, o servidor busca as mensagens antigas
    try {
        const history = await Message.find().sort({ timestamp: 1 }).limit(50);
        socket.emit('previous messages', history);
    } catch (err) {
        console.log("Erro ao buscar histórico");
    }

    socket.on('chat message', async (data) => {
        // Envia para todos na hora
        io.emit('chat message', data);
        
        // Salva permanentemente no MongoDB
        try {
            const newMessage = new Message({
                sender: data.sender,
                text: data.text
            });
            await newMessage.save();
        } catch (err) {
            console.log("Erro ao salvar no banco");
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});