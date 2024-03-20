import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guilds', (table) => {
    table.string('id').primary()

    table.string('guild_id').notNullable().unique()
    table.string('prefix').notNullable().defaultTo('!')

    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('guilds')
}
