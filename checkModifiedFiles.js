const { exec } = require('child_process')

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout.trim())
    })
  })
}

async function updateAndBuild() {
  try {
    // Verifica se há atualizações no repositório remoto
    const remoteChanges = await runCommand(
      'git fetch && git log HEAD..origin/main --online',
    )

    if (remoteChanges) {
      console.log('Há atualizações no repositório remoto. Atualizando...')

      // Descarta quaisquer mudanças locais
      await runCommand('git reset --hard')

      // Faz o pull das atualizações
      await runCommand('git pull')

      // Instala as dependências do projeto
      console.log('Instalando dependências...')
      await runCommand('npm install')

      // Faz a build do projeto
      console.log('Fazendo a build do projeto...')
      await runCommand('npm run build')

      console.log('Atualização e build concluídas com sucesso.')
    } else {
      console.log('Nenhuma atualização disponível no repositório remoto.')
    }
  } catch (error) {
    console.error('Erro ao atualizar e buildar o projeto:', error)
  }
}

updateAndBuild()
