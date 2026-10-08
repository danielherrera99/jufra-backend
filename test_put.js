

fetch('http://localhost:5000/api/campaigns/b1b37ef8-bb79-4698-bb7e-22bdcfbeb1aa', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        "titulo": "grgqfff", 
        "descripcion": "ggg", 
        "fechaHora": "gggooo", 
        "ubicacionTexto": "gg", 
        "latitud": -6.773131, 
        "longitud": -79.847682, 
        "cronograma": [{"hora": "1", "actividad": "2"}], 
        "reglas": ["1", "hola"], 
        "isActive": true 
    })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
