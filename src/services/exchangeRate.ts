export interface BcvRate {
  rate: number
  fetchedAt: string
}

/**
 * Obtiene la tasa oficial BCV (USD -> VES) desde una API pública.
 * https://ve.dolarapi.com/v1/dolares/oficial
 */
export async function fetchBcvRate(): Promise<BcvRate> {
  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`Respuesta inválida del servidor (${response.status})`)
    }

    const data = await response.json()
    const rate = Number(data?.promedio)

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('La tasa recibida no es válida')
    }

    return {
      rate,
      fetchedAt: data?.fechaActualizacion || new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error al obtener la tasa BCV:', error)
    throw error
  }
}
