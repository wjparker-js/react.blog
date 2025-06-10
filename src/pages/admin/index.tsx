import React, { useState, useEffect } from 'react'
import { navigate } from 'gatsby'
import styled from 'styled-components'
import AdminLayout from '../../components/admin/AdminLayout'
import DashboardStats from '../../components/admin/DashboardStats'
import RecentActivity from '../../components/admin/RecentActivity'
import QuickActions from '../../components/admin/QuickActions'
import { useAuth } from '../../hooks/useAuth'
import { adminApi } from '../../utils/adminApi'

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const WelcomeHeader = styled.div`
  margin-bottom: 2rem;
  
  h1 {
    color: var(--color-text);
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  p {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }
`

interface DashboardData {
  stats: {
    totalPosts: number
    totalUsers: number
    totalComments: number
    totalMedia: number
    publishedPosts: number
    draftPosts: number
    pendingComments: number
    recentViews: number
  }
  recentActivity: Array<{
    id: string
    type: 'post' | 'comment' | 'user' | 'media'
    action: string
    description: string
    timestamp: string
    user: string
  }>
}

const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin/login')
      return
    }

    if (!loading && isAuthenticated && (!user?.role || !['ADMIN', 'MODERATOR', 'EDITOR'].includes(user.role))) {
      navigate('/admin/unauthorized')
      return
    }

    if (isAuthenticated) {
      loadDashboardData()
    }
  }, [loading, isAuthenticated, user])

  const loadDashboardData = async () => {
    try {
      setDataLoading(true)
      const response = await adminApi.get('/dashboard/overview')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  if (loading || dataLoading) {
    return (
      <AdminLayout>
        <DashboardContainer>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div>Loading dashboard...</div>
          </div>
        </DashboardContainer>
      </AdminLayout>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <AdminLayout>
      <DashboardContainer>
        <WelcomeHeader>
          <h1>Welcome back, {user?.name || 'Admin'}!</h1>
          <p>Here's what's happening with your content management system.</p>
        </WelcomeHeader>

        {dashboardData && (
          <>
            <StatsGrid>
              <DashboardStats stats={dashboardData.stats} />
            </StatsGrid>

            <QuickActions />

            <ContentGrid>
              <RecentActivity activities={dashboardData.recentActivity} />
              <div>
                {/* Additional widgets can go here */}
              </div>
            </ContentGrid>
          </>
        )}
      </DashboardContainer>
    </AdminLayout>
  )
}

export default AdminDashboard 