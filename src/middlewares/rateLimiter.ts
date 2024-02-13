import { NextFunction, Request, Response } from 'express'

const queue = []
let isProcessing = false
let processedRequests = 0 // Adiciona um contador para controlar o número de requests processadas

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const processRequest = () => {
    if (isProcessing) return
    const nextRequest = queue.shift()
    if (!nextRequest) return

    isProcessing = true
    nextRequest()

    // Incrementa o contador de requests processadas
    processedRequests++

    // Agora, verifica se processou 3 requests para então aguardar 1 segundo
    if (processedRequests % 3 === 0) {
      setTimeout(() => {
        isProcessing = false
        processRequest() // Chama processRequest para continuar processando a fila
      }, 1000)
    } else {
      isProcessing = false
      processRequest() // Se não atingiu 3 requests, continua processando sem esperar
    }
  }

  queue.push(() => next())
  processRequest()
}
