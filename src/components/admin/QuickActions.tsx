import React from 'react'
import styled from 'styled-components'
import { navigate } from 'gatsby'

const QuickActionsContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`

const ActionsHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #ecf0f1;
`

const ActionsTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
`

const ActionsGrid = styled.div`
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`

const ActionButton = styled.button`
  background: white;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;

  &:hover {
    border-color: #3498db;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
`

const ActionIcon = styled.div`
  font-size: 2rem;
  color: #3498db;
`

const ActionTitle = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
`

const ActionDescription = styled.div`
  font-size: 0.8rem;
  color: #7f8c8d;
  line-height: 1.4;
`

interface QuickAction {
  icon: string
  title: string
  description: string
  path: string
}

const QuickActions: React.FC = () => {
  const actions: QuickAction[] = [
    {
      icon: '✍️',
      title: 'New Post',
      description: 'Create a new blog post',
      path: '/admin/posts/new'
    },
    {
      icon: '📂',
      title: 'Categories',
      description: 'Manage post categories',
      path: '/admin/categories'
    },
    {
      icon: '🏷️',
      title: 'Tags',
      description: 'Organize content tags',
      path: '/admin/tags'
    },
    {
      icon: '🖼️',
      title: 'Media Library',
      description: 'Upload and manage media',
      path: '/admin/media'
    },
    {
      icon: '💬',
      title: 'Comments',
      description: 'Moderate user comments',
      path: '/admin/comments'
    },
    {
      icon: '👥',
      title: 'Users',
      description: 'Manage user accounts',
      path: '/admin/users'
    },
    {
      icon: '📊',
      title: 'Analytics',
      description: 'View site analytics',
      path: '/admin/analytics'
    },
    {
      icon: '⚙️',
      title: 'Settings',
      description: 'Configure site settings',
      path: '/admin/settings'
    }
  ]

  const handleActionClick = (path: string) => {
    navigate(path)
  }

  return (
    <QuickActionsContainer>
      <ActionsHeader>
        <ActionsTitle>Quick Actions</ActionsTitle>
      </ActionsHeader>
      <ActionsGrid>
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            onClick={() => handleActionClick(action.path)}
          >
            <ActionIcon>{action.icon}</ActionIcon>
            <div>
              <ActionTitle>{action.title}</ActionTitle>
              <ActionDescription>{action.description}</ActionDescription>
            </div>
          </ActionButton>
        ))}
      </ActionsGrid>
    </QuickActionsContainer>
  )
}

export default QuickActions 