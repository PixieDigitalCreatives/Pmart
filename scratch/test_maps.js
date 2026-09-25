async function check() {
  const res = await fetch('https://www.google.com/maps/place/P+mart+sasaram/@24.9588592,84.0129968,17z/data=!3m1!4b1!4m6!3m5!1s0x398db7371ea48525:0x9c9c7b3a5cb46215!8m2!3d24.9588592!4d84.0155717');
  const text = await res.text();
  
  const re = /"([^"]{5,100}sasaram[^"]{0,100})"/gi;
  let match;
  const found = new Set();
  while ((match = re.exec(text)) !== null) {
    found.add(match[1]);
  }
  console.log('Sasaram strings (case-insensitive):', [...found]);
}
check();
