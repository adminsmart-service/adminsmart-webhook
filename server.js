const express = require('express');
const cors = require('cors'); // Vital para el chat web
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- ESTA ES TU BASE DE DATOS DE CONOCIMIENTO (FAQS) ---
// Aquí es donde el usuario (vos) carga la información que la IA debe respetar.
const MIS_DATOS_NEGOCIO = `
  Eres el asistente oficial de AdminSmart Pro.
  REGLAS DE ORO:
  1. Solo respondes basándote en la información de abajo.
  2. Si el usuario pregunta algo que no está aquí, dices: "Esa información no la tengo, pero puedo comunicarte con un asesor".
  
  DATOS CARGADOS:
  - AdminSmart Pro: SaaS de automatización inteligente para emprendedores.
  - Funciones: Chatbots para WhatsApp, Instagram y Web que recuperan tu libertad.
  - Integración: Gemini AI conectada a Webhooks de Meta.
  - Ubicación: San José de Feliciano, Entre Ríos.
  (Podés seguir agregando más datos aquí...)
`;

app.get('/', (req, res) => {
    res.send('🚀 AdminSmart Pro: Servidor conectado y cerebro de IA listo.');
});

// ESTE ES EL CABLEADO PARA EL CHAT PÚBLICO
app.post('/chat-publico', async (req, res) => {
    const { mensaje, datosUsuario } = req.body; // Recibe el mensaje y opcionalmente datos del usuario
    
    try {
        // Construimos el prompt usando los datos que cargaste (FAQs)
        let promptFull = `${MIS_DATOS_NEGOCIO}\n\n`;
        
        if(datosUsuario) {
            promptFull += `Datos del cliente actual: ${JSON.stringify(datosUsuario)}\n`;
        }
        
        promptFull += `Pregunta del cliente: ${mensaje}\nRespuesta de AdminSmart Pro:`;

        const result = await model.generateContent(promptFull);
        const respuestaIA = result.response.text();
        
        res.json({ respuesta: respuestaIA });
    } catch (error) {
        console.error("Error en Gemini:", error);
        res.status(500).json({ error: "Falla en el cableado de la IA." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cableado completo en puerto ${PORT}`);
});
