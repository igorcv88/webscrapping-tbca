import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("measures", (table: Knex.TableBuilder) => {
        table.increments("id").notNullable();
        table.string("food_code").notNullable();
        table.string("description").notNullable();
        table.float("weight_g").notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable("measures");
}