"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabaseClient, type Movie } from "@/lib/supabase"
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
import { Film, Plus, Search, Edit, Trash2 } from "lucide-react"
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

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  const fetchMovies = async (page = 1, query = "") => {
    setLoading(true)
    try {
      let supabaseQuery = supabaseClient
        .from("movies")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (query) {
        supabaseQuery = supabaseQuery.ilike("title", `%${query}%`)
      }

      const { data, count, error } = await supabaseQuery.range((page - 1) * itemsPerPage, page * itemsPerPage - 1)

      if (error) throw error

      setMovies(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error("Error fetching movies:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovies(currentPage, searchQuery)
  }, [currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchMovies(1, searchQuery)
  }

  const handleDelete = async (id: string) => {
    try {
      // First delete screenshots from storage
      const { data: movie } = await supabaseClient.from("movies").select("screenshots").eq("id", id).single()

      if (movie && movie.screenshots && movie.screenshots.length > 0) {
        // Extract file paths from full URLs
        const filePaths = movie.screenshots.map((url: string) => {
          const path = url.split("/").slice(-2).join("/")
          return path
        })

        // Delete files from storage
        await supabaseClient.storage.from("media").remove(filePaths)
      }

      // Delete the movie record
      const { error } = await supabaseClient.from("movies").delete().eq("id", id)

      if (error) throw error

      // Refresh the list
      fetchMovies(currentPage, searchQuery)
    } catch (error) {
      console.error("Error deleting movie:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Movies</h1>
        <Link href="/dashboard/movies/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Movie</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <Input
              placeholder="Search movies..."
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
          ) : movies.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead>Screenshots</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movies.map((movie) => (
                    <TableRow key={movie.id}>
                      <TableCell className="font-medium">{movie.title}</TableCell>
                      <TableCell className="max-w-xs truncate">{movie.description}</TableCell>
                      <TableCell>
                        {movie.stream_link && movie.download_link ? (
                          <span className="text-green-500">Available</span>
                        ) : (
                          <span className="text-yellow-500">Incomplete</span>
                        )}
                      </TableCell>
                      <TableCell>{movie.screenshots?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/movies/${movie.id}`}>
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
                                  This will permanently delete "{movie.title}" and all associated screenshots.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(movie.id)}
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
              <Film className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No movies found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? `No results for "${searchQuery}"` : "Get started by adding your first movie"}
              </p>
              {!searchQuery && (
                <Link href="/dashboard/movies/new">
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Movie</span>
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
