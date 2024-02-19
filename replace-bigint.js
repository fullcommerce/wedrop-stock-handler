const replaceInFile = require('replace-in-file')

async function replaceBigInt() {
  try {
    const results = await replaceInFile({
      files: 'prisma/schema.prisma',
      from: /BigInt/g,
      to: 'Int',
    })
    console.log('Substituição realizada:', { results })
  } catch (error) {
    console.error('Erro durante a substituição:', error)
  }
}

replaceBigInt()
