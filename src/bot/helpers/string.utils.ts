export const StringUtils = {
  normalize_username: (first_name: string, last_name?: string) => {
    const username = first_name
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .replace(/(\r\n|\n|\r)/gm, '')
      .trim()
      .concat(
        last_name
          ? ` ${last_name
              .normalize('NFKC')
              .replace(/\s+/g, ' ')
              .replace(/(\r\n|\n|\r)/gm, '')
              .trim()}`
          : ''
      )
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()

    // check if username is empty
    if (username.trim() === '') return 'no_name'

    return username
  },

  text_includes: (text: string, includes: string[]) => {
    return includes.some((include) => text.toLowerCase().includes(include))
  },
}
