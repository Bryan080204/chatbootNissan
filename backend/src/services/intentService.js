const normalizarTexto = (texto) => {
    if (!texto) {
        return "";
    }

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ");
};

const detectarIntencion = (texto) => {
    const mensaje = normalizarTexto(texto);

    if (!mensaje) {
        return "desconocido";
    }

    /*
     * PREGUNTAS GENERALES
     *
     * Estas reglas tienen prioridad sobre el saludo.
     * Ejemplo:
     * "hola que dia es hoy"
     * no debe convertirse en "saludo".
     */

    if (
        /\b(que dia es hoy|que fecha es hoy|que fecha es|fecha de hoy|que dia estamos)\b/i.test(mensaje)
    ) {
        return "fecha";
    }

    if (
        /\b(que hora es|dime la hora|me dices la hora|hora actual)\b/i.test(mensaje)
    ) {
        return "hora";
    }

    /*
     * TEMAS FUERA DEL ALCANCE DE NISSAN
     */

    if (
        /\b(clima|tiempo|futbol|partido|pelicula|musica|cancion|tarea|escuela|politica|presidente)\b/i.test(mensaje)
    ) {
        return "fuera_alcance";
    }

    /*
     * NISSAN
     */

    if (
        /\b(agencia|agencias|sucursal|sucursales|ubicacion|ubicaciones|direccion|direcciones)\b/i.test(mensaje) ||
        /\b(donde estan|donde se encuentran|donde tienen)\b/i.test(mensaje) ||
        /\b(se encuentran en|estan en|hay una agencia|tienen agencia|tienen sucursal|hay sucursal)\b/i.test(mensaje)
    ) {
        return "ubicacion";
    }

    if (
        /\b(precio|precios|cuanto cuesta|cuanto vale|cuesta|vale|valor)\b/i.test(mensaje)
    ) {
        return "precios";
    }

    if (
        /\b(cotizar|cotizacion|cotiza|cotizo)\b/i.test(mensaje) ||
        /\b(quiero cotizar|quiero una cotizacion)\b/i.test(mensaje)
    ) {
        return "cotizacion";
    }

    if (
        /\b(auto|autos|carro|carros|coche|coches|vehiculo|vehiculos|modelo|modelos)\b/i.test(mensaje) ||
        /\b(versa|sentra|kicks|x-trail|frontier)\b/i.test(mensaje) ||
        /\b(nissan)\b/i.test(mensaje)
    ) {
        return "vehiculos";
    }

    /*
     * SALUDO
     *
     * Se evalúa después de las preguntas y temas Nissan.
     */

    if (
        /^(hola|holaa+|hey|buenas|buenos dias|buenas tardes|buenas noches|que tal|q tal)[!.?]*$/i.test(mensaje)
    ) {
        return "saludo";
    }

    /*
     * Si no encontramos una intención exacta,
     * dejamos que Gemini interprete el lenguaje natural.
     */

    return "desconocido";
};

module.exports = {
    detectarIntencion
};