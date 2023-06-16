function sum(var1, var2) {
    return var1 + var2;
}

function info(name) {
    const age = sum(10, 18);
    const profession = 'profession'
    const message = `Hello, ${name}. You are ${age} years old and your profession is ${profession}!`
    console.log(message)
}
info('Erick Wendel')