// LocalStorage service for data persistence
export interface User {
  id: string
  walletAddress: string
  walletId: string
  subOrgId: string
  createdAt: string
}

export interface StoredPosition {
  id: string
  user_id: string
  symbol: string
  side: "long" | "short"
  entry_price: number
  size: number
  leverage: number
  collateral: number
  liquidation_price: number
  status: "open" | "closed" | "liquidated"
  realized_pnl: number
  opened_at: string
  closed_at?: string
  blockchain_tx_id?: string
}

export interface Transaction {
  id: string
  userId: string
  positionId?: string
  type: "deposit" | "withdrawal" | "open_position" | "close_position" | "liquidation"
  amount: number
  asset: string
  txId: string
  status: "pending" | "confirmed" | "failed"
  createdAt: string
}

const STORAGE_KEYS = {
  USER: "sep-dex-user",
  POSITIONS: "sep-dex-positions",
  TRANSACTIONS: "sep-dex-transactions",
  PRICE_CACHE: "sep-dex-price-cache",
}

// User operations
export const saveUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
}

export const getUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.USER)
  return data ? JSON.parse(data) : null
}

export const clearUser = (): void => {
  // Clear all user-related data
  localStorage.removeItem(STORAGE_KEYS.USER)
  localStorage.removeItem(STORAGE_KEYS.POSITIONS)
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS)
  // Clear wallet-specific data
  localStorage.removeItem('local-wallet-private-key')
  localStorage.removeItem('local-wallet-public-key')
  localStorage.removeItem('local-wallet-address')
  localStorage.removeItem('local-wallet-username')
  localStorage.removeItem('turnkey-wallet-private-key')
}

// Position operations
export const savePosition = (position: StoredPosition): void => {
  const positions = getPositions()
  const existingIndex = positions.findIndex((p) => p.id === position.id)

  if (existingIndex >= 0) {
    positions[existingIndex] = position
  } else {
    positions.push(position)
  }

  localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions))
}

export const getPositions = (): StoredPosition[] => {
  const data = localStorage.getItem(STORAGE_KEYS.POSITIONS)
  return data ? JSON.parse(data) : []
}

export const getUserPositions = (userId: string): StoredPosition[] => {
  return getPositions().filter((p) => p.user_id === userId)
}

export const getPosition = (positionId: string): StoredPosition | null => {
  const positions = getPositions()
  return positions.find((p) => p.id === positionId) || null
}

export const updatePosition = (position: StoredPosition): void => {
  const positions = getPositions()
  const index = positions.findIndex((p) => p.id === position.id)

  if (index >= 0) {
    positions[index] = position
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions))
  }
}

export const deletePosition = (positionId: string): void => {
  const positions = getPositions().filter((p) => p.id !== positionId)
  localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions))
}

// Transaction operations
export const saveTransaction = (transaction: Transaction): void => {
  const transactions = getTransactions()
  transactions.push(transaction)
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions))
}

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
  return data ? JSON.parse(data) : []
}

export const getUserTransactions = (userId: string): Transaction[] => {
  return getTransactions().filter((t) => t.userId === userId)
}

// Price cache operations
export const savePriceCache = (asset: string, price: number): void => {
  const cache = getPriceCache()
  cache[asset] = {
    price,
    timestamp: Date.now(),
  }
  localStorage.setItem(STORAGE_KEYS.PRICE_CACHE, JSON.stringify(cache))
}

export const getPriceCache = (): Record<string, { price: number; timestamp: number }> => {
  const data = localStorage.getItem(STORAGE_KEYS.PRICE_CACHE)
  return data ? JSON.parse(data) : {}
}

export const getCachedPrice = (asset: string, maxAge = 30000): number | null => {
  const cache = getPriceCache()
  const cached = cache[asset]

  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.price
  }

  return null
}
