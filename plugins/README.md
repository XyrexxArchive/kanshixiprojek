# Plugin format

```js
export default {
  command: ['hello', 'hi'],
  owner: false,
  group: false,
  private: false,
  async run(ctx) {
    await ctx.reply('Hello!')
  }
}
```

Plugin dapat memiliki `owner: true`, `group: true`, atau `private: true`.
