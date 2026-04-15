const express = require('express');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

// Mensaje de bienvenida para saber que el servidor está en línea
app.get('/', (req, res) => {
    res.send('🚀 Centro de Operaciones AdminSmart Pro: ACTIVO y funcionando.');
});

// Esta es la "oreja" que escuchará a Meta (WhatsApp, FB, Instagram)
app.post('/webhook', (req, res) => {
    console.log('--- Nuevo mensaje recibido de Meta ---');
    // Aquí procesaremos la lógica de Gemini y Firebase en el siguiente paso
    res.sendStatus(200); 
});

// Configuración del puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de AdminSmart corriendo en el puerto ${PORT}`);
});