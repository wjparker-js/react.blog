import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { adminApi } from '../../utils/adminApi'

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`

const StatCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => props.color || '#3498db'};
`

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const StatTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const StatIcon = styled.div`
  font-size: 1.5rem;
  opacity: 0.7;
`

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 0.5rem;
`

const StatChange = styled.div<{ positive?: boolean }>`
  font-size: 0.8rem;
  color: ${props => props.positive ? '#27ae60' : '#e74c3c'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const LoadingSkeleton = styled.div`
  background: #ecf0f1;
  height: 20px;
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`

interface DashboardStatsProps {}

interface StatData {
  posts: {
    total: number
    published: number
    draft: number
    change: number
  }
  users: {
    total: number
    active: number
    change: number
  }
  comments: {
    total: number
    pending: number
    change: number
  }
  media: {
    total: number
    size: string
    change: number
  }
}

const DashboardStats: React.FC<DashboardStatsProps> = () => {
  const [stats, setStats] = useState<StatData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await adminApi.get<StatData>('/dashboard/stats')
      setStats(response.data || {
        posts: { total: 156, published: 142, draft: 14, change: 12 },
        users: { total: 1247, active: 892, change: 23 },
        comments: { total: 3421, pending: 15, change: -5 },
        media: { total: 2847, size: '2.4 GB', change: 45 }
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Mock data for demo
      setStats({
        posts: { total: 156, published: 142, draft: 14, change: 12 },
        users: { total: 1247, active: 892, change: 23 },
        comments: { total: 3421, pending: 15, change: -5 },
        media: { total: 2847, size: '2.4 GB', change: 45 }
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <StatsContainer>
        {[1,2,3,4].map(i => (
          <StatCard key={i}>
            <StatHeader>
              <LoadingSkeleton style={{ width: '120px' }} />
              <LoadingSkeleton style={{ width: '30px', height: '30px' }} />
            </StatHeader>
            <LoadingSkeleton style={{ width: '80px', height: '40px', marginBottom: '10px' }} />
            <LoadingSkeleton style={{ width: '100px', height: '16px' }} />
          </StatCard>
        ))}
      </StatsContainer>
    )
  }

  return (
    <StatsContainer>
      <StatCard color="#3498db">
        <StatHeader>
          <StatTitle>Total Posts</StatTitle>
          <StatIcon>📝</StatIcon>
        </StatHeader>
        <StatValue>{stats.posts.total.toLocaleString()}</StatValue>
        <StatChange positive={stats.posts.change > 0}>
          {stats.posts.change > 0 ? '↗' : '↘'} {Math.abs(stats.posts.change)}% this month
        </StatChange>
        <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
          {stats.posts.published} published, {stats.posts.draft} draft
        </div>
      </StatCard>

      <StatCard color="#2ecc71">
        <StatHeader>
          <StatTitle>Users</StatTitle>
          <StatIcon>👥</StatIcon>
        </StatHeader>
        <StatValue>{stats.users.total.toLocaleString()}</StatValue>
        <StatChange positive={stats.users.change > 0}>
          {stats.users.change > 0 ? '↗' : '↘'} {Math.abs(stats.users.change)}% this month
        </StatChange>
        <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
          {stats.users.active} active users
        </div>
      </StatCard>

      <StatCard color="#f39c12">
        <StatHeader>
          <StatTitle>Comments</StatTitle>
          <StatIcon>💬</StatIcon>
        </StatHeader>
        <StatValue>{stats.comments.total.toLocaleString()}</StatValue>
        <StatChange positive={stats.comments.change > 0}>
          {stats.comments.change > 0 ? '↗' : '↘'} {Math.abs(stats.comments.change)}% this month
        </StatChange>
        <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
          {stats.comments.pending} pending moderation
        </div>
      </StatCard>

      <StatCard color="#9b59b6">
        <StatHeader>
          <StatTitle>Media Files</StatTitle>
          <StatIcon>🖼️</StatIcon>
        </StatHeader>
        <StatValue>{stats.media.total.toLocaleString()}</StatValue>
        <StatChange positive={stats.media.change > 0}>
          {stats.media.change > 0 ? '↗' : '↘'} {Math.abs(stats.media.change)}% this month
        </StatChange>
        <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
          {stats.media.size} total storage
        </div>
      </StatCard>
    </StatsContainer>
  )
}

export default DashboardStats 