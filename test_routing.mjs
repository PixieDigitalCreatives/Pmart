import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_MAPTILER_API_KEY || 'Ex3uk6dmjLzOoVUhieWZ';

async function testRouting() {
  const url = `https://api.maptiler.com/routes/v1/driving/77.5250084,28.4797768;77.5301,28.4856?key=${API_KEY}&geometries=geojson`;
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data).substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}

testRouting();
