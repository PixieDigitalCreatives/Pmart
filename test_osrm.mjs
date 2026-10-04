async function testOSRM() {
  const url = `https://router.project-osrm.org/route/v1/driving/77.5250084,28.4797768;77.5301,28.4856?overview=full&geometries=geojson`;
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data).substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}

testOSRM();
