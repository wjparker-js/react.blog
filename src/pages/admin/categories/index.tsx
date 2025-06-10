import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import AdminLayout from '../../../components/admin/AdminLayout'
import { adminApi } from '../../../utils/adminApi'

const CategoriesHeader = styled.div`
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

const NewCategoryButton = styled.button`
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

const CategoriesContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`

const CategoriesList = styled.div`
  padding: 1.5rem;
`

const CategoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`

const CategoryInfo = styled.div`
  flex: 1;
`

const CategoryName = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
`

const CategoryMeta = styled.div`
  font-size: 0.8rem;
  color: #7f8c8d;
`

const CategoryActions = styled.div`
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

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  postCount: number
  createdAt: string
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await adminApi.get<Category[]>('/content/categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      // Mock data
      setCategories([
        {
          id: '1',
          name: 'React',
          slug: 'react',
          description: 'Posts about React framework',
          postCount: 12,
          createdAt: '2024-01-10'
        },
        {
          id: '2',
          name: 'TypeScript',
          slug: 'typescript',
          description: 'TypeScript tutorials and guides',
          postCount: 8,
          createdAt: '2024-01-08'
        },
        {
          id: '3',
          name: 'CSS',
          slug: 'css',
          description: 'CSS tips and tricks',
          postCount: 15,
          createdAt: '2024-01-05'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await adminApi.delete(`/content/categories/${categoryId}`)
        setCategories(categories.filter(cat => cat.id !== categoryId))
      } catch (error) {
        console.error('Failed to delete category:', error)
      }
    }
  }

  return (
    <AdminLayout>
      <CategoriesHeader>
        <PageTitle>Categories ({categories.length})</PageTitle>
        <NewCategoryButton>New Category</NewCategoryButton>
      </CategoriesHeader>

      <CategoriesContainer>
        <CategoriesList>
          {categories.map(category => (
            <CategoryItem key={category.id}>
              <CategoryInfo>
                <CategoryName>{category.name}</CategoryName>
                <CategoryMeta>
                  {category.postCount} posts • Created {new Date(category.createdAt).toLocaleDateString()}
                </CategoryMeta>
              </CategoryInfo>
              <CategoryActions>
                <ActionButton className="edit">Edit</ActionButton>
                <ActionButton 
                  className="delete"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  Delete
                </ActionButton>
              </CategoryActions>
            </CategoryItem>
          ))}
        </CategoriesList>
      </CategoriesContainer>
    </AdminLayout>
  )
}

export default CategoriesPage 