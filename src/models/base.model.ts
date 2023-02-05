import { Model, ModelOptions, QueryContext } from 'objection'

export class BaseModel extends Model {
  public static idColumn = 'id'
  public static useLimitInFirst = true

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  public readonly id!: number
  public is_deleted!: boolean
  public readonly created_at!: string
  public updated_at!: string
  public deleted_at?: string

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */
  public async $beforeInsert(query: QueryContext) {
    super.$beforeInsert(query)
  }

  public async $beforeUpdate(opt: ModelOptions, query: QueryContext) {
    super.$beforeUpdate(opt, query)
  }
}
