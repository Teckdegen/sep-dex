"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Activity, Users, Zap } from "lucide-react"
import { priceFeedManager } from "@/lib/price-feed/manager"

// Sample data for charts (replace with real data)
const priceData = [
  { time: '00:00', btc: 45000, eth: 2800, stx: 2.5 },
  { time: '04:00', btc: 45200, eth: 2850, stx: 2.6 },
  { time: '08:00', btc: 44800, eth: 2750, stx: 2.4 },
  { time: '12:00', btc: 45500, eth: 2900, stx: 2.7 },
  { time: '16:00', btc: 46000, eth: 2950, stx: 2.8 },
  { time: '20:00', btc: 46500, eth: 3000, stx: 2.9 },
]

const topGainers = [
  { symbol: 'BTC', price: '$46,500', change: '+5.2%', positive: true },
  { symbol: 'ETH', price: '$3,000', change: '+3.1%', positive: true },
  { symbol: 'STX', price: '$2.90', change: '+16.0%', positive: true },
]

const topLosers = [
  { symbol: 'SOL', price: '$180', change: '-2.1%', positive: false },
  { symbol: 'ADA', price: '$0.45', change: '-1.5%', positive: false },
]

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const priceData = await priceFeedManager.getAllPrices()
        setPrices(priceData)
      } catch (error) {
        console.error('Failed to fetch prices:', error)
      } finally {
        setIsLoadingPrices(false)
      }
    }
    if (isAuthenticated) {
      fetchPrices()
    }
  }, [isAuthenticated])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-pulse text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
          <p className="text-gray-400">Monitor markets, manage positions, and trade seamlessly</p>
        </div>
        <Button onClick={() => router.push("/trading")} size="lg" className="bg-blue-600 hover:bg-blue-700">
          <TrendingUp className="mr-2 h-5 w-5" />
          Start Trading
        </Button>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$2.4M</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">1,234</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Open Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">89</div>
            <p className="text-xs text-muted-foreground">
              +12 from yesterday
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg. Leverage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">25x</div>
            <p className="text-xs text-muted-foreground">
              +2.5x from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Market Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Price Charts</CardTitle>
            <CardDescription className="text-gray-400">Real-time price movements</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="btc">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="btc">BTC</TabsTrigger>
                <TabsTrigger value="eth">ETH</TabsTrigger>
                <TabsTrigger value="stx">STX</TabsTrigger>
              </TabsList>
              <TabsContent value="btc">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#F9FAFB' }} />
                    <Area type="monotone" dataKey="btc" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="eth">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#F9FAFB' }} />
                    <Area type="monotone" dataKey="eth" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="stx">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#F9FAFB' }} />
                    <Area type="monotone" dataKey="stx" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Market Movers</CardTitle>
            <CardDescription className="text-gray-400">Top gainers and losers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-green-400 mb-2">Top Gainers</h3>
              {topGainers.map((item) => (
                <div key={item.symbol} className="flex justify-between items-center mb-2">
                  <span className="text-white">{item.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{item.price}</span>
                    <Badge variant={item.positive ? "default" : "destructive"} className={item.positive ? "bg-green-600" : "bg-red-600"}>
                      {item.change}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-2">Top Losers</h3>
              {topLosers.map((item) => (
                <div key={item.symbol} className="flex justify-between items-center mb-2">
                  <span className="text-white">{item.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{item.price}</span>
                    <Badge variant={item.positive ? "default" : "destructive"} className={item.positive ? "bg-green-600" : "bg-red-600"}>
                      {item.change}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => router.push("/wallet")} className="h-20 flex-col">
              <Zap className="h-6 w-6 mb-2" />
              Manage Wallet
            </Button>
            <Button variant="outline" onClick={() => router.push("/trading")} className="h-20 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              Open Position
            </Button>
            <Button variant="outline" onClick={() => router.push("/portfolio")} className="h-20 flex-col">
              <Activity className="h-6 w-6 mb-2" />
              View Portfolio
            </Button>
            <Button variant="outline" onClick={() => router.push("/analytics")} className="h-20 flex-col">
              <TrendingDown className="h-6 w-6 mb-2" />
              Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}