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

function ev_primary(g) {
    let n = g.next();
    switch (n.value.type) {
        case TokenType.Number:
            if (n.value.val == "pi")
                return Math.PI;
            return parseFloat(n.value.val);
        case TokenType.None:
            if (n.value.val == "(") {
                let result = ev_add(g);
                n = g.next();
                if (n.value.val != ")")
                    console.log(") expected");
                return result;
            }
            break;
        default:
            console.log("parse error at", n.value.val);
    }
}

function ev_mul(g) {
    let result = 1;
    let inverse = false;
    let n;
    while (!(n = g.next()).done) {
        switch (n.value.type) {
            case TokenType.None:
                switch (n.value.val) {
                    case "*":
                        break;
                    case "/":
                        inverse = !inverse;
                        break;
                    case "(":
                        g.unnext();
                        if (inverse)
                            result /= ev_primary(g);
                        else
                            result *= ev_primary(g);
                        inverse = false;
                        break;
                    case "+":
                    case "-":
                    case ")":
                        g.unnext();
                        return result;
                        break;
                    default:
                        console.log("parse error at", n.value.val);
                }
                break;
            case TokenType.Number:
                g.unnext();
                if (inverse)
                    result /= ev_primary(g);
                else
                    result *= ev_primary(g);
                inverse = false;
                break;
        }
    }
    return result;
}

function ev_add(g) {
    let result = 0;
    let sign = 1;
    let n;
    while (!(n = g.next()).done) {
        switch (n.value.type) {
            case TokenType.None:
                switch (n.value.val) {
                    case "+":
                        break;
                    case "-":
                        sign *= -1;
                        break;
                    case "/":
                    case "(":
                        g.unnext();
                        result += sign*ev_mul(g);
                        sign = 1;
                        break;
                    case ")":
                        g.unnext();
                        return result;
                        break;
                    default:
                        console.log("parse error at", n.value.val);
                }
                break;
            case TokenType.Number:
                g.unnext();
                result += sign*ev_mul(g);
                sign = 1;
                break;
        }
    }
    return result;
}

function ev(expr) {
    let g = tokenizer(expr);
    g.nextorig = g.next;
    g.repeat = 0;
    g.next = function() {
        if (g.repeat>0) {
            g.repeat--;
            return g.fetched;
        }
        g.fetched = g.nextorig();
        return g.fetched;
    }
    g.unnext = function() {
        g.repeat = 1;
    }
    return ev_add(g);
}
