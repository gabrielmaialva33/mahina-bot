import type { Knex } from 'knex'

//         db.prepare(
//             'CREATE TABLE IF NOT EXISTS premium (userId TEXT PRIMARY KEY, guildId TEXT)'
//         ).run();

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('premiums', (table) => {
    table.string('id').primary()

    table.string('user_id').notNullable()
    table.string('guild_id').notNullable()

    //table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
    table.foreign('guild_id').references('id').inTable('guilds').onDelete('CASCADE')

    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('premiums')
}
