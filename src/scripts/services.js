const headers = {
    'content-type': 'application/json',
    'credentials':'include',
}

export async function load(arq){
    try {
        const res = await fetch(`/content/${arq}.html`, {
            headers,
            method: 'GET'
        })
        if (res.ok){
            console.log(res.text())
            return res.text();
        } else {
            throw new Error("Alguma coisa deu errado")
        }
    } catch(err) {
        throw new Error(`Vish deu merda aqui: ${err}`)
    }
}

const Services = {
    load
}


export default Services;