"use client"

import { useEffect, useState } from "react"
import { supabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Film, Tv, Clock } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  const [stats, setStats] = useState({
    movies: 0,
    series: 0,
    episodes: 0,
    recentItems: [] as any[],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get counts
        const { count: moviesCount } = await supabaseClient.from("movies").select("*", { count: "exact", head: true })

        const { count: seriesCount } = await supabaseClient.from("series").select("*", { count: "exact", head: true })

        const { count: episodesCount } = await supabaseClient
          .from("episodes")
          .select("*", { count: "exact", head: true })

        // Get recent items
        const { data: recentMovies } = await supabaseClient
          .from("movies")
          .select("id, title, created_at")
          .order("created_at", { ascending: false })
          .limit(3)

        const { data: recentSeries } = await supabaseClient
          .from("series")
          .select("id, title, created_at")
          .order("created_at", { ascending: false })
          .limit(3)

        // Combine and sort by date
        const recentItems = [
          ...(recentMovies || []).map((m) => ({ ...m, type: "movie" })),
          ...(recentSeries || []).map((s) => ({ ...s, type: "series" })),
        ]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)

        setStats({
          movies: moviesCount || 0,
          series: seriesCount || 0,
          episodes: episodesCount || 0,
          recentItems,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Movies</CardTitle>
            <Film className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.movies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Series</CardTitle>
            <Tv className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.series}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Episodes</CardTitle>
            <Tv className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.episodes}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Additions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentItems.length > 0 ? (
              stats.recentItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    {item.type === "movie" ? (
                      <Film className="w-5 h-5 text-primary" />
                    ) : (
                      <Tv className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/${item.type === "movie" ? "movies" : "series"}/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{item.type === "movie" ? "Movie" : "Series"}</p>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No items added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
