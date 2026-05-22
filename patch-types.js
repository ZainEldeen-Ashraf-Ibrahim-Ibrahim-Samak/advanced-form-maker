const fs = require('fs');
const filepath = 'D:\\SCCT\\src\\domain\\use-cases\\client\\submit-form.ts';
let content = fs.readFileSync(filepath, 'utf8');
content = content.replace(/mediaUrl\?\: string \| null;/g, 'mediaUrl?: string;');
content = content.replace(/mediaPublicId\?\: string \| null;/g, 'mediaPublicId?: string;');
fs.writeFileSync(filepath, content);
console.log('Fixed interface types');