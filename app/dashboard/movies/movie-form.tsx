"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabaseClient, type Movie } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { X, Upload, Loader2, ImageIcon } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

interface MovieFormProps {
  movie?: Movie
  isEditing?: boolean
}

export default function MovieForm({ movie, isEditing = false }: MovieFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Partial<Movie>>({
    title: "",
    description: "",
    poster_url: "",
    stream_link: "",
    download_link: "",
    screenshots: [],
  })
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [posterPreview, setPosterPreview] = useState<string>("")
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (movie && isEditing) {
      setFormData({
        title: movie.title || "",
        description: movie.description || "",
        poster_url: movie.poster_url || "",
        stream_link: movie.stream_link || "",
        download_link: movie.download_link || "",
        screenshots: movie.screenshots || [],
      })
      setPosterPreview(movie.poster_url || "")
      setScreenshotPreviews(movie.screenshots || [])
    }
  }, [movie, isEditing])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPosterFile(file)
      setPosterPreview(URL.createObjectURL(file))
    }
  }

  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setScreenshotFiles((prev) => [...prev, ...files])

      const newPreviews = files.map((file) => URL.createObjectURL(file))
      setScreenshotPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeScreenshot = (index: number) => {
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index))
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingScreenshot = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      screenshots: prev.screenshots?.filter((screenshot) => screenshot !== url) || [],
    }))
    setScreenshotPreviews((prev) => prev.filter((preview) => preview !== url))
  }

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabaseClient.storage.from("media").upload(path, file)

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("media").getPublicUrl(path)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const movieId = movie?.id || uuidv4()
      let posterUrl = formData.poster_url
      let screenshotUrls = [...(formData.screenshots || [])]

      // Upload poster if changed
      if (posterFile) {
        const path = `posters/${movieId}/${uuidv4()}`
        posterUrl = await uploadFile(posterFile, path)
      }

      // Upload new screenshots
      if (screenshotFiles.length > 0) {
        const uploadPromises = screenshotFiles.map(async (file) => {
          const path = `screenshots/${movieId}/${uuidv4()}`
          return await uploadFile(file, path)
        })

        const newScreenshotUrls = await Promise.all(uploadPromises)
        screenshotUrls = [...screenshotUrls, ...newScreenshotUrls]
      }

      const updatedMovie = {
        ...formData,
        poster_url: posterUrl,
        screenshots: screenshotUrls,
      }

      if (isEditing) {
        const { error } = await supabaseClient.from("movies").update(updatedMovie).eq("id", movieId)

        if (error) throw error
      } else {
        const { error } = await supabaseClient.from("movies").insert({ ...updatedMovie, id: movieId })

        if (error) throw error
      }

      router.push("/dashboard/movies")
    } catch (err: any) {
      setError(err.message || "Failed to save movie")
      console.error("Error saving movie:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Movie" : "Add New Movie"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stream_link">Stream Link</Label>
            <Input id="stream_link" name="stream_link" value={formData.stream_link} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="download_link">Download Link</Label>
            <Input
              id="download_link"
              name="download_link"
              value={formData.download_link}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Poster Image</Label>
            <div className="flex items-start gap-4">
              {posterPreview ? (
                <div className="relative w-40 h-60 bg-muted rounded-md overflow-hidden">
                  <img
                    src={posterPreview || "/placeholder.svg"}
                    alt="Poster preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 w-6 h-6"
                    onClick={() => {
                      setPosterFile(null)
                      setPosterPreview("")
                      setFormData((prev) => ({ ...prev, poster_url: "" }))
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-40 h-60 bg-muted rounded-md border-2 border-dashed border-muted-foreground/25">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  <Label
                    htmlFor="poster"
                    className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                  >
                    Upload poster
                  </Label>
                  <Input id="poster" type="file" accept="image/*" onChange={handlePosterChange} className="hidden" />
                </div>
              )}

              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a poster image for the movie. Recommended size: 500x750px.
                </p>
                {!posterPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("poster")?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select Image</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Screenshots</Label>
            <div className="flex flex-col gap-4">
              {screenshotPreviews.length > 0 && (
                <Carousel className="w-full max-w-md">
                  <CarouselContent>
                    {screenshotPreviews.map((preview, index) => (
                      <CarouselItem key={index} className="basis-full">
                        <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                          <img
                            src={preview || "/placeholder.svg"}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 w-6 h-6"
                            onClick={() => {
                              // Check if it's a new screenshot or existing one
                              if (formData.screenshots?.includes(preview)) {
                                removeExistingScreenshot(preview)
                              } else {
                                removeScreenshot(index)
                              }
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              )}

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-40 h-24 bg-muted rounded-md border-2 border-dashed border-muted-foreground/25">
                  <Label
                    htmlFor="screenshots"
                    className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                  >
                    Add screenshots
                  </Label>
                  <Input
                    id="screenshots"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotsChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload screenshots to showcase the movie. These will be shown to users before they access the links.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("screenshots")?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select Images</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/movies")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Update Movie" : "Add Movie"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
