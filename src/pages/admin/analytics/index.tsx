import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import AdminLayout from '../../../components/admin/AdminLayout'
import { adminApi } from '../../../utils/adminApi'

const AnalyticsHeader = styled.div`
  margin-bottom: 2rem;
`

const PageTitle = styled.h1`
  margin: 0;
  color: #2c3e50;
  font-size: 2rem;
`

const AnalyticsGrid = styled.div`
  display: grid;
  gap: 2rem;
  margin-bottom: 2rem;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`

const MetricCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => props.color || '#3498db'};
`

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const MetricTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const MetricIcon = styled.div`
  font-size: 1.5rem;
  opacity: 0.7;
`

const MetricValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
`

const MetricChange = styled.div<{ positive: boolean }>`
  font-size: 0.9rem;
  color: ${props => props.positive ? '#27ae60' : '#e74c3c'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
`

const ChartCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`

const ChartHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #ecf0f1;
`

const ChartTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
`

const ChartContent = styled.div`
  padding: 1.5rem;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), 
              linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #f8f9fa 75%), 
              linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  
  .chart-placeholder {
    font-size: 3rem;
    opacity: 0.3;
  }
`

const TopContentCard = styled(ChartCard)`
  grid-column: span 2;
`

const TopContentList = styled.div`
  padding: 1.5rem;
`

const ContentItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`

const ContentInfo = styled.div`
  flex: 1;
`

const ContentTitle = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
`

const ContentMeta = styled.div`
  font-size: 0.8rem;
  color: #7f8c8d;
`

const ContentStats = styled.div`
  text-align: right;
  
  .views {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.25rem;
  }
  
  .engagement {
    font-size: 0.8rem;
    color: #7f8c8d;
  }
`

interface AnalyticsData {
  metrics: {
    totalViews: number
    totalPosts: number
    totalUsers: number
    avgEngagement: number
  }
  changes: {
    views: number
    posts: number
    users: number
    engagement: number
  }
  topContent: Array<{
    id: string
    title: string
    category: string
    views: number
    engagement: number
    publishedAt: string
  }>
}

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await adminApi.get<AnalyticsData>('/dashboard/analytics')
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      // Mock data
      setData({
        metrics: {
          totalViews: 15847,
          totalPosts: 42,
          totalUsers: 1283,
          avgEngagement: 7.3
        },
        changes: {
          views: 12.5,
          posts: -2.1,
          users: 8.7,
          engagement: 3.2
        },
        topContent: [
          {
            id: '1',
            title: 'Getting Started with React Hooks',
            category: 'React',
            views: 2847,
            engagement: 8.9,
            publishedAt: '2024-01-15'
          },
          {
            id: '2',
            title: 'TypeScript Best Practices',
            category: 'TypeScript',
            views: 1923,
            engagement: 7.6,
            publishedAt: '2024-01-12'
          },
          {
            id: '3',
            title: 'Advanced CSS Grid Techniques',
            category: 'CSS',
            views: 1654,
            engagement: 9.2,
            publishedAt: '2024-01-10'
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <AdminLayout>
        <AnalyticsHeader>
          <PageTitle>Analytics</PageTitle>
        </AnalyticsHeader>
        <div>Loading analytics...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AnalyticsHeader>
        <PageTitle>Analytics Overview</PageTitle>
      </AnalyticsHeader>

      <MetricsGrid>
        <MetricCard color="#3498db">
          <MetricHeader>
            <MetricTitle>Total Views</MetricTitle>
            <MetricIcon>👁️</MetricIcon>
          </MetricHeader>
          <MetricValue>{data.metrics.totalViews.toLocaleString()}</MetricValue>
          <MetricChange positive={data.changes.views > 0}>
            {data.changes.views > 0 ? '↗️' : '↘️'} {Math.abs(data.changes.views)}% from last month
          </MetricChange>
        </MetricCard>

        <MetricCard color="#2ecc71">
          <MetricHeader>
            <MetricTitle>Total Posts</MetricTitle>
            <MetricIcon>📝</MetricIcon>
          </MetricHeader>
          <MetricValue>{data.metrics.totalPosts}</MetricValue>
          <MetricChange positive={data.changes.posts > 0}>
            {data.changes.posts > 0 ? '↗️' : '↘️'} {Math.abs(data.changes.posts)}% from last month
          </MetricChange>
        </MetricCard>

        <MetricCard color="#e74c3c">
          <MetricHeader>
            <MetricTitle>Total Users</MetricTitle>
            <MetricIcon>👥</MetricIcon>
          </MetricHeader>
          <MetricValue>{data.metrics.totalUsers.toLocaleString()}</MetricValue>
          <MetricChange positive={data.changes.users > 0}>
            {data.changes.users > 0 ? '↗️' : '↘️'} {Math.abs(data.changes.users)}% from last month
          </MetricChange>
        </MetricCard>

        <MetricCard color="#f39c12">
          <MetricHeader>
            <MetricTitle>Avg Engagement</MetricTitle>
            <MetricIcon>💬</MetricIcon>
          </MetricHeader>
          <MetricValue>{data.metrics.avgEngagement}%</MetricValue>
          <MetricChange positive={data.changes.engagement > 0}>
            {data.changes.engagement > 0 ? '↗️' : '↘️'} {Math.abs(data.changes.engagement)}% from last month
          </MetricChange>
        </MetricCard>
      </MetricsGrid>

      <ChartsGrid>
        <ChartCard>
          <ChartHeader>
            <ChartTitle>Views Over Time</ChartTitle>
          </ChartHeader>
          <ChartContent>
            <div className="chart-placeholder">📊</div>
          </ChartContent>
        </ChartCard>

        <ChartCard>
          <ChartHeader>
            <ChartTitle>Traffic Sources</ChartTitle>
          </ChartHeader>
          <ChartContent>
            <div className="chart-placeholder">🥧</div>
          </ChartContent>
        </ChartCard>
      </ChartsGrid>

      <TopContentCard>
        <ChartHeader>
          <ChartTitle>Top Performing Content</ChartTitle>
        </ChartHeader>
        <TopContentList>
          {data.topContent.map((content, index) => (
            <ContentItem key={content.id}>
              <ContentInfo>
                <ContentTitle>#{index + 1} {content.title}</ContentTitle>
                <ContentMeta>
                  {content.category} • Published {new Date(content.publishedAt).toLocaleDateString()}
                </ContentMeta>
              </ContentInfo>
              <ContentStats>
                <div className="views">{content.views.toLocaleString()} views</div>
                <div className="engagement">{content.engagement}% engagement</div>
              </ContentStats>
            </ContentItem>
          ))}
        </TopContentList>
      </TopContentCard>
    </AdminLayout>
  )
}

export default AnalyticsPage 