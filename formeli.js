class Func {
    constructor(name, f) {
        this.name = name;
        this.f = f;
    }
}

const Functions = [
    new Func("sin", Math.sin),
    new Func("cos", Math.cos),
    new Func("tan", Math.tan),
]

const TokenType = {
    None: 0,
    Number: 1,
    Function: 2,
}

class Token {
    constructor(val, type) {
        this.val = val;
        this.type = type;
    }
}

function getFunction(str) {
    for (let i=0; i<Functions.length; i++)
        if (str.startsWith(Functions[i].name))
            return Functions[i];
    return null;
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
        if ((m = getFunction(str)) != null) {
            yield new Token(m.name, TokenType.Function);
            m = [m.name];
            continue;
        }
        if ((m = str.match(/^e/)) != null) {
            yield new Token(m[0], TokenType.Number);
            continue;
        }
        if ((m = str.match(/^[\d.]+/)) != null) {
            yield new Token(m[0], TokenType.Number);
            continue;
        }
        if ((m = str.match(/^pi/)) != null) {
            yield new Token(m[0], TokenType.Number);
            continue;
        }
        if ((m = str.match(/^[-\+\*\/\^()]/)) != null) {
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
            if (n.value.val == "e")
                return Math.E;
            return parseFloat(n.value.val);
        case TokenType.Function:
            console.log("ev Function");
            let f = getFunction(n.value.val).f;
            let sign = 1;
            while (!(n = g.next()).done) {
                switch (n.value.type) {
                    case TokenType.None:
                        switch (n.value.val) {
                            case "/":
                                g.unnext();
                                return f(sign*ev_mul(g));
                            case "(":
                                g.unnext();
                                return f(sign*ev_primary(g));
                            case "-":
                                sign *= -1;
                                break;
                        }
                        break;
                    case TokenType.Number:
                        g.unnext();
                        return f(sign*ev_mul(g));
                    case TokenType.Function:
                        g.unnext();
                        return f(sign*ev_primary(g));
                }
            }
            return f(0);
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

function ev_pow(g, lhs_sign = 1) {
    let lhs = lhs_sign*ev_primary(g);
    let n;
    let expect_rhs = false;
    let sign = 1;
    while (!(n = g.next()).done) {
        switch (n.value.type) {
            case TokenType.None:
                switch (n.value.val) {
                    case "^":
                        expect_rhs = true;
                        break;
                    case "(":
                        if (expect_rhs) {
                            g.unnext();
                            return Math.pow(lhs, ev_pow(g, sign));
                        }
                    case "+":
                        if (expect_rhs) {
                            break;
                        }
                    case "-":
                        if (expect_rhs) {
                            sign *= -1;
                            break;
                        }
                    default:
                        g.unnext();
                        return lhs;
                }
                break;
            case TokenType.Function:
            case TokenType.Number:
                g.unnext();
                if (expect_rhs) {
                    return Math.pow(lhs, ev_pow(g, sign));
                }
                return lhs;
        }
    }
    return lhs;
}

function ev_mul(g) {
    let result = 1;
    let inverse = false;
    let n;
    let expect_rhs = false;
    let sign = 1;
    while (!(n = g.next()).done) {
        switch (n.value.type) {
            case TokenType.None:
                switch (n.value.val) {
                    case "*":
                        expect_rhs = true;
                        break;
                    case "/":
                        expect_rhs = true;
                        inverse = !inverse;
                        break;
                    case "(":
                        g.unnext();
                        if (inverse)
                            result /= ev_pow(g);
                        else
                            result *= ev_pow(g);
                        expect_rhs = false;
                        inverse = false;
                        break;
                    case "+":
                        if (expect_rhs) {
                            break;
                        }
                    case "-":
                        if (expect_rhs) {
                            sign *= -1;
                            break;
                        }
                    case ")":
                        g.unnext();
                        return sign*result;
                    default:
                        console.log("parse error at", n.value.val);
                }
                break;
            case TokenType.Function:
            case TokenType.Number:
                g.unnext();
                if (inverse)
                    result /= ev_pow(g);
                else
                    result *= ev_pow(g);
                expect_rhs = false;
                inverse = false;
                break;
        }
    }
    return sign*result;
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
                    default:
                        console.log("parse error at", n.value.val);
                }
                break;
            case TokenType.Function:
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
