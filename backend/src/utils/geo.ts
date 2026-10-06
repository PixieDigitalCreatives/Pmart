export function normalizeCoordinates(lng: any, lat: any): [number, number] {
  const parsedLng = parseFloat(lng);
  const parsedLat = parseFloat(lat);
  
  if (isNaN(parsedLng) || isNaN(parsedLat)) {
    throw new Error('Coordinates must be valid numbers');
  }
  
  if (parsedLng === 0 && parsedLat === 0) {
    throw new Error('Coordinates 0,0 are rejected as invalid default');
  }
  
  let finalLng = parsedLng;
  let finalLat = parsedLat;
  
  if (parsedLat < -90 || parsedLat > 90) {
    if (parsedLng >= -90 && parsedLng <= 90 && parsedLat >= -180 && parsedLat <= 180) {
      console.warn(`Swapping suspicious coordinates: lat=${parsedLat}, lng=${parsedLng}`);
      finalLng = parsedLat;
      finalLat = parsedLng;
    } else {
      throw new Error(`Latitude ${parsedLat} is out of bounds [-90, 90]`);
    }
  }
  
  if (finalLng < -180 || finalLng > 180) {
    throw new Error(`Longitude ${finalLng} is out of bounds [-180, 180]`);
  }
  
  return [finalLng, finalLat];
}
