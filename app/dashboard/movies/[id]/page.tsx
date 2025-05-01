"use client"

import { useEffect, useState } from "react"
import { supabaseClient, type Movie } from "@/lib/supabase"
import MovieForm from "../movie-form"

export default function EditMoviePage({ params }: { params: { id: string } }) {
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const { data, error } = await supabaseClient.from("movies").select("*").eq("id", params.id).single()

        if (error) throw error
        setMovie(data)
      } catch (err: any) {
        console.error("Error fetching movie:", err)
        setError(err.message || "Failed to load movie")
      } finally {
        setLoading(false)
      }
    }

    fetchMovie()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return <div className="bg-destructive/10 text-destructive p-4 rounded-md">{error}</div>
  }

  if (!movie) {
    return <div className="text-center py-8">Movie not found</div>
  }

  return <MovieForm movie={movie} isEditing />
}
