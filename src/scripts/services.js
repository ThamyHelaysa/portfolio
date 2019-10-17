const headers = {
    'content-type': 'application/json',
    'credentials':'include',
    'x-requested-with':'XMLHttpRequest',
}

export async function load(arq){
    try {
        const res = await fetch(`/content/${arq}.html`, {
            headers,
            method: 'GET'
        })
        if (res.ok){
            console.log(res.json())
            return res.json();
        }
    } catch(err) {
        throw new Error(`Vish deu merda aqui: ${err}`)
    }
}

const Services = {
    load
}


export default Services;