function mml_open(p) {
    if (!p) return "";
    return "<mrow><mo>(</mo>";
}

function mml_close(p) {
    if (!p) return "";
    return "<mo>)</mo></mrow>";
}

function mathml(tree, p=0) {
    let result;
    switch (tree.type) {
        case "add":
            result = "0";
            for (let i=0; i<tree.adds.length; i++) {
                if (result == "0")
                    result = mml_open(p>0);
                else
                    result += "<mo>+</mo>";
                result += mathml(tree.adds[i]);
            }
            if (result != "0")
                result += mml_close(p>0);
            break;
        case "sub":
            return mml_open(p>0) + mathml(tree.lhs) + "<mo>-</mo>" + mathml(tree.rhs, 1) + mml_close(p>0);
        case "mul":
            result = "1";
            for (let i=0; i<tree.muls.length; i++) {
                if (result == "1")
                    result = mml_open(p>1);
                else
                    result += "<mo>&middot;</mo>";
                result += mathml(tree.muls[i], 1);
            }
            if (result != "1")
                result += mml_close(p>1);
            break;
        case "div":
            return "<mfrac><mrow>" + mathml(tree.lhs) + "</mrow><mrow>" + mathml(tree.rhs) + "</mrow></mfrac>";
        case "pow":
            return "<msup><mrow>" + mathml(tree.lhs, 2) + "</mrow><mrow>" + mathml(tree.rhs) + "</mrow></msup>";
        case "fct":
            let fname = tree.name;
            switch (fname) {
                case "sqrt":
                    return "<msqrt><mrow>" + mathml(tree.par) + "</mrow></msqrt>";
            }
            return "<mi>" + fname + "</mi>" + mathml(tree.par, 2);
        case "var":
            return "<mi>" + tree.name + "</mi>";
        case "num":
            if (tree.value == "pi")
                return "<mn>&pi;</mn>";
            result = "<mn>" + tree.value + "</mn>";
            if (p>0 && tree.value<0)
                result = "<mo>(</mo>" + result + "<mo>)</mo>";
    }
    return result;
}

export {mathml};