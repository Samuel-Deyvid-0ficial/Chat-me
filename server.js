const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const MONGO_URI = process.env.MONGO_URL;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
        .then(() => console.log("✅ BANCO CONECTADO!"))
        .catch(err => console.log("❌ ERRO NO BANCO:", err.message));
}

// Modelo atualizado para suportar texto ou imagem
const Message = mongoose.model('Message', {
    sender: String,
    text: String,
    image: String, // Campo para a foto em Base64
    type: { type: String, default: 'text' }, // 'text' ou 'image'
    date: { type: Date, default: Date.now }
});

app.use(express.static(__dirname));

io.on('connection', async (socket) => {
    try {
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
        
        const msg = new Message(messageData);
        await msg.save();
        io.emit('chat message', msg);

        // SE FOR IMAGEM: Configura para apagar do banco após 1 minuto (60000ms)
        if (messageData.type === 'image') {
            setTimeout(async () => {
                await Message.findByIdAndDelete(msg._id);
                io.emit('image expired', msg._id); // Avisa o chat para esconder a foto
                console.log("📸 Foto temporária apagada do banco!");
            }, 60000);
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