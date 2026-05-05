import knex from "knex";
import configuration from "../knexfile"; // Ajuste o caminho se o seu knexfile não estiver 2 níveis acima

// Se o NODE_ENV não existir, força ele a usar o 'development' (que é o que tem no seu knexfile)
const env = process.env.NODE_ENV || "development";

// Agora sim, ele pega exatamente o bloco 'development' que tem o client mysql2
const config = configuration[env];

const connection = knex(config);

export default connection;
