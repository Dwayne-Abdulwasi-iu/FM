'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, FileText, Eye, Copy, Check, Plus, Trash2, Archive, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface DocumentInfo {
  id: 'moa' | 'aoa' | 'shareholder_agreement' | 'employment_contract' | 'designer_ownership' | 'designer_premium' | 'designer_workforhire'
  title: string
  description: string
  longDescription: string
  icon: React.ReactNode
  importance: 'critical' | 'important' | 'reference'
  category?: 'corporate' | 'designer'
}

interface DocumentVersion {
  id: string
  documentType: string
  documentName: string
  versionNumber: number
  status: string
  approvalStatus: string
  createdAt: string
  createdBy: { id: string; email: string; name: string | null }
  approvedAt?: string | null
  downloads: number
  lastAccessedAt?: string | null
}

const DOCUMENTS: DocumentInfo[] = [
  {
    id: 'moa',
    title: 'Memorandum of Association',
    description: 'Defines the company\'s name, objects, and authorized capital',
    longDescription: 'The Memorandum of Association (MOA) is the founding document of your company. It specifies your company\'s name, primary objectives, authorized share capital, and liability of members. This document is essential for company registration and defines the external constitution of your company.',
    icon: <FileText className="w-6 h-6" />,
    importance: 'critical',
    category: 'corporate'
  },
  {
    id: 'aoa',
    title: 'Articles of Association',
    description: 'Governs internal management, shares, and operations',
    longDescription: 'The Articles of Association (AOA) is the internal constitution of your company. It covers share capital, member rights, general meetings, board of directors, staff employment, financial management, and operational procedures. This document provides the framework for how your company operates.',
    icon: <FileText className="w-6 h-6" />,
    importance: 'critical',
    category: 'corporate'
  },
  {
    id: 'shareholder_agreement',
    title: 'Shareholder Agreement',
    description: 'Governs share transfers, investor protections, and dispute resolution',
    longDescription: 'The Shareholder Agreement is a comprehensive contract between shareholders covering share transfers, voting rights, drag-along/tag-along rights, deadlock resolution, valuation mechanisms, and future partnerships. Essential for protecting shareholder interests and managing ownership transitions.',
    icon: <FileText className="w-6 h-6" />,
    importance: 'important',
    category: 'corporate'
  },
  {
    id: 'employment_contract',
    title: 'Employment Contract Template',
    description: 'Template for employment agreements with all legal requirements',
    longDescription: 'Professional employment contract template covering compensation, benefits, working hours, leave entitlements, confidentiality, intellectual property, termination procedures, and statutory compliance. Customizable for different employee roles and requirements.',
    icon: <FileText className="w-6 h-6" />,
    importance: 'important',
    category: 'corporate'
  },
  {
    id: 'designer_ownership',
    title: 'Design Ownership Purchase Agreement',
    description: 'Platform purchases exclusive copyright ownership of designs',
    longDescription: 'Agreement for purchasing full copyright ownership of designs from designers. Platform acquires all rights to sell, modify, and distribute designs worldwide in perpetuity. Includes warranties, non-compete clauses, and indemnification terms. Best for bulk library building.',
    icon: <FileText className="w-6 h-6" />,
    importance: 'critical',
    category: 'designer'
  },
  {
    id: 'designer_premium',
    title: 'Premium Creator Partnership (3 Designs/Month)',
    description: 'Exclusive 12-month partnership with monthly retainer or revenue share',
    longDescription: 'Long-term exclusive partnership where designer commits to 3 original designs per month for 12 months. Platform gets exclusive rights for 90 days, then non-exclusive perpetual license. Designer receives monthly retainer or 60% revenue share (whichever is higher) plus premium benefits including featured badge, priority support, and co-marketing opportunities.',
    icon: <FileText className="w-6 h-6" />,
    importance: 'critical',
    category: 'designer'
  },
  {
    id: 'designer_workforhire',
    title: 'Work-For-Hire Commission Agreement',
    description: 'Platform commissions specific designs with design briefs',
    longDescription: 'Agreement for platform-initiated design commissions. Designer creates specific design(s) based on platform brief and receives one-time payment. Platform owns 100% copyright and has exclusive distribution rights for 24 months. Includes NDA clause (₦1M/₦10K penalty for breach), revision limits, and timeline requirements.',
    icon: <FileText className="w-6 h-6" />,
    importance: 'important',
    category: 'designer'
  }
]

export default function DocumentsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null)

  // Fetch document versions on component mount
  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    setLoadingVersions(true)
    try {
      const response = await fetch('/api/admin/documents')
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoadingVersions(false)
    }
  }

  const createNewVersion = async (docType: string) => {
    try {
      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          notes: `Created new version of ${docType}`
        })
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchVersions()
      } else {
        toast.error('Failed to create version')
      }
    } catch (error) {
      console.error('Error creating version:', error)
      toast.error('Error creating version')
    }
  }

  const approveVersion = async (versionId: string) => {
    try {
      const response = await fetch('/api/admin/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          action: 'approve'
        })
      })
      if (response.ok) {
        toast.success('Version approved')
        fetchVersions()
      } else {
        toast.error('Failed to approve version')
      }
    } catch (error) {
      console.error('Error approving version:', error)
      toast.error('Error approving version')
    }
  }

  const archiveVersion = async (versionId: string) => {
    try {
      const response = await fetch('/api/admin/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: versionId })
      })
      if (response.ok) {
        toast.success('Version archived')
        fetchVersions()
      } else {
        toast.error('Failed to archive version')
      }
    } catch (error) {
      console.error('Error archiving version:', error)
      toast.error('Error archiving version')
    }
  }

  const handleDownload = async (type: 'moa' | 'aoa' | 'shareholder_agreement' | 'employment_contract' | 'designer_ownership' | 'designer_premium' | 'designer_workforhire', format: 'txt' | 'json' | 'html') => {
    setDownloading(`${type}-${format}`)
    try {
      const response = await fetch(`/api/documents/download?type=${type}&format=${format}`)
      
      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const fileNames: Record<string, string> = {
        'moa': 'Memorandum_of_Association',
        'aoa': 'Articles_of_Association',
        'shareholder_agreement': 'Shareholder_Agreement',
        'employment_contract': 'Employment_Contract',
        'designer_ownership': 'Design_Ownership_Purchase_Agreement',
        'designer_premium': 'Premium_Creator_Partnership_Agreement',
        'designer_workforhire': 'Work_For_Hire_Commission_Agreement'
      }
      
      const fileName = fileNames[type] || 'Document'
      a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Downloaded as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download document')
    } finally {
      setDownloading(null)
    }
  }

  const handleView = (type: 'moa' | 'aoa' | 'shareholder_agreement' | 'employment_contract' | 'designer_ownership' | 'designer_premium' | 'designer_workforhire') => {
    window.open(`/api/documents/download?type=${type}&format=html`, '_blank')
  }

  const handleCopyInfo = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8" />
            <h1 className="text-3xl sm:text-4xl font-bold">Company Documents</h1>
          </div>
          <p className="text-indigo-100 text-lg">
            Download and manage your company's foundational legal documents
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Important Notice */}
        <div className="mb-8 p-6 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">⚠️ Important Notice</h3>
          <p className="text-amber-800 mb-3">
            These documents are templates that must be customized with your specific information:
          </p>
          <ul className="text-amber-800 space-y-2 ml-4 list-disc">
            <li>Replace all [INSERT ...] placeholders with your actual company details</li>
            <li>Have all documents reviewed by a qualified attorney in your jurisdiction</li>
            <li>Ensure compliance with local company law and regulations</li>
            <li>Register the approved documents with your corporate authority</li>
            <li>Keep certified copies for your company records</li>
          </ul>
        </div>

        {/* Corporate Documents Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Corporate Documents</h3>
            <p className="text-gray-600">Foundational company and legal documents</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {DOCUMENTS.filter(doc => doc.category === 'corporate').map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                {/* Card Header */}
                <div className={`p-6 bg-gradient-to-r ${
                  doc.importance === 'critical' 
                    ? 'from-red-500 to-pink-500' 
                    : 'from-blue-500 to-indigo-500'
                } text-white`}>
                  <div className="flex items-center gap-3 mb-3">
                    {doc.icon}
                    <span className="px-2 py-1 bg-white/20 rounded text-xs font-semibold">
                      {doc.importance.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{doc.title}</h2>
                  <p className="text-white/90">{doc.description}</p>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {doc.longDescription}
                  </p>

                  {/* Download Options */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Download Options:</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {['txt', 'json', 'html'].map((format) => (
                        <button
                          key={format}
                          onClick={() => handleDownload(doc.id as any, format as 'txt' | 'json' | 'html')}
                          disabled={downloading === `${doc.id}-${format}`}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-xs">{format.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(doc.id as any)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleCopyInfo(doc.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      {copied === doc.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Designer Contracts Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Designer Contracts</h3>
            <p className="text-gray-600">Agreements for recruiting and partnering with designers. Designers choose which contract model suits their needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOCUMENTS.filter(doc => doc.category === 'designer').map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border-t-4 border-purple-600">
                {/* Card Header */}
                <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    {doc.icon}
                    <span className="px-2 py-1 bg-white/20 rounded text-xs font-semibold">
                      {doc.importance.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold mb-2">{doc.title}</h2>
                  <p className="text-white/90 text-sm">{doc.description}</p>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <p className="text-gray-700 text-sm mb-6 leading-relaxed">
                    {doc.longDescription}
                  </p>

                  {/* Download Options */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Download Options:</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {['txt', 'json', 'html'].map((format) => (
                        <button
                          key={format}
                          onClick={() => handleDownload(doc.id as any, format as 'txt' | 'json' | 'html')}
                          disabled={downloading === `${doc.id}-${format}`}
                          className="flex items-center justify-center gap-1 px-2 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        >
                          <Download className="w-3 h-3" />
                          <span className="hidden sm:inline">{format.toUpperCase()}</span>
                          <span className="sm:hidden">{format.slice(0, 1).toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(doc.id as any)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleCopyInfo(doc.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                    >
                      {copied === doc.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">How to Use These Documents</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Step-by-Step Guide</h4>
              <ol className="space-y-4">
                {[
                  {
                    title: 'Download the Template',
                    desc: 'Download both the MOA and AOA in your preferred format (TXT, JSON, or HTML)'
                  },
                  {
                    title: 'Customize the Documents',
                    desc: 'Replace all [INSERT ...] placeholders with your actual company information'
                  },
                  {
                    title: 'Legal Review',
                    desc: 'Have the customized documents reviewed by a qualified attorney in your jurisdiction'
                  },
                  {
                    title: 'Board Approval',
                    desc: 'Get the documents approved by your board of directors or as an initial subscriber'
                  },
                  {
                    title: 'Registration',
                    desc: 'Submit the documents to your corporate authority for official registration'
                  },
                  {
                    title: 'Maintain Records',
                    desc: 'Keep certified copies in your company\'s official records'
                  }
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">{step.title}</h5>
                      <p className="text-gray-600 text-sm mt-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </ol>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Sections Included</h4>
              <ul className="space-y-3">
                {[
                  { title: 'Company Details', items: ['Name, registered office, business objects'] },
                  { title: 'Share Capital', items: ['Authorized capital, share types, restrictions'] },
                  { title: 'Membership', items: ['Member rights, transfers, pre-emption rights'] },
                  { title: 'Governance', items: ['Directors, general meetings, voting rights'] },
                  { title: 'Staff Management', items: ['Employment authority, compensation policy'] },
                  { title: 'Financial Controls', items: ['Accounts, dividends, borrowing authority'] },
                  { title: 'Future Flexibility', items: ['Partnership terms, share valuation framework'] }
                ].map((section, idx) => (
                  <div key={idx} className="border-l-2 border-indigo-200 pl-4">
                    <h5 className="font-semibold text-gray-900">{section.title}</h5>
                    {section.items.map((item, i) => (
                      <p key={i} className="text-sm text-gray-600">{item}</p>
                    ))}
                  </div>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="font-semibold text-gray-900 mb-3">Professional Recommendation</h4>
            <p className="text-gray-700 mb-4">
              While these templates provide a solid foundation, it is <strong>strongly recommended</strong> that you consult 
              with a qualified corporate attorney in your jurisdiction to ensure these documents fully comply with local laws 
              and regulations specific to your business.
            </p>
            <p className="text-sm text-gray-600">
              The documents are customizable and include provisions for:
            </p>
            <ul className="text-sm text-gray-600 mt-2 ml-4 space-y-1 list-disc">
              <li>Current sole proprietorship management</li>
              <li>Future partnership or multi-shareholder scenarios</li>
              <li>Staff hiring and compensation frameworks</li>
              <li>Share transfer and valuation mechanisms</li>
              <li>Shareholder agreement provisions</li>
            </ul>
          </div>
        </div>

        {/* Document Versioning Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">Document Versions & Management</h3>
            <div className="flex gap-2">
              {['MOA', 'AOA', 'SHAREHOLDER_AGREEMENT', 'EMPLOYMENT_CONTRACT'].map((type) => (
                <button
                  key={type}
                  onClick={() => createNewVersion(type)}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {loadingVersions ? (
            <div className="text-center py-8 text-gray-500">
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No document versions yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div key={version.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{version.documentName}</h4>
                      <p className="text-sm text-gray-600">Version {version.versionNumber} • Created {new Date(version.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        version.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        version.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {version.status}
                      </span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        version.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        version.approvalStatus === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {version.approvalStatus}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p>Created by: {version.createdBy.name || version.createdBy.email}</p>
                    {version.approvedAt && <p>Approved: {new Date(version.approvedAt).toLocaleDateString()}</p>}
                    <p>Downloads: {version.downloads} • Last accessed: {version.lastAccessedAt ? new Date(version.lastAccessedAt).toLocaleDateString() : 'Never'}</p>
                  </div>

                  <div className="flex gap-2">
                    {version.approvalStatus === 'PENDING' && (
                      <button
                        onClick={() => approveVersion(version.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => archiveVersion(version.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
                    >
                      <Archive className="w-4 h-4" />
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Resources */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Additional Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">What You'll Need to Prepare</h4>
              <ul className="text-sm text-blue-800 space-y-2 ml-4 list-disc">
                <li>Company registration number</li>
                <li>Registered office address</li>
                <li>Current ownership and shareholding details</li>
                <li>Director/officer information</li>
                <li>Business activities description</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">File Format Guide</h4>
              <ul className="text-sm text-blue-800 space-y-2 ml-4 list-disc">
                <li><strong>TXT:</strong> Plain text, easy to edit in any editor</li>
                <li><strong>JSON:</strong> Structured data format, good for systems</li>
                <li><strong>HTML:</strong> Formatted for web viewing and printing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


