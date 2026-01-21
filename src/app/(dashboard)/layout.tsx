import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApplicationLayout } from '@/components/layout/ApplicationLayout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ApplicationLayout>{children}</ApplicationLayout>
}
