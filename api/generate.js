// Menggunakan dynamic import untuk node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Fungsi ini akan dijalankan oleh Vercel
export default async function handler(request, response) {
  // Hanya izinkan POST request
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, model } = request.body;

    if (!prompt || !model) {
      return response.status(400).json({ error: 'Prompt dan model dibutuhkan' });
    }

    // Ambil Kunci Rahasia Hugging Face dari brankas Vercel
    const API_TOKEN = process.env.HF_API_TOKEN;
    if (!API_TOKEN) {
        return response.status(500).json({ error: 'Kunci Rahasia Hugging Face belum dipasang di Vercel.' });
    }
    
    const API_URL = `https://api-inference.huggingface.co/models/${model}`;

    // Lakukan pemanggilan ke API Hugging Face dari server Vercel
    const hfResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    // Jika Hugging Face mengembalikan error (misal: model loading, dll)
    if (!hfResponse.ok) {
        const errorText = await hfResponse.text();
        console.error('Hugging Face Error:', errorText);
        // Coba kirim pesan error yang lebih manusiawi
        if (errorText.includes("is currently loading")) {
            return response.status(503).json({ error: `Modelnya lagi manasin mesin, bro. Coba lagi dalam 1 menit.` });
        }
        return response.status(hfResponse.status).json({ error: `Hugging Face ngambek: ${errorText}` });
    }
    
    // Jika berhasil, kirim kembali gambar mentah ke frontend
    const imageBuffer = await hfResponse.buffer();
    response.setHeader('Content-Type', 'image/jpeg');
    return response.status(200).send(imageBuffer);

  } catch (error) {
    console.error('Internal Server Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
