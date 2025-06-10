import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Link } from 'gatsby'
import AdminLayout from '../../../components/admin/AdminLayout'
import { adminApi } from '../../../utils/adminApi'

const PostsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const PageTitle = styled.h1`
  margin: 0;
  color: #2c3e50;
  font-size: 2rem;
`

const NewPostButton = styled(Link)`
  background: #3498db;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.2s ease;

  &:hover {
    background: #2980b9;
  }
`

const PostsContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`

const PostsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const TableHeader = styled.thead`
  background: #f8f9fa;
`

const TableRow = styled.tr`
  border-bottom: 1px solid #ecf0f1;
  
  &:hover {
    background: #f8f9fa;
  }
`

const TableCell = styled.td`
  padding: 1rem;
  vertical-align: top;
`

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #ecf0f1;
`

const PostTitle = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
`

const PostMeta = styled.div`
  font-size: 0.8rem;
  color: #7f8c8d;
`

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'published': return '#2ecc71'
      case 'draft': return '#f39c12'
      case 'scheduled': return '#3498db'
      default: return '#95a5a6'
    }
  }};
  color: white;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

const ActionButton = styled.button`
  background: none;
  border: 1px solid #ddd;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f9fa;
  }

  &.edit {
    color: #3498db;
    border-color: #3498db;
    
    &:hover {
      background: #3498db;
      color: white;
    }
  }

  &.delete {
    color: #e74c3c;
    border-color: #e74c3c;
    
    &:hover {
      background: #e74c3c;
      color: white;
    }
  }
`

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #7f8c8d;
`

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #7f8c8d;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
`

interface Post {
  id: string
  title: string
  slug: string
  status: 'published' | 'draft' | 'scheduled'
  category: string
  author: string
  createdAt: string
  updatedAt: string
  views: number
}

const PostsPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await adminApi.get<Post[]>('/content/posts')
      setPosts(response.data || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      // Mock data for demo
      setPosts([
        {
          id: '1',
          title: 'Getting Started with React Hooks',
          slug: 'getting-started-react-hooks',
          status: 'published',
          category: 'React',
          author: 'John Doe',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15',
          views: 1247
        },
        {
          id: '2',
          title: 'TypeScript Best Practices',
          slug: 'typescript-best-practices',
          status: 'published',
          category: 'TypeScript',
          author: 'Jane Smith',
          createdAt: '2024-01-10',
          updatedAt: '2024-01-12',
          views: 892
        },
        {
          id: '3',
          title: 'Advanced CSS Techniques',
          slug: 'advanced-css-techniques',
          status: 'draft',
          category: 'CSS',
          author: 'Mike Johnson',
          createdAt: '2024-01-08',
          updatedAt: '2024-01-08',
          views: 0
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await adminApi.delete(`/content/posts/${postId}`)
        setPosts(posts.filter(post => post.id !== postId))
      } catch (error) {
        console.error('Failed to delete post:', error)
      }
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <PostsHeader>
          <PageTitle>Posts</PageTitle>
          <NewPostButton to="/admin/posts/new">New Post</NewPostButton>
        </PostsHeader>
        <LoadingState>Loading posts...</LoadingState>
      </AdminLayout>
    )
  }

  if (posts.length === 0) {
    return (
      <AdminLayout>
        <PostsHeader>
          <PageTitle>Posts</PageTitle>
          <NewPostButton to="/admin/posts/new">New Post</NewPostButton>
        </PostsHeader>
        <EmptyState>
          <div className="icon">📝</div>
          <div>No posts found. Create your first post!</div>
        </EmptyState>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PostsHeader>
        <PageTitle>Posts ({posts.length})</PageTitle>
        <NewPostButton to="/admin/posts/new">New Post</NewPostButton>
      </PostsHeader>

      <PostsContainer>
        <PostsTable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Views</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {posts.map(post => (
              <TableRow key={post.id}>
                <TableCell>
                  <PostTitle>{post.title}</PostTitle>
                  <PostMeta>by {post.author}</PostMeta>
                </TableCell>
                <TableCell>{post.category}</TableCell>
                <TableCell>
                  <StatusBadge status={post.status}>
                    {post.status}
                  </StatusBadge>
                </TableCell>
                <TableCell>{post.views.toLocaleString()}</TableCell>
                <TableCell>
                  <div>{new Date(post.createdAt).toLocaleDateString()}</div>
                  {post.updatedAt !== post.createdAt && (
                    <PostMeta>Updated: {new Date(post.updatedAt).toLocaleDateString()}</PostMeta>
                  )}
                </TableCell>
                <TableCell>
                  <ActionButtons>
                    <ActionButton className="edit">Edit</ActionButton>
                    <ActionButton 
                      className="delete"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      Delete
                    </ActionButton>
                  </ActionButtons>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </PostsTable>
      </PostsContainer>
    </AdminLayout>
  )
}

export default PostsPage 