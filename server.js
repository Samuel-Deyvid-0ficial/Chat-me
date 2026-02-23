const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// AJUSTE: Permite receber mensagens de até 10MB (essencial para fotos)
const io = new Server(server, {
    maxHttpBufferSize: 1e7 
});

const MONGO_URI = process.env.MONGO_URL;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
        .then(() => console.log("✅ BANCO CONECTADO!"))
        .catch(err => console.log("❌ ERRO NO BANCO:", err.message));
}

const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    image: String,
    type: { type: String, default: 'text' },
    date: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

io.on('connection', async (socket) => {
    try {
        // Busca as últimas 50 mensagens para o histórico
        const history = await Message.find().sort({ date: 1 }).limit(50);
        socket.emit('previous messages', history);
    } catch (err) {
        console.log("Erro ao buscar histórico");
    }

    socket.on('chat message', async (data) => {
        const messageData = {
            sender: data.sender,
            text: data.text || "",
            image: data.image || null,
            type: data.type || 'text',
            date: new Date()
        };
        
        try {
            const msg = new Message(messageData);
            await msg.save();
            io.emit('chat message', msg);

            // AUTO-DESTRUIÇÃO: Apaga a foto do banco após 1 minuto
            if (messageData.type === 'image') {
                setTimeout(async () => {
                    await Message.findByIdAndDelete(msg._id);
                    io.emit('image expired', msg._id);
                    console.log("📸 Foto removida do MongoDB!");
                }, 60000);
            }
        } catch (err) {
            console.log("Erro ao processar mensagem:", err.message);
        }
    });

    socket.on('delete messages', async () => {
        try {
            await Message.deleteMany({});
            io.emit('clear screen');
        } catch (err) { console.log("Erro ao deletar"); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Rodando na porta ${PORT}`));