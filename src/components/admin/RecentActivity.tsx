import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { adminApi } from '../../utils/adminApi'

const ActivityContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`

const ActivityHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #ecf0f1;
  display: flex;
  justify-content: between;
  align-items: center;
`

const ActivityTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
`

const ActivityList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`

const ActivityItem = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f8f9fa;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: background 0.2s ease;

  &:hover {
    background: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }
`

const ActivityIcon = styled.div<{ type: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: ${props => {
    switch (props.type) {
      case 'post': return '#3498db'
      case 'comment': return '#f39c12'
      case 'user': return '#2ecc71'
      case 'media': return '#9b59b6'
      case 'system': return '#e74c3c'
      default: return '#95a5a6'
    }
  }};
  color: white;
`

const ActivityContent = styled.div`
  flex: 1;
`

const ActivityMessage = styled.div`
  color: #2c3e50;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`

const ActivityMeta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #7f8c8d;
`

const LoadingSkeleton = styled.div`
  background: #ecf0f1;
  height: 20px;
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
  margin-bottom: 0.5rem;

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`

const EmptyState = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  color: #7f8c8d;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
`

interface Activity {
  id: string
  type: 'post' | 'comment' | 'user' | 'media' | 'system'
  message: string
  user: string
  timestamp: string
  metadata?: any
}

interface RecentActivityProps {}

const RecentActivity: React.FC<RecentActivityProps> = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const response = await adminApi.get<Activity[]>('/dashboard/activity')
      setActivities(response.data || [])
    } catch (error) {
      console.error('Failed to fetch activity:', error)
      // Mock data for demo
      setActivities([
        {
          id: '1',
          type: 'post',
          message: 'Published a new blog post "Getting Started with React Hooks"',
          user: 'John Doe',
          timestamp: '2 minutes ago'
        },
        {
          id: '2',
          type: 'comment',
          message: 'New comment pending moderation on "TypeScript Best Practices"',
          user: 'System',
          timestamp: '15 minutes ago'
        },
        {
          id: '3',
          type: 'user',
          message: 'Sarah Wilson registered as a new user',
          user: 'System',
          timestamp: '1 hour ago'
        },
        {
          id: '4',
          type: 'media',
          message: 'Uploaded 5 new images to media library',
          user: 'Jane Smith',
          timestamp: '2 hours ago'
        },
        {
          id: '5',
          type: 'post',
          message: 'Updated blog post "Advanced CSS Techniques"',
          user: 'Mike Johnson',
          timestamp: '3 hours ago'
        },
        {
          id: '6',
          type: 'system',
          message: 'Automated backup completed successfully',
          user: 'System',
          timestamp: '6 hours ago'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝'
      case 'comment': return '💬'
      case 'user': return '👤'
      case 'media': return '🖼️'
      case 'system': return '⚙️'
      default: return '📄'
    }
  }

  if (loading) {
    return (
      <ActivityContainer>
        <ActivityHeader>
          <ActivityTitle>Recent Activity</ActivityTitle>
        </ActivityHeader>
        <ActivityList>
          {[1,2,3,4,5].map(i => (
            <ActivityItem key={i}>
              <LoadingSkeleton style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <LoadingSkeleton style={{ width: '80%', marginBottom: '0.5rem' }} />
                <LoadingSkeleton style={{ width: '40%', height: '14px' }} />
              </div>
            </ActivityItem>
          ))}
        </ActivityList>
      </ActivityContainer>
    )
  }

  if (activities.length === 0) {
    return (
      <ActivityContainer>
        <ActivityHeader>
          <ActivityTitle>Recent Activity</ActivityTitle>
        </ActivityHeader>
        <EmptyState>
          <div className="icon">📝</div>
          <div>No recent activity to display</div>
        </EmptyState>
      </ActivityContainer>
    )
  }

  return (
    <ActivityContainer>
      <ActivityHeader>
        <ActivityTitle>Recent Activity</ActivityTitle>
      </ActivityHeader>
      <ActivityList>
        {activities.map(activity => (
          <ActivityItem key={activity.id}>
            <ActivityIcon type={activity.type}>
              {getIcon(activity.type)}
            </ActivityIcon>
            <ActivityContent>
              <ActivityMessage>{activity.message}</ActivityMessage>
              <ActivityMeta>
                <span>by {activity.user}</span>
                <span>•</span>
                <span>{activity.timestamp}</span>
              </ActivityMeta>
            </ActivityContent>
          </ActivityItem>
        ))}
      </ActivityList>
    </ActivityContainer>
  )
}

export default RecentActivity 