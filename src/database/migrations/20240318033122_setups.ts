import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('setups', (table) => {
    table.string('id').primary()

    table.string('guild_id').notNullable()
    //table.foreign('guild_id').references('id').inTable('guilds').onDelete('CASCADE')

    table.string('text_id').nullable()
    table.string('message_id').nullable()

    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('setups')
}
