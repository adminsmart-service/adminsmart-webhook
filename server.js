const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors({
  origin: '*', // Permite peticiones desde cualquier lugar (incluyendo tu app de Firebase)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- CONFIGURACIÓN DE FIREBASE ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}
const db = admin.firestore();

// --- CONFIGURACIÓN DE GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
}, { apiVersion: 'v1' });

app.get('/', (req, res) => res.send('🚀 AdminSmart Engine Omnicanal Activo'));

app.post('/chat-publico', async (req, res) => {
    const { mensaje, userId } = req.body;

    if (!userId || !mensaje) return res.status(400).send("Faltan datos");

    try {
        // 1. BUSCAR AL USUARIO (Colección 'users')
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) return res.status(404).send("Usuario no encontrado");
        const userData = userDoc.data();

        // 2. CONTROL DE MENSAJES (msgCount vs limite)
        const currentCount = userData.msgCount || 0;
        const limit = userData.limiteMensajes || 50; // Ajustá según tu campo

        if (currentCount >= limit) {
            return res.json({ respuesta: "Lo siento, este servicio ha alcanzado su límite mensual." });
        }

        // 3. BUSCAR TODAS SUS FAQS (Colección 'faqs' filtrando por 'uid')
        const faqsSnapshot = await db.collection('faqs').where('uid', '==', userId).get();
        let contextoFaqs = "";
        faqsSnapshot.forEach(doc => {
            const d = doc.data();
            contextoFaqs += `P: ${d.question || d.pregunta} - R: ${d.answer || d.respuesta}\n`;
        });

        // 4. ARMAR EL PROMPT VENDEDOR (Híbrido)
        const prompt = `
            Eres el asistente de ventas inteligente de "${userData.config?.businessName || 'nuestra empresa'}".
            
            CONOCIMIENTO DEL NEGOCIO:
            ${contextoFaqs}
            
            CATÁLOGO/LINKS:
            ${userData.config?.catalogUrl ? 'Catálogo: ' + userData.config.catalogUrl : ''}
            
            INSTRUCCIONES:
            - Usa el conocimiento de arriba para responder.
            - Si el cliente pregunta varias cosas, respóndelas todas con cordialidad.
            - Sé vendedor, amable y usa emojis.
            - Si no sabes la respuesta, ofrece derivar a WhatsApp.
            
            CLIENTE PREGUNTA: "${mensaje}"
            RESPUESTA VENDEDORA:
        `;

        // 5. GENERAR RESPUESTA CON GEMINI
        const result = await model.generateContent(prompt);
        const respuestaIA = result.response.text();

        // 6. ACTUALIZAR CONTADOR Y RESPONDER
        await userRef.update({ msgCount: admin.firestore.FieldValue.increment(1) });
        
        res.json({ respuesta: respuestaIA });

    } catch (error) {
        console.error("Error en el Puente:", error);
        res.status(500).json({ respuesta: "Estamos experimentando una alta demanda, ¿podrías repetir?" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Puente soldado en puerto ${PORT}`));
