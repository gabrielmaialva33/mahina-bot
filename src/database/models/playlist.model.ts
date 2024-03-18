import { Model } from 'objection'

export class Playlist extends Model {
  static tableName = 'playlists'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  id: number
  user_id: string
  name: string
  songs: string
  created_at: string
  updated_at: string
}
