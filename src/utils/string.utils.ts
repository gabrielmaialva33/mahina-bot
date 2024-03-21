export const StringUtils = {
  NormalizeUsername: (first_name: string, last_name?: string) => {
    const username = first_name
      .normalize('NFKC')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/(\r\n|\n|\r)/gm, '')
      .trim()
      .concat(
        last_name
          ? ` ${last_name
              .normalize('NFKC')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, ' ')
              .replace(/(\r\n|\n|\r)/gm, '')
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .trim()}`
          : ''
      )
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .trim()
      .slice(0, 20)
      .toLowerCase()

    // check if username is empty
    if (username === ' ') return 'no_username'
    if (username.trim() === '') return 'no_username'

    return username
  },

  NormalizeName: (first_name: string, last_name?: string) => {
    const name = first_name
      .normalize('NFKC')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/(\r\n|\n|\r)/gm, '')
      .trim()
      .concat(
        last_name
          ? ` ${last_name
              .normalize('NFKC')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, ' ')
              .replace(/(\r\n|\n|\r)/gm, '')
              .trim()}`
          : ''
      )
      .slice(0, 20)
      .trim()

    // check if username is empty
    if (name === ' ') return 'no_name'
    if (name.trim() === '') return 'no_name'

    // capitalize first letter
    //return name.charAt(0).toUpperCase() + name.slice(1)
    return name
  },

  NormalizeText: (text: string) => {
    const source = text
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .replace(/(\r\n|\n|\r)/gm, '')
      .trim()

    return source.slice(0, 500)
  },

  TextInclude: (text: string, includes: string[]) => {
    return includes.some((include) => text.toLowerCase().includes(include))
  },

  RemoveBreakLines: (text: string) => text.replace(/(\r\n|\n|\r)/gm, ''),

  RemoveIncludes: (text: string, includes: string[]) =>
    includes.reduce((acc, include) => acc.replace(include, '').trim(), text),

  CountTokens: (text: string) => text.length / 2,

  CountWords: (text: string) => text.split(/\s+/).length,

  CountLines: (text: string) => text.split(/\r\n|\r|\n/).length,

  CountCharacters: (text: string) => text.length,

  InfoText: (text: string) => ({
    tokens: StringUtils.CountTokens(text),
    words: StringUtils.CountWords(text),
    lines: StringUtils.CountLines(text),
    characters: StringUtils.CountCharacters(text),
  }),

  FormatQuery: (str: string) => {
    if (str === undefined) return ''

    const regex = /(\r\n|\n|\r)/gm
    return str.replace(regex, ' ').replace(/\s+/g, ' ')
  },

  FormatBindings: (bindings: any[]) => {
    if (bindings === undefined) return '[]'

    const regex = /(\r\n|\n|\r)/gm
    const str = bindings
      .map((item) => {
        if (typeof item === 'string') return item.replace(regex, ' ').replace(/\s+/g, ' ')
        return item
      })
      .join(', ')
    return `[${str}]`
  },

  IsNotEmpty: (str: string) => {
    if (str === undefined) return false
    if (str === null) return false
    if (str === 'undefined') return false
    if (str === 'null') return false
    if (str === '') return false
    return str.trim() !== ''
  },

  Slugify: (name: string) => {
    if (!name) return 'no_username'

    const username = name
      .normalize('NFKC')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/(\r\n|\n|\r)/gm, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 20)
      .toLowerCase()
      .trim()

    if (username === '') return 'no_username'
    return username
  },
}
