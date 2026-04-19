const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios'); // Usaremos axios para el camino directo

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- CONFIGURACIÓN DE FIREBASE ---
try {
    if (!admin.apps.length) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY 
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
            : undefined;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            })
        });
        console.log(">> ✅ Firebase inicializado correctamente");
    }
} catch (e) {
    console.error(">> ❌ ERROR AL INICIALIZAR FIREBASE:", e.message);
}
const db = admin.firestore();

app.get('/', (req, res) => res.send('🚀 AdminSmart Engine Omnicanal Activo'));

app.post('/chat-publico', async (req, res) => {
    const { mensaje, userId } = req.body;

    if (!userId || !mensaje) return res.status(400).send("Faltan datos");

    try {
        // 1. BUSCAR AL USUARIO
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) return res.status(404).send("Usuario no encontrado");
        const userData = userDoc.data();

        // 2. CONTROL DE MENSAJES
        const currentCount = userData.msgCount || 0;
        const limit = userData.limiteMensajes || 50;

        if (currentCount >= limit) {
            return res.json({ respuesta: "Lo siento, este servicio ha alcanzado su límite mensual." });
        }

        // 3. BUSCAR FAQS
        const faqsSnapshot = await db.collection('faqs').where('uid', '==', userId).get();
        let contextoFaqs = "";
        faqsSnapshot.forEach(doc => {
            const d = doc.data();
            contextoFaqs += `P: ${d.question || d.pregunta} - R: ${d.answer || d.respuesta}\n`;
        });

        // 4. ARMAR EL PROMPT
        const businessName = userData.config?.businessName || 'nuestra empresa';
        const catalog = userData.config?.catalogUrl ? 'Catálogo: ' + userData.config.catalogUrl : '';
        
        const promptTexto = `Eres el asistente de ventas inteligente de "${businessName}".
        CONOCIMIENTO: ${contextoFaqs}
        ${catalog}
        INSTRUCCIONES: Sé amable, usa emojis y responde a: "${mensaje}"`;

        // 5. CAMINO DIRECTO A GEMINI (Usando Axios)
       const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY.trim()}`;
        
        const response = await axios.post(GEMINI_URL, {
            contents: [{
                parts: [{ text: promptTexto }]
            }]
        });

        // Extraemos el texto de la respuesta de Google
        const respuestaIA = response.data.candidates[0].content.parts[0].text;

        // 6. ACTUALIZAR CONTADOR Y RESPONDER
        await userRef.update({ msgCount: admin.firestore.FieldValue.increment(1) });
        
        res.json({ respuesta: respuestaIA });

   } catch (error) {
        console.error("🔥 ERROR EN EL SISTEMA:");
        
        // Log detallado para vos en Render
        if (error.response) {
            console.error("Detalle Google:", JSON.stringify(error.response.data));
        } else {
            console.error("Mensaje de error:", error.message);
        }

        try {
            // 1. Intentamos obtener el teléfono del usuario para el link de WhatsApp
            // Usamos los datos que ya pedimos al principio (userData)
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            const telefono = userData?.config?.phone || ""; // Buscamos el campo phone
            
            let mensajeErrorVendedor = "¡Hola! En este momento estoy actualizando mi catálogo para darte la mejor información. 😅\n\n";
            mensajeErrorVendedor += "Mientras tanto, podés usar el **Menú de opciones** de aquí abajo o, si preferís, escribinos directamente por WhatsApp para una **atención personalizada**.";

            // 2. Si hay teléfono, agregamos el link directo
            if (telefono) {
                const linkWA = `https://wa.me/${telefono.replace(/\+/g, '').replace(/\s/g, '')}`;
                mensajeErrorVendedor += `\n\n👉 Chatear por WhatsApp: ${linkWA}`;
            }

            res.json({ respuesta: mensajeErrorVendedor });

        } catch (innerError) {
            // Si incluso falla la búsqueda en Firebase, mandamos un mensaje genérico amable
            res.json({ 
                respuesta: "¡Hola! Estamos recibiendo muchas consultas. Por favor, utilizá el menú de opciones o intentá escribirnos nuevamente en unos minutos. ¡Gracias por tu paciencia! 🙏" 
            });
        }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Puente soldado vía Directa en puerto ${PORT}`));

