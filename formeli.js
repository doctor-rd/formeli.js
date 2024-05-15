const TokenType = {
    None: 0,
    Number: 1,
}

class Token {
    constructor(val, type) {
        this.val = val;
        this.type = type;
    }
}

function* tokenizer(expr) {
    let pos = 0;
    let m = null;
    while (true) {
        if (m != null)
            pos += m[0].length;
        if (pos >= expr.length)
            break;
        let str = expr.substring(pos);
        if ((m = str.match(/^[\d.]+/)) != null) {
            yield new Token(m[0], TokenType.Number);
            continue;
        }
        if ((m = str.match(/^pi/)) != null) {
            yield new Token(m[0], TokenType.Number);
            continue;
        }
        if ((m = str.match(/^[-\+\*\/()]/)) != null) {
            yield new Token(m[0], TokenType.None);
            continue;
        }
        console.log("token error at", pos);
        break;
    }
}
