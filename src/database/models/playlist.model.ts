import { ObjectionModel } from '#src/lib/objection'

export class Playlist extends ObjectionModel {
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
