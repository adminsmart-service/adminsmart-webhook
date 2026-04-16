const express = require('express');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Importamos Gemini
const app = express();
app.use(express.json());

// --- CONFIGURACIÓN DE GEMINI ---
// Render leerá automáticamente la clave que pusiste en Environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- TU BASE DE CONOCIMIENTOS (FAQs) ---
// Todo lo que escribas acá será la única verdad para el bot.
const CONTEXTO_NEGOCIO = `
  Eres el asistente inteligente de AdminSmart Pro. 
  Tu objetivo es ayudar a pequeñas y medianas empresas a automatizar su atención al cliente.
  
  Información importante:
  - AdminSmart Pro es un SaaS de chatbots automatizados.
  - Ofrecemos integración con WhatsApp, Instagram y Web.
  - Beneficios: Atención 24/7, respuestas instantáneas y reducción de costos operativos.
  - Si no sabes la respuesta a algo específico, di que un asesor humano se contactará pronto.
  - Mantén un tono profesional pero cercano y amable.
`;

// Mensaje de bienvenida
app.get('/', (req, res) => {
    res.send('🚀 Centro de Operaciones AdminSmart Pro: Inteligencia Gemini ACTIVA.');
});

// Endpoint para el Chat Público (Web)
app.post('/chat-publico', async (req, res) => {
    const { mensaje } = req.body;
    
    try {
        const prompt = `${CONTEXTO_NEGOCIO}\n\nCliente pregunta: ${mensaje}\nRespuesta corta y precisa:`;
        const result = await model.generateContent(prompt);
        const respuestaIA = result.response.text();
        
        res.json({ respuesta: respuestaIA });
    } catch (error) {
        console.error("Error con Gemini:", error);
        res.status(500).json({ error: "Hubo un problema con el cerebro de la IA." });
    }
});

// El Webhook para Meta (WhatsApp)
app.post('/webhook', async (req, res) => {
    // Verificamos si Meta está enviando un mensaje
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        try {
            // Aquí extraemos el texto del mensaje (Simplificado)
            const msgText = body.entry[0].changes[0].value.messages[0].text.body;
            
            // Consultamos a Gemini
            const prompt = `${CONTEXTO_NEGOCIO}\n\nCliente por WhatsApp: ${msgText}\nIA responde:`;
            const result = await model.generateContent(prompt);
            const respuestaIA = result.response.text();

            console.log('IA respondió a WhatsApp:', respuestaIA);
            
            // AQUÍ IRÍA EL CÓDIGO PARA ENVIAR EL MENSAJE DE VUELTA A WHATSAPP
            
            res.sendStatus(200);
        } catch (err) {
            res.sendStatus(200); // Siempre respondemos 200 a Meta para que no reintente
        }
    } else {
        res.sendStatus(404);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de AdminSmart con Gemini en puerto ${PORT}`);
});
