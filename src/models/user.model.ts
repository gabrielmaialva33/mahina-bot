import { DateTime } from 'luxon'

import { BaseModel } from '@/models/base.model'

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  OWNER = 'OWNER',
}

export class UserModel extends BaseModel {
  public static tableName = 'users'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  public user_id!: number
  public first_name!: string
  public last_name?: string
  public username?: string
  public language_code?: string
  public is_bot!: boolean
  public role?: Role

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */
  public async $beforeUpdate() {
    this.updated_at = DateTime.local({ zone: 'utc' }).toSQL({ includeOffset: false })
  }

  /**
   * ------------------------------------------------------
   * Scopes
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Methods
   * ------------------------------------------------------
   */
  public static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'first_name', 'is_bot'],

      properties: {
        user_id: { type: 'integer' },
        first_name: { type: 'string' },
        last_name: { type: ['string', 'null'] },
        username: { type: ['string', 'null'] },
        language_code: { type: ['string', 'null'] },
        is_bot: { type: 'boolean' },
      },
    }
  }

  public static get jsonAttributes() {
    return ['first_name', 'last_name', 'username', 'language_code', 'is_bot']
  }
}
