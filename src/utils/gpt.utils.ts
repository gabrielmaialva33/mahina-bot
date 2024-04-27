import { ContextArgs } from '#utils/history.utils'

export const GptUtils = {
  build_input: ({ text, username }: ContextArgs) => `${username}(Winx):||${text}||\n`,
}
