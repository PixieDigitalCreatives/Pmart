const fs = require('fs');
const AdmZip = require('adm-zip');

try {
  const zip = new AdmZip('PMart_Backend_PRD.docx');
  const xml = zip.readAsText('word/document.xml');
  // very naive xml to text
  const text = xml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '');
  fs.writeFileSync('prd.txt', text);
  console.log('Done!');
} catch (e) {
  console.log(e);
}
