"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabaseClient, type Series } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Tv, Plus, Search, Edit, Trash2, List } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SeriesPage() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [episodeCounts, setEpisodeCounts] = useState<Record<string, number>>({})
  const itemsPerPage = 10

  const fetchSeries = async (page = 1, query = "") => {
    setLoading(true)
    try {
      let supabaseQuery = supabaseClient
        .from("series")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (query) {
        supabaseQuery = supabaseQuery.ilike("title", `%${query}%`)
      }

      const { data, count, error } = await supabaseQuery.range((page - 1) * itemsPerPage, page * itemsPerPage - 1)

      if (error) throw error

      setSeries(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))

      // Fetch episode counts for each series
      if (data && data.length > 0) {
        const seriesIds = data.map((s) => s.id)
        const { data: episodeData, error: episodeError } = await supabaseClient
          .from("episodes")
          .select("series_id, id")
          .in("series_id", seriesIds)

        if (episodeError) throw episodeError

        const counts: Record<string, number> = {}
        episodeData?.forEach((episode) => {
          counts[episode.series_id] = (counts[episode.series_id] || 0) + 1
        })

        setEpisodeCounts(counts)
      }
    } catch (error) {
      console.error("Error fetching series:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeries(currentPage, searchQuery)
  }, [currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchSeries(1, searchQuery)
  }

  const handleDelete = async (id: string) => {
    try {
      // First check if there are episodes
      const { count } = await supabaseClient
        .from("episodes")
        .select("*", { count: "exact", head: true })
        .eq("series_id", id)

      if (count && count > 0) {
        // Delete all episodes first
        const { error: episodeError } = await supabaseClient.from("episodes").delete().eq("series_id", id)

        if (episodeError) throw episodeError
      }

      // Delete the series record
      const { error } = await supabaseClient.from("series").delete().eq("id", id)

      if (error) throw error

      // Refresh the list
      fetchSeries(currentPage, searchQuery)
    } catch (error) {
      console.error("Error deleting series:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Series</h1>
        <Link href="/dashboard/series/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Series</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <Input
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" variant="outline" size="icon">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : series.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Episodes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>{episodeCounts[item.id] || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/series/${item.id}/episodes`}>
                            <Button variant="outline" size="icon">
                              <List className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/series/${item.id}`}>
                            <Button variant="outline" size="icon">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{item.title}" and all its episodes.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink onClick={() => setCurrentPage(page)} isActive={page === currentPage}>
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tv className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No series found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? `No results for "${searchQuery}"` : "Get started by adding your first series"}
              </p>
              {!searchQuery && (
                <Link href="/dashboard/series/new">
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Series</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
