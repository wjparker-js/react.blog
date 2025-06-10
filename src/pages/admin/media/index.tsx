import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import AdminLayout from '../../../components/admin/AdminLayout'
import { adminApi } from '../../../utils/adminApi'

const MediaHeader = styled.div`
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

const MediaActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`

const UploadButton = styled.button`
  background: #3498db;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #2980b9;
  }
`

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
`

const ViewButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#2c3e50'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#2980b9' : '#f8f9fa'};
  }
`

const MediaContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`

const MediaGrid = styled.div<{ view: 'grid' | 'list' }>`
  padding: 1.5rem;
  display: ${props => props.view === 'grid' ? 'grid' : 'block'};
  ${props => props.view === 'grid' && `
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  `}
`

const MediaItem = styled.div<{ view: 'grid' | 'list' }>`
  ${props => props.view === 'list' ? `
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #f0f0f0;
    gap: 1rem;
  ` : `
    background: #f8f9fa;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s ease;
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
  `}
`

const MediaThumbnail = styled.div<{ view: 'grid' | 'list' }>`
  ${props => props.view === 'list' ? `
    width: 60px;
    height: 60px;
    flex-shrink: 0;
  ` : `
    width: 100%;
    height: 150px;
  `}
  background: #ecf0f1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .file-icon {
    font-size: 2rem;
    color: #7f8c8d;
  }
`

const MediaInfo = styled.div<{ view: 'grid' | 'list' }>`
  ${props => props.view === 'list' ? `
    flex: 1;
  ` : `
    padding: 1rem;
  `}
`

const MediaName = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MediaMeta = styled.div`
  font-size: 0.8rem;
  color: #7f8c8d;
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
`

interface MediaFile {
  id: string
  name: string
  url: string
  thumbnailUrl?: string
  type: string
  size: number
  createdAt: string
  dimensions?: {
    width: number
    height: number
  }
}

const MediaPage: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await adminApi.get<MediaFile[]>('/media')
      setFiles(response.data || [])
    } catch (error) {
      console.error('Failed to fetch files:', error)
      // Mock data
      setFiles([
        {
          id: '1',
          name: 'hero-image.jpg',
          url: '/images/hero.jpg',
          thumbnailUrl: '/images/hero-thumb.jpg',
          type: 'image/jpeg',
          size: 2048000,
          createdAt: '2024-01-15',
          dimensions: { width: 1920, height: 1080 }
        },
        {
          id: '2',
          name: 'blog-post-banner.png',
          url: '/images/banner.png',
          thumbnailUrl: '/images/banner-thumb.png',
          type: 'image/png',
          size: 1536000,
          createdAt: '2024-01-14',
          dimensions: { width: 1200, height: 630 }
        },
        {
          id: '3',
          name: 'document.pdf',
          url: '/files/document.pdf',
          type: 'application/pdf',
          size: 3072000,
          createdAt: '2024-01-13'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️'
    if (type.startsWith('video/')) return '🎥'
    if (type.startsWith('audio/')) return '🎵'
    if (type.includes('pdf')) return '📄'
    if (type.includes('document') || type.includes('word')) return '📝'
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊'
    return '📁'
  }

  return (
    <AdminLayout>
      <MediaHeader>
        <PageTitle>Media Library ({files.length} files)</PageTitle>
        <MediaActions>
          <ViewToggle>
            <ViewButton active={view === 'grid'} onClick={() => setView('grid')}>
              Grid
            </ViewButton>
            <ViewButton active={view === 'list'} onClick={() => setView('list')}>
              List
            </ViewButton>
          </ViewToggle>
          <UploadButton>Upload Files</UploadButton>
        </MediaActions>
      </MediaHeader>

      <MediaContainer>
        <MediaGrid view={view}>
          {files.map(file => (
            <MediaItem key={file.id} view={view}>
              <MediaThumbnail view={view}>
                {file.type.startsWith('image/') ? (
                  <img src={file.thumbnailUrl || file.url} alt={file.name} />
                ) : (
                  <div className="file-icon">{getFileIcon(file.type)}</div>
                )}
              </MediaThumbnail>
              <MediaInfo view={view}>
                <MediaName>{file.name}</MediaName>
                <MediaMeta>
                  <span>{formatFileSize(file.size)}</span>
                  {file.dimensions && (
                    <span>{file.dimensions.width} × {file.dimensions.height}</span>
                  )}
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </MediaMeta>
              </MediaInfo>
            </MediaItem>
          ))}
        </MediaGrid>
      </MediaContainer>
    </AdminLayout>
  )
}

export default MediaPage 