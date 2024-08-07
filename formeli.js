class Func {
    constructor(name, f) {
        this.name = name;
        this.f = f;
    }
}

const Functions = [
    new Func("sqrt", Math.sqrt),
    new Func("sin", Math.sin),
    new Func("cos", Math.cos),
    new Func("tan", Math.tan),
    new Func("exp", Math.exp),
    new Func("ln", Math.log),
    new Func("abs", Math.abs),
    new Func("min", Math.min),
    new Func("max", Math.max),
];

const TokenType = {
    None: 0,
    Number: 1,
    Function: 2,
    Variable: 3,
};

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
        if ((m = str.match(/^\s/)) != null) {
            continue;
        }
        if ((m = getFunction(str)) != null) {
            yield new Token(m.name, TokenType.Function);
            m = [m.name];
            continue;
        }
        if ((m = str.match(/^[xyzt]/)) != null) {
            yield new Token(m[0], TokenType.Variable);
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
        if ((m = str.match(/^[-\+\*\/\^(),]/)) != null) {
            yield new Token(m[0], TokenType.None);
            continue;
        }
        console.log("token error at", pos);
        break;
    }
}

function simplify(x) {
    switch (x.type) {
        case "add":
            if (x.adds.length == 0)
                return {"type": "num", "value": 0};
            if (x.adds.length == 1)
                return x.adds[0];
            break;
        case "mul":
            if (x.muls.length == 0)
                return {"type": "num", "value": 1};
            if (x.muls.length == 1)
                return x.muls[0];
            break;
    }
    return x;
}

function multiply(a, sign) {
    if (sign>0)
        return a;
    let muls = [a];
    if (a.type == "mul")
        muls = Array.from(a.muls);
    muls.push({"type": "num", "value": -1});
    return {"type": "mul", "muls": muls};
}

function parse_primary(g) {
    let n = g.next();
    switch (n.value.type) {
        case TokenType.Variable:
            return {"type": "var", "name": n.value.val};
        case TokenType.Number:
            return {"type": "num", "value": n.value.val};
        case TokenType.Function:
            let fname = n.value.val;
            let sign = 1;
            while (!(n = g.next()).done) {
                switch (n.value.type) {
                    case TokenType.None:
                        switch (n.value.val) {
                            case "/":
                                g.unnext();
                                return {"type": "fct", "name": fname, "par": multiply(parse_mul(g), sign)};
                            case "(":
                                g.unnext();
                                return {"type": "fct", "name": fname, "par": multiply(parse_primary(g), sign)};
                            case "-":
                                sign *= -1;
                                break;
                        }
                        break;
                    case TokenType.Variable:
                    case TokenType.Number:
                        g.unnext();
                        return {"type": "fct", "name": fname, "par": multiply(parse_mul(g), sign)};
                    case TokenType.Function:
                        g.unnext();
                        return {"type": "fct", "name": fname, "par": multiply(parse_primary(g), sign)};
                }
            }
            return {"type": "fct", "name": fname, "par": {"type": "num", "value": 0}};
        case TokenType.None:
            if (n.value.val == "(") {
                let result = parse_tuple(g);
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

function parse_pow(g, lhs_sign = 1) {
    let result = function() {
        if (lhs.type == "num" && lhs.value == "e")
            return {"type": "fct", "name": "exp", "par": parse_pow(g, sign)};
        return {"type": "pow", "lhs": lhs, "rhs": parse_pow(g, sign)};
    }
    let lhs = multiply(parse_primary(g), lhs_sign);
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
                            return result();
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
            case TokenType.Variable:
            case TokenType.Function:
            case TokenType.Number:
                g.unnext();
                if (expect_rhs) {
                    return result();
                }
                return lhs;
        }
    }
    return lhs;
}

function parse_mul(g) {
    let result = function() {
        let lhs = multiply(mul, sign);
        if (div.muls.length == 0)
            return simplify(lhs);
        else
            return {"type": "div", "lhs": simplify(lhs), "rhs": simplify(div)};
    }
    let mul = {"type": "mul", "muls":[]};
    let div = {"type": "mul", "muls":[]};
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
                            div.muls.push(parse_pow(g));
                        else
                            mul.muls.push(parse_pow(g));
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
                    case ",":
                    case ")":
                        g.unnext();
                        return result();
                    default:
                        console.log("parse error at", n.value.val);
                }
                break;
            case TokenType.Variable:
            case TokenType.Function:
            case TokenType.Number:
                g.unnext();
                if (inverse)
                    div.muls.push(parse_pow(g));
                else
                    mul.muls.push(parse_pow(g));
                expect_rhs = false;
                inverse = false;
                break;
        }
    }
    return result();
}

function parse_add(g) {
    let result = function() {
        if (sub.adds.length == 0)
            return simplify(add);
        else
            return {"type": "sub", "lhs": simplify(add), "rhs": simplify(sub)};
    }
    let add = {"type": "add", "adds":[]};
    let sub = {"type": "add", "adds":[]};
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
                        if (sign>0)
                            add.adds.push(parse_mul(g));
                        else
                            sub.adds.push(parse_mul(g));
                        sign = 1;
                        break;
                    case ",":
                    case ")":
                        g.unnext();
                        return result();
                    default:
                        console.log("parse error at", n.value.val);
                }
                break;
            case TokenType.Variable:
            case TokenType.Function:
            case TokenType.Number:
                g.unnext();
                if (sign>0)
                    add.adds.push(parse_mul(g));
                else
                    sub.adds.push(parse_mul(g));
                sign = 1;
                break;
        }
    }
    return result();
}

function parse_tuple(g) {
    let result = function() {
        if (comps.length==0)
            return {"type": "num", "value": 0};
        if (comps.length==1)
            return comps[0];
        return {"type": "tuple", "comps": comps};
    }
    let comps = [];
    let n;
    while (!(n = g.next()).done) {
        switch (n.value.type) {
            case TokenType.None:
                switch (n.value.val) {
                    case ",":
                        break;
                    case ")":
                        g.unnext();
                        return result();
                    default:
                        g.unnext();
                        comps.push(parse_add(g));
                }
                break;
            case TokenType.Variable:
            case TokenType.Function:
            case TokenType.Number:
                g.unnext();
                comps.push(parse_add(g));
                break;
        }
    }
    return result();
}

function parse(expr) {
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
    return parse_tuple(g);
}

function ev(tree) {
    let result;
    switch (tree.type) {
        case "add":
            result = 0;
            for (let i=0; i<tree.adds.length; i++)
                result += ev(tree.adds[i]);
            break;
        case "sub":
            return ev(tree.lhs) - ev(tree.rhs);
        case "mul":
            result = 1;
            for (let i=0; i<tree.muls.length; i++)
                result *= ev(tree.muls[i]);
            break;
        case "div":
            return ev(tree.lhs) / ev(tree.rhs);
        case "pow":
            return Math.pow(ev(tree.lhs), ev(tree.rhs));
        case "fct":
            const f = getFunction(tree.name).f;
            if (tree.par.type=="tuple")
                return f(...tree.par.comps.map((c) => ev(c)));
            return f(ev(tree.par));
        case "var":
            return 0;
        case "num":
            if (tree.value == "pi")
                return Math.PI;
            if (tree.value == "e")
                return Math.E;
            return parseFloat(tree.value);
    }
    return result;
}

function js(tree) {
    let result;
    switch (tree.type) {
        case "add":
            result = "0";
            for (let i=0; i<tree.adds.length; i++) {
                if (result == "0")
                    result = "(";
                else
                    result += "+";
                result += js(tree.adds[i]);
            }
            if (result != "0")
                result += ")";
            break;
        case "sub":
            return "(" + js(tree.lhs) + "-" + js(tree.rhs) + ")";
        case "mul":
            result = "1";
            for (let i=0; i<tree.muls.length; i++) {
                if (result == "1")
                    result = "(";
                else
                    result += "*";
                result += js(tree.muls[i]);
            }
            if (result != "1")
                result += ")";
            break;
        case "div":
            return "(" + js(tree.lhs) + "/" + js(tree.rhs) + ")";
        case "pow":
            return "Math.pow(" + js(tree.lhs) + "," + js(tree.rhs) + ")";
        case "fct":
            let fname = tree.name;
            switch (fname) {
                case "ln":
                    fname = "log";
                    break;
            }
            if (tree.par.type=="tuple") {
                result = "";
                for (let i=0; i<tree.par.comps.length; i++) {
                    if (result == "")
                        result = "Math." + fname + "(";
                    else
                        result += ",";
                    result += js(tree.par.comps[i]);
                }
                result += ")";
                return result;
            }
            return "Math." + fname + "(" + js(tree.par) + ")";
        case "var":
            return "par." + tree.name;
        case "num":
            result = "" + tree.value;
            if (tree.value == "pi")
                return "Math.PI";
            if (tree.value == "e")
                return "Math.E";
            if (result.startsWith("-"))
                return "(" + result + ")";
            break;
    }
    return result;
}

function func(tree) {
    return new Function("par", "return " + js(tree) + ";");
}

export {parse, ev, func};
