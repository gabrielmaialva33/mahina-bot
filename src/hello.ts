const world = 'world'

export function hello(who: string = world) {
  return console.log(`Hello ${who}!`)
}
