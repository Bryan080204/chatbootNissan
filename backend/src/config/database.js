
"use strict";

const sql = require("mssql");

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    connectionTimeout: 15000,
    requestTimeout: 15000
};

let poolPromise;

async function obtenerConexion() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .catch((error) => {
                poolPromise = null;
                throw error;
            });
    }

    return poolPromise;
}

module.exports = {
    sql,
    obtenerConexion
};
