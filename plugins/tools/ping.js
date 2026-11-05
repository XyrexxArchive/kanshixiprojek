export default {
  command: ['p', 'speed'],
  description: 'Alias ping',
  async run(ctx) {
    const start = performance.now()
    await ctx.reply(`Pong! ${(performance.now() - start).toFixed(2)} ms`)
  }
}
