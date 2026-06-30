const fs = require('fs');
const data = JSON.parse(fs.readFileSync('Z:\\Autocad Config\\LISP\\web\\public\\api\\svg-catalog.json', 'utf8'));
let cats = new Set();
data.forEach(item => {
    if(item.categories) item.categories.forEach(c => cats.add(c));
});
console.log(Array.from(cats).sort());
