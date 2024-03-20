import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stays', (table) => {
    table.string('id').primary()

    table.string('guild_id').notNullable()
    table.string('text_id').nullable()
    table.string('voice_id').nullable()

    //table.foreign('guild_id').references('id').inTable('guilds').onDelete('CASCADE')

    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('stays')
}
