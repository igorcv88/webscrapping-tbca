import axios from "axios";
import * as cheerio from "cheerio";
import http from "http";
import fs from "fs"; // Importante: Adicionamos o File System do Node

const axiosClient = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

async function fazerBiopsia() {
    const url = "https://www.tbca.net.br/base-dados/int_composicao_alimentos.php?n0REd3kv7e86D%2BViXWYUnQ%3D%3D=bwmwsUF0RUDA6D7pFgSrfA%3D%3D";

    try {
        console.log("📡 Baixando a página crua...");
        const { data } = await axiosClient.get(url);

        // Salva o que o Axios viu em um arquivo HTML real no seu PC
        fs.writeFileSync("biopsia.html", data);

        console.log("✅ Arquivo biopsia.html salvo na sua pasta!");

    } catch (e: any) {
        console.log("❌ Erro:", e.message);
    }
}

fazerBiopsia();
