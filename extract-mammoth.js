import mammoth from 'mammoth';
import fs from 'fs';

mammoth.extractRawText({path: "PMart_Backend_PRD.docx"})
    .then(function(result){
        var text = result.value; 
        fs.writeFileSync('prd.txt', text);
        console.log('done extraction');
    })
    .catch(function(err){
        console.log(err);
    });
