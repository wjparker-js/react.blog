import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { navigate } from 'gatsby'
import AdminLayout from '../../../components/admin/AdminLayout'
import { adminApi } from '../../../utils/adminApi'

const PostEditor = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`

const EditorHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #ecf0f1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const PageTitle = styled.h1`
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
`

const EditorActions = styled.div`
  display: flex;
  gap: 1rem;
`

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: #3498db;
    color: white;
    
    &:hover {
      background: #2980b9;
    }
  ` : `
    background: #ecf0f1;
    color: #2c3e50;
    
    &:hover {
      background: #d5dbdb;
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const EditorForm = styled.form`
  padding: 2rem;
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
`

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
`

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`

const FormTextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`

const RichEditor = styled.div`
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 400px;
  
  .editor-toolbar {
    background: #f8f9fa;
    padding: 0.75rem;
    border-bottom: 1px solid #ddd;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .editor-content {
    padding: 1rem;
    min-height: 350px;
    line-height: 1.6;
    
    &:focus {
      outline: none;
    }
  }
`

const ToolbarButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#2c3e50'};
  border: 1px solid #ddd;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  min-width: 35px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? '#2980b9' : '#f8f9fa'};
  }
`

const Sidebar = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 4px;
`

const SidebarSection = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const SidebarTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1rem;
`

const TagsInput = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`

const Tag = styled.span`
  background: #3498db;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const TagRemove = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 0.7rem;
  
  &:hover {
    opacity: 0.7;
  }
`

interface Category {
  id: string
  name: string
}

const NewPostPage: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    categoryId: '',
    status: 'draft',
    scheduledAt: '',
    metaTitle: '',
    metaDescription: '',
    tags: [] as string[]
  })
  
  const [categories, setCategories] = useState<Category[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    underline: false
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    // Auto-generate slug from title
    if (formData.title && !formData.slug) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.title, formData.slug])

  const fetchCategories = async () => {
    try {
      const response = await adminApi.get<Category[]>('/content/categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      // Mock data
      setCategories([
        { id: '1', name: 'React' },
        { id: '2', name: 'TypeScript' },
        { id: '3', name: 'CSS' },
        { id: '4', name: 'JavaScript' }
      ])
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleToolbarAction = (action: string) => {
    document.execCommand(action, false, undefined)
    setToolbarState(prev => ({
      ...prev,
      [action]: !prev[action as keyof typeof prev]
    }))
  }

  const handleSave = async (status: 'draft' | 'published') => {
    setSaving(true)
    try {
      const postData = { ...formData, status }
      await adminApi.post('/content/posts', postData)
      navigate('/admin/posts')
    } catch (error) {
      console.error('Failed to save post:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/admin/posts')
  }

  return (
    <AdminLayout>
      <PostEditor>
        <EditorHeader>
          <PageTitle>Create New Post</PageTitle>
          <EditorActions>
            <ActionButton 
              type="button" 
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </ActionButton>
            <ActionButton 
              onClick={() => handleSave('draft')}
              disabled={saving}
            >
              Save Draft
            </ActionButton>
            <ActionButton 
              variant="primary"
              onClick={() => handleSave('published')}
              disabled={saving || !formData.title || !formData.content}
            >
              {saving ? 'Publishing...' : 'Publish'}
            </ActionButton>
          </EditorActions>
        </EditorHeader>

        <EditorForm>
          <FormGrid>
            <div>
              <FormGroup>
                <FormLabel>Title *</FormLabel>
                <FormInput
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter post title..."
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Slug</FormLabel>
                <FormInput
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="auto-generated-from-title"
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Excerpt</FormLabel>
                <FormTextArea
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange('excerpt', e.target.value)}
                  placeholder="Brief description of your post..."
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Content *</FormLabel>
                <RichEditor>
                  <div className="editor-toolbar">
                    <ToolbarButton 
                      type="button"
                      active={toolbarState.bold}
                      onClick={() => handleToolbarAction('bold')}
                    >
                      <strong>B</strong>
                    </ToolbarButton>
                    <ToolbarButton 
                      type="button"
                      active={toolbarState.italic}
                      onClick={() => handleToolbarAction('italic')}
                    >
                      <em>I</em>
                    </ToolbarButton>
                    <ToolbarButton 
                      type="button"
                      active={toolbarState.underline}
                      onClick={() => handleToolbarAction('underline')}
                    >
                      <u>U</u>
                    </ToolbarButton>
                    <ToolbarButton 
                      type="button"
                      onClick={() => handleToolbarAction('insertUnorderedList')}
                    >
                      • List
                    </ToolbarButton>
                    <ToolbarButton 
                      type="button"
                      onClick={() => handleToolbarAction('insertOrderedList')}
                    >
                      1. List
                    </ToolbarButton>
                    <ToolbarButton 
                      type="button"
                      onClick={() => handleToolbarAction('createLink')}
                    >
                      🔗
                    </ToolbarButton>
                  </div>
                  <div 
                    className="editor-content"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => handleInputChange('content', e.currentTarget.innerHTML)}
                    placeholder="Start writing your post..."
                  />
                </RichEditor>
              </FormGroup>
            </div>

            <Sidebar>
              <SidebarSection>
                <SidebarTitle>Publishing</SidebarTitle>
                <FormGroup>
                  <FormLabel>Status</FormLabel>
                  <FormSelect
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </FormSelect>
                </FormGroup>
                {formData.status === 'scheduled' && (
                  <FormGroup>
                    <FormLabel>Publish Date</FormLabel>
                    <FormInput
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                    />
                  </FormGroup>
                )}
              </SidebarSection>

              <SidebarSection>
                <SidebarTitle>Category</SidebarTitle>
                <FormSelect
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                >
                  <option value="">Select category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </FormSelect>
              </SidebarSection>

              <SidebarSection>
                <SidebarTitle>Tags</SidebarTitle>
                <FormInput
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tags..."
                />
                <TagsInput>
                  {formData.tags.map(tag => (
                    <Tag key={tag}>
                      {tag}
                      <TagRemove onClick={() => handleRemoveTag(tag)}>×</TagRemove>
                    </Tag>
                  ))}
                </TagsInput>
              </SidebarSection>

              <SidebarSection>
                <SidebarTitle>SEO</SidebarTitle>
                <FormGroup>
                  <FormLabel>Meta Title</FormLabel>
                  <FormInput
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                    placeholder="SEO title..."
                  />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Meta Description</FormLabel>
                  <FormTextArea
                    value={formData.metaDescription}
                    onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                    placeholder="SEO description..."
                    rows={3}
                  />
                </FormGroup>
              </SidebarSection>
            </Sidebar>
          </FormGrid>
        </EditorForm>
      </PostEditor>
    </AdminLayout>
  )
}

export default NewPostPage 