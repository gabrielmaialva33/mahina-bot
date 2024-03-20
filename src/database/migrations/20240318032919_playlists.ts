import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('playlists', (table) => {
    table.string('id').primary()

    table.string('user_id').notNullable()
    table.string('name').notNullable()
    table.text('songs').nullable()

    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('playlists')
}
