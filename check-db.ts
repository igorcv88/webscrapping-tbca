import knex from "./database/connection";

async function check() {
    try {
        const totalFoods = await knex("foods").count("id as count");
        const totalMeasures = await knex("measures").count("id as count");

        console.log(`📊 Total de alimentos: ${totalFoods[0].count}`);
        console.log(`⚖️ Total de medidas caseiras: ${totalMeasures[0].count}`);

        console.log("\n📋 Amostra de um alimento com suas porções (Relacional):");

        // Pega o primeiro alimento que tenha medidas cadastradas
        const sampleMeasure = await knex("measures").first();

        if (sampleMeasure) {
            const food = await knex("foods").where({ code: sampleMeasure.food_code }).first();
            const measuresForFood = await knex("measures").where({ food_code: food.code });

            console.log(`\n🍎 Alimento: ${food.name} (${food.code})`);
            console.table(measuresForFood.map(m => ({
                "Medida": m.description,
                "Peso (g)": m.weight_g
            })));
        }
    } catch (error: any) {
        console.error("❌ Erro:", error.message);
    } finally {
        await knex.destroy();
    }
}

check();
