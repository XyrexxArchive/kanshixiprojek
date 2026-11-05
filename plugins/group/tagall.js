export default {
  command: ['tagall', 'everyone'],
  group: true,
  async run(ctx) {
    const metadata = await ctx.sock.groupMetadata(ctx.jid)
    const members = metadata.participants || []
    const mentions = members.map(member => member.id)
    const text = members.map((member, index) => `${index + 1}. @${member.id.split('@')[0]}`).join('\n')
    await ctx.sock.sendMessage(ctx.jid, { text: `*TAG ALL*\n\n${text}`, mentions }, { quoted: ctx.message })
  }
}
