'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (!email) {
      toast.error('Email is required')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to change password')
        return
      }

      setIsSuccess(true)
      toast.success('Password changed successfully!')
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">Password changed</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Your password has been successfully updated. Redirecting...
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Change password</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Enter the user&apos;s email and new password
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter user's email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing password...
                </>
              ) : (
                'Change password'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
