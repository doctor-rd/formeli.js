import * as formeli from './formeli.js';

const expr = process.argv[2];
const tree = formeli.parse(expr);
console.log(formeli.ev(tree));
