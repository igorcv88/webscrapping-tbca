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
  // Busca alimentos que ainda NÃO estão na tabela de nutrientes (Smart Resume)
  const foods = await knex("foods")
    .select("code", "url")
    .whereNotIn("code", knex("nutrients").select("food_code").distinct());

  console.log(`\n🧬 FASE 3: Extraindo nutrientes de ${foods.length} alimentos...`);

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

        if (cells.length >= 9) { // A tabela TBCA completa tem 9 colunas
          const component = $(cells[0]).text().trim();
          const unity = $(cells[1]).text().trim();

          // Helper para limpar e converter números
          const parseNum = (val: string) => {
            const clean = val.trim().replace(',', '.');
            return (clean === 'tr' || clean === '-' || clean === '') ? 0 : parseFloat(clean);
          };

          nutrientsToInsert.push({
            food_code: food.code,
            component: component,
            unity: unity,
            value: parseNum($(cells[2]).text()),
            standard_deviation: $(cells[3]).text().trim(),
            min_value: parseNum($(cells[4]).text()),
            max_value: parseNum($(cells[5]).text()),
            number_of_data: parseInt($(cells[6]).text().trim()) || 0,
            references: $(cells[7]).text().trim(),
            type_of_data: $(cells[8]).text().trim()
          });
        }
      }

      if (nutrientsToInsert.length > 0) {
        // JEITO NINJA: Uma única transação por alimento (muito mais rápido)
        await knex.transaction(async (trx) => {
          await trx("nutrients").insert(nutrientsToInsert);
        });
      }

    } catch (error: any) {
      console.log(`\n❌ Erro ao extrair nutrientes do código ${food.code}: ${error.message}`);
    }

    // Delay de segurança para respeitar o servidor
    await delay(500);
  }
}

async function setupNutrientsTable() {
  const hasTable = await knex.schema.hasTable('nutrients');
  if (!hasTable) {
    console.log("🛠️ Criando tabela 'nutrients'...");
    await knex.schema.createTable('nutrients', (table) => {
      table.increments('id').primary();
      table.string('food_code').notNullable();
      table.string('component');
      table.string('unity');
      table.float('value');
      table.string('standard_deviation');
      table.float('min_value');
      table.float('max_value');
      table.integer('number_of_data');
      table.text('references');
      table.string('type_of_data');

      // Índices para performance monstra no Mobile
      table.index(['food_code']);
      table.index(['component']);
    });
    console.log('✅ Tabela "nutrients" pronta para o combate!');
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
