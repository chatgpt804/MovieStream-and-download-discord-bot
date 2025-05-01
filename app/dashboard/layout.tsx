"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Film, Tv, LogOut, Home } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      if (!session) {
        router.push("/")
      } else {
        setLoading(false)
      }
    }

    checkSession()

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r">
        <div className="p-4">
          <h1 className="text-xl font-bold">Media Admin</h1>
        </div>
        <nav className="space-y-1 p-2">
          <Link href="/dashboard" className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/movies" className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
            <Film className="w-5 h-5" />
            <span>Movies</span>
          </Link>
          <Link href="/dashboard/series" className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
            <Tv className="w-5 h-5" />
            <span>Series</span>
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4">
          <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
