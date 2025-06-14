// Menggunakan dynamic import untuk node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Ini adalah fungsi utama yang akan dijalankan oleh Vercel
export default async function handler(request, response) {
  // Hanya izinkan request POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Ambil data dari body request yang dikirim frontend
    const { prompt, negative_prompt, aspect_ratio, sample_count, style_prompt } = request.body;

    if (!prompt) {
      return response.status(400).json({ error: 'Prompt dibutuhkan' });
    }

    // Ambil Kunci Rahasia dari brankas Vercel
    const API_KEY = process.env.VIONIX_API_KEY;
    if (!API_KEY) {
        return response.status(500).json({ error: 'API Key belum di-set di Vercel.' });
    }
    
    // Gabungkan prompt utama dengan prompt gaya
    const finalPrompt = style_prompt ? `${prompt}, ${style_prompt}` : prompt;

    // Siapkan data untuk dikirim ke Google
    const payload = {
        instances: [{
            prompt: finalPrompt,
            negative_prompt: negative_prompt || '',
        }],
        parameters: {
            sampleCount: sample_count || 1,
            aspectRatio: aspect_ratio || '1:1',
        }
    };
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`;

    // Lakukan pemanggilan ke API Google dari server Vercel
    const googleResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await googleResponse.json();

    if (!googleResponse.ok) {
        console.error('Google API Error:', result);
        throw new Error(result.error?.message || 'Terjadi error dari server Google.');
    }
    
    // Kirim kembali hasil gambar ke frontend
    return response.status(200).json(result);

  } catch (error) {
    console.error('Internal Server Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
