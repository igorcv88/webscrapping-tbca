import axios from "axios";
import * as cheerio from "cheerio";
import http from "http";
import * as dotenv from "dotenv";
import knex from "../database/connection";

dotenv.config();

const axiosClient = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

// --- INTERFACES ATUALIZADAS ---

interface NutrientsDB {
  food_code: string;
  component: string;
  unity: string;
  value: number;
}


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getNutrientsAndInsertInDB() {
  const foods = await knex("foods")
    .select("code", "url")
    .whereNotIn("code", knex("nutrients").select("food_code").distinct());

  console.log(`\n🧬 FASE 3 (LEAN): Extraindo apenas o essencial de ${foods.length} alimentos...`);

  for (const food of foods) {
    process.stdout.write(`\r📡 Nutrientes de: ${food.code}... `);
    const TARGET_URL = food.url.startsWith('http') ? food.url : `https://www.tbca.net.br/base-dados/${food.url}`;

    try {
      const { data } = await axiosClient.get(TARGET_URL);
      const $ = cheerio.load(data);
      const nutrientRows = $("#tabela1 tbody tr").toArray();
      const nutrientsToInsert: NutrientsDB[] = [];

      for (const row of nutrientRows) {
        const cells = $(row).find("td").toArray();

        if (cells.length >= 3) { // Reduzido: Só precisamos das 3 primeiras colunas
          const component = $(cells[0]).text().trim();
          const unity = $(cells[1]).text().trim();

          const parseNum = (val: string) => {
            const clean = val.trim().replace(',', '.');
            if (clean === 'tr' || clean === '-' || clean === '') return 0;
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? 0 : parsed;
          };

          // 2. O PUSH LIMPO: Sem referências ou desvios
          nutrientsToInsert.push({
            food_code: food.code,
            component: component,
            unity: unity,
            value: parseNum($(cells[2]).text()),
          });
        }
      }

      if (nutrientsToInsert.length > 0) {
        await knex.transaction(async (trx) => {
          await trx("nutrients").insert(nutrientsToInsert);
        });
      }
    } catch (error: any) {
      console.log(`\n❌ Erro no código ${food.code}: ${error.message}`);
    }
    await delay(500);
  }
}

async function setupNutrientsTable() {
  // ATENÇÃO: Se quiser mudar a estrutura agora, você precisará dar um DROP TABLE manual no TablePlus antes!
  const hasTable = await knex.schema.hasTable('nutrients');
  if (!hasTable) {
    console.log("🛠️ Criando tabela 'nutrients' (Versão Lean)...");
    await knex.schema.createTable('nutrients', (table) => {
      table.increments('id').primary();
      table.string('food_code').notNullable();
      table.string('component');
      table.string('unity');
      table.float('value');

      table.index(['food_code']);
      table.index(['component']);
    });
    console.log('✅ Tabela limpa e indexada!');
  }
}

// --- FLUXO DE EXECUÇÃO ---

async function runScraper() {
  console.log("🚀 INICIANDO SISTEMA GYMPAL");

  // 1. Garante que a tabela de nutrientes existe
  await setupNutrientsTable();

  // 2. Se a Fase 2 (Medidas) ainda estiver rodando, você pode deixar o comando dela aqui
  // await getMeasuresAndInsertInDB();

  // 3. Inicia a Fase 3
  await getNutrientsAndInsertInDB();

  console.log("\n🏆 PROCESSO CONCLUÍDO! Banco de dados populado.");
  process.exit(0);
}

runScraper();
