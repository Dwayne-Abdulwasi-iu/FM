'use client'

import { useState, useEffect, type ComponentType, type SVGProps } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  Search,
  Filter,
  Palette,
  Ruler,
  Scissors,
  Brush,
  Camera,
  Monitor,
  FileText,
  Video,
  Link as LinkIcon,
  Star,
  Clock,
  Users,
  TrendingUp,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
  Heart,
  Eye,
  ChevronRight
} from 'lucide-react'

interface Resource {
  id: string
  title: string
  description: string
  type: 'guide' | 'template' | 'tool' | 'tutorial' | 'reference' | 'inspiration'
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  format: 'pdf' | 'video' | 'web' | 'download' | 'article'
  url?: string
  downloadUrl?: string
  thumbnail: string
  duration?: string
  rating: number
  views: number
  featured: boolean
  tags: string
}

interface ResourceCategory {
  id: string
  title: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
  count: number
}

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResources()
  }, [selectedCategory, selectedType, selectedDifficulty])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty)

      const response = await fetch(`/api/admin/resources?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setResources(data.resources || [])
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error)
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  const getCategoryCount = (categoryId: string) => {
    return resources.filter(resource => resource.category === categoryId).length
  }

  const categories: ResourceCategory[] = [
    {
      id: 'design-fundamentals',
      title: 'Design Fundamentals',
      description: 'Basic principles of fashion design',
      icon: Brush,
      color: 'from-pink-500 to-rose-500',
      count: getCategoryCount('design-fundamentals')
    },
    {
      id: 'color-theory',
      title: 'Color Theory',
      description: 'Understanding color in fashion',
      icon: Palette,
      color: 'from-purple-500 to-indigo-500',
      count: getCategoryCount('color-theory')
    },
    {
      id: 'technical-drawing',
      title: 'Technical Drawing',
      description: 'Fashion illustration and flats',
      icon: Ruler,
      color: 'from-blue-500 to-cyan-500',
      count: getCategoryCount('technical-drawing')
    },
    {
      id: 'pattern-making',
      title: 'Pattern Making',
      description: 'Creating and modifying patterns',
      icon: Scissors,
      color: 'from-green-500 to-emerald-500',
      count: getCategoryCount('pattern-making')
    },
    {
      id: 'digital-tools',
      title: 'Digital Tools',
      description: 'Software and digital design',
      icon: Monitor,
      color: 'from-orange-500 to-red-500',
      count: getCategoryCount('digital-tools')
    },
    {
      id: 'photography',
      title: 'Fashion Photography',
      description: 'Capturing your designs',
      icon: Camera,
      color: 'from-yellow-500 to-orange-500',
      count: getCategoryCount('photography')
    }
  ]

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
    const matchesType = selectedType === 'all' || resource.type === selectedType
    const matchesDifficulty = selectedDifficulty === 'all' || resource.difficulty === selectedDifficulty
    
    return matchesSearch && matchesCategory && matchesType && matchesDifficulty
  })

  const featuredResources = resources.filter(resource => resource.featured)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return FileText
      case 'template': return Download
      case 'tool': return Monitor
      case 'tutorial': return Video
      case 'reference': return BookOpen
      case 'inspiration': return Heart
      default: return FileText
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return FileText
      case 'video': return Video
      case 'web': return Globe
      case 'download': return Download
      case 'article': return BookOpen
      default: return FileText
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="h-12 w-12 text-indigo-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">Design Resources</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover tools, guides, templates, and tutorials to enhance your fashion design skills and workflow
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  title="Filter by category"
                  aria-label="Filter resources by category"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                  ))}
                </select>
                
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  title="Filter by resource type"
                  aria-label="Filter resources by type"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="guide">Guides</option>
                  <option value="template">Templates</option>
                  <option value="tool">Tools</option>
                  <option value="tutorial">Tutorials</option>
                  <option value="reference">References</option>
                  <option value="inspiration">Inspiration</option>
                </select>
                
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  title="Filter by difficulty level"
                  aria-label="Filter resources by difficulty level"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Resources */}
        {searchQuery === '' && selectedCategory === 'all' && selectedType === 'all' && selectedDifficulty === 'all' && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Star className="h-6 w-6 text-yellow-500 mr-2" />
              Featured Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredResources.map((resource) => {
                const TypeIcon = getTypeIcon(resource.type)
                const FormatIcon = getFormatIcon(resource.format)
                
                return (
                  <div key={resource.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                    <div className="aspect-video bg-gray-200 rounded-t-lg relative overflow-hidden">
                      <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty)}`}>
                          {resource.difficulty}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center">
                          <FormatIcon className="h-3 w-3 mr-1" />
                          {resource.format}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center mb-2">
                        <TypeIcon className="h-4 w-4 text-indigo-600 mr-2" />
                        <span className="text-sm text-indigo-600 font-medium capitalize">{resource.type}</span>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {resource.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {resource.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {resource.views.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          {resource.rating}
                        </div>
                        {resource.duration && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {resource.duration}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {resource.downloadUrl ? (
                          <a
                            href={resource.downloadUrl}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        ) : resource.url ? (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </a>
                        ) : (
                          <button className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
                            Coming Soon
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Categories Overview */}
        {searchQuery === '' && selectedCategory === 'all' && selectedType === 'all' && selectedDifficulty === 'all' && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const IconComponent = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-left group"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mb-4`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {category.count} resources
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* All Resources */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedCategory !== 'all' 
                ? categories.find(cat => cat.id === selectedCategory)?.title || 'Resources'
                : 'All Resources'
              }
            </h2>
            <span className="text-gray-600">
              {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const TypeIcon = getTypeIcon(resource.type)
              const FormatIcon = getFormatIcon(resource.format)
              
              return (
                <div key={resource.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                  <div className="aspect-video bg-gray-200 rounded-t-lg relative overflow-hidden">
                    <img
                      src={resource.thumbnail}
                      alt={resource.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty)}`}>
                        {resource.difficulty}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center">
                        <FormatIcon className="h-3 w-3 mr-1" />
                        {resource.format}
                      </div>
                    </div>
                    {resource.featured && (
                      <div className="absolute bottom-2 left-2">
                        <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center mb-2">
                      <TypeIcon className="h-4 w-4 text-indigo-600 mr-2" />
                      <span className="text-sm text-indigo-600 font-medium capitalize">{resource.type}</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {resource.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {resource.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {resource.views.toLocaleString()}
                      </div>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        {resource.rating}
                      </div>
                      {resource.duration && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {resource.duration}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {resource.downloadUrl ? (
                        <a
                          href={resource.downloadUrl}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      ) : resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </a>
                      ) : (
                        <button className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
                          Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty State */}
          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or browse different categories
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedType('all')
                  setSelectedDifficulty('all')
                }}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-8">
          <TrendingUp className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Have a resource to share?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Help the community grow by suggesting valuable resources, tools, or tutorials that have helped you in your design journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/contact"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              <LinkIcon className="h-5 w-5 mr-2" />
              Suggest Resource
            </Link>
            <Link 
              href="/help"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Need Help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}