import { Model } from 'objection'

export class Guild extends Model {
  static tableName = 'guilds'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  id: number
  prefix: string
  created_at: string
  updated_at: string

  /**
   * ------------------------------------------------------
   * Relations
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Scopes
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Misc
   * ------------------------------------------------------
   * - jsonSchema is used by objection to validate the data before inserting it into the database (optional)
   * - $formatJson is used by objection to format the data before sending it to the client (optional)
   */
}
