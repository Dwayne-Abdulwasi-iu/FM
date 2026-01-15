'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  User,
} from 'lucide-react';

interface Designer {
  id: string;
  name: string;
  displayName: string | null;
  image: string | null;
  isVerified: boolean;
  acceptsCommissions?: boolean;
  commissionStatus?: string;
  commissionMinBudget?: number | null;
  commissionMaxBudget?: number | null;
  commissionTurnaround?: string | null;
  _count: {
    designs: number;
  };
}

interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface ReferenceDesign {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  designerId: string;
}

function CommissionRequestContent() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDesignerId = searchParams.get('designer');
  const preselectedDesignId = searchParams.get('design');

  const [step, setStep] = useState(preselectedDesignerId ? 2 : 1);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [referenceDesign, setReferenceDesign] = useState<ReferenceDesign | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Physical commission fields
  const [isPhysical, setIsPhysical] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  });

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/commission-request');
    }
  }, [status, router]);

  // Fetch designers - only show those accepting commissions
  const fetchDesigners = useCallback(async () => {
    setLoading(true);
    try {
      const baseUrl = '/api/users?designers=true&acceptingCommissions=true&limit=20';
      const url = searchQuery
        ? `${baseUrl}&search=${encodeURIComponent(searchQuery)}`
        : baseUrl;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDesigners(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch designers:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchDesigners();
  }, [fetchDesigners]);

  // Load preselected designer
  useEffect(() => {
    if (preselectedDesignerId) {
      fetch(`/api/users/${preselectedDesignerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            // Check if designer accepts commissions
            if (!data.user.acceptsCommissions) {
              setError('This designer is not currently accepting commission requests.');
              return;
            }
            
            if (data.user.commissionStatus !== 'OPEN') {
              setError(`This designer is currently ${data.user.commissionStatus === 'BUSY' ? 'busy with other commissions' : 'not accepting commissions'}.`);
              return;
            }
            
            setSelectedDesigner({
              id: data.user.id,
              name: data.user.name,
              displayName: data.user.displayName,
              image: data.user.image,
              isVerified: data.user.isVerified,
              acceptsCommissions: data.user.acceptsCommissions,
              commissionStatus: data.user.commissionStatus,
              commissionMinBudget: data.user.commissionMinBudget,
              commissionMaxBudget: data.user.commissionMaxBudget,
              commissionTurnaround: data.user.commissionTurnaround,
              _count: { designs: data.user._count?.designs || 0 },
            });
            setStep(2);
          }
        })
        .catch(console.error);
    }
  }, [preselectedDesignerId]);

  // Load reference design and auto-populate form
  useEffect(() => {
    if (preselectedDesignId) {
      fetch(`/api/designs/${preselectedDesignId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Design not found');
          }
          return res.json();
        })
        .then((data) => {
          if (data.design) {
            const design = data.design;
            
            // Check if designer accepts commissions
            if (!design.designer.acceptsCommissions) {
              setError('This designer is not currently accepting commission requests.');
              return;
            }
            
            if (design.designer.commissionStatus !== 'OPEN') {
              setError(`This designer is currently ${design.designer.commissionStatus === 'BUSY' ? 'busy with other commissions' : 'not accepting commissions'}.`);
              return;
            }
            
            setReferenceDesign({
              id: design.id,
              title: design.title,
              imageUrl: design.imageUrl || design.thumbnailUrl,
              price: design.price,
              designerId: design.designer.id,
            });
            
            // Auto-populate title with reference to the design
            setTitle(`Custom commission based on: ${design.title}`);
            
            // Set the designer from the design
            if (design.designer) {
              setSelectedDesigner({
                id: design.designer.id,
                name: design.designer.name,
                displayName: design.designer.displayName || design.designer.name,
                image: design.designer.image,
                isVerified: design.designer.isVerified || false,
                acceptsCommissions: design.designer.acceptsCommissions,
                commissionStatus: design.designer.commissionStatus,
                commissionMinBudget: design.designer.commissionMinBudget,
                commissionMaxBudget: design.designer.commissionMaxBudget,
                commissionTurnaround: design.designer.commissionTurnaround,
                _count: { designs: 0 },
              });
              setStep(2);
            }
            
            // Set category if available
            if (design.category) {
              setCategory(design.category);
            }
          } else {
            // Design not found in response
            setError('The design you referenced could not be found. You can still create a commission request.');
          }
        })
        .catch((err) => {
          console.error('Failed to load reference design:', err);
          setError('The design you referenced could not be found. You can still create a commission request.');
        });
    }
  }, [preselectedDesignId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'commission-requests');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newAttachments.push({
            url: data.url,
            type: file.type,
            name: file.name,
            size: file.size,
          });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setAttachments([...attachments, ...newAttachments]);
    setUploading(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesigner || !title || !description) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate delivery address for physical commissions
    if (isPhysical) {
      if (!deliveryAddress.name || !deliveryAddress.phone || !deliveryAddress.address || 
          !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.country) {
        setError('Please fill in all delivery address fields for physical commissions');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/commission-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designerId: selectedDesigner.id,
          designerName: selectedDesigner.displayName || selectedDesigner.name,
          designerPageUrl: `/designers/${selectedDesigner.id}`,
          title,
          description,
          category,
          budget,
          deadline,
          attachments,
          isPhysical,
          deliveryAddress: isPhysical ? deliveryAddress : null,
          // Reference design info
          referenceDesignId: referenceDesign?.id || null,
          referenceDesignUrl: referenceDesign ? `/designs/${referenceDesign.id}` : null,
          referenceDesignTitle: referenceDesign?.title || null,
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit request');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Your commission request has been sent to our admin team. We&apos;ll review it and
            forward it to the designer. You&apos;ll receive an email update soon.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/commissions"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              View My Requests
            </Link>
            <Link
              href="/designers"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Browse Designers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Commission Request</h1>
          <p className="text-gray-600 mt-2">
            Request a custom design from your favorite designer
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              1
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">Select Designer</span>
          </div>
          <div className="w-16 h-1 mx-4 bg-gray-200">
            <div
              className={`h-full transition-all ${step >= 2 ? 'bg-indigo-600 w-full' : 'w-0'}`}
            />
          </div>
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              2
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">Request Details</span>
          </div>
        </div>

        {/* Step 1: Select Designer */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose a Designer</h2>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search designers by name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Designers List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : designers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No designers found. Try a different search.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {designers.map((designer) => (
                  <button
                    key={designer.id}
                    onClick={() => {
                      setSelectedDesigner(designer);
                      setStep(2);
                    }}
                    className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {designer.image ? (
                        <Image
                          src={designer.image}
                          alt={designer.displayName || designer.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {designer.displayName || designer.name}
                        </span>
                        {designer.isVerified && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {designer._count.designs} designs
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Request Details */}
        {step === 2 && selectedDesigner && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
            {/* Selected Designer */}
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-lg mb-6">
              <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                {selectedDesigner.image ? (
                  <Image
                    src={selectedDesigner.image}
                    alt={selectedDesigner.displayName || selectedDesigner.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-indigo-600 font-medium">Requesting commission from</p>
                <p className="font-semibold text-gray-900">
                  {selectedDesigner.displayName || selectedDesigner.name}
                </p>
                {/* Designer's commission settings */}
                {(selectedDesigner.commissionMinBudget || selectedDesigner.commissionMaxBudget || selectedDesigner.commissionTurnaround) && (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {(selectedDesigner.commissionMinBudget || selectedDesigner.commissionMaxBudget) && (
                      <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        💰 {selectedDesigner.commissionMinBudget && selectedDesigner.commissionMaxBudget
                          ? `$${selectedDesigner.commissionMinBudget} - $${selectedDesigner.commissionMaxBudget}`
                          : selectedDesigner.commissionMinBudget
                            ? `Min $${selectedDesigner.commissionMinBudget}`
                            : `Max $${selectedDesigner.commissionMaxBudget}`}
                      </span>
                    )}
                    {selectedDesigner.commissionTurnaround && (
                      <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        ⏱️ {selectedDesigner.commissionTurnaround}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Change
              </button>
            </div>

            {/* Reference Design Preview */}
            {referenceDesign && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-6">
                <div className="flex items-start gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    {referenceDesign.imageUrl ? (
                      <Image
                        src={referenceDesign.imageUrl}
                        alt={referenceDesign.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-purple-600 font-medium">Commission based on</p>
                    <p className="font-semibold text-gray-900 truncate">{referenceDesign.title}</p>
                    <Link
                      href={`/designs/${referenceDesign.id}`}
                      target="_blank"
                      className="text-sm text-purple-600 hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      View original design <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceDesign(null);
                      // Only clear title if it's still the auto-generated one
                      if (referenceDesign && title === `Custom commission based on: ${referenceDesign.title}`) {
                        setTitle('');
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    title="Remove reference"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-purple-700">
                  The designer will see this design as the inspiration for your custom commission request.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Custom Evening Gown Design"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project in detail. Include style preferences, colors, materials, inspiration, etc."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="commission-category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="commission-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  <option value="Fashion Illustration">Fashion Illustration</option>
                  <option value="Pattern Design">Pattern Design</option>
                  <option value="Technical Drawing">Technical Drawing</option>
                  <option value="Digital Design">Digital Design</option>
                  <option value="Sketches">Sketches</option>
                  <option value="Custom Clothing">Custom Clothing</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Budget & Deadline */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range
                    {selectedDesigner.commissionMinBudget && (
                      <span className="text-indigo-600 ml-1">
                        (Min: ${selectedDesigner.commissionMinBudget})
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={selectedDesigner.commissionMinBudget 
                      ? `e.g., $${selectedDesigner.commissionMinBudget}-$${(selectedDesigner.commissionMaxBudget || selectedDesigner.commissionMinBudget * 3)}`
                      : "e.g., $100-$300"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {selectedDesigner.commissionMinBudget && (
                    <p className="mt-1 text-xs text-amber-600">
                      ⚠️ This designer&apos;s minimum budget is ${selectedDesigner.commissionMinBudget}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Deadline
                    {selectedDesigner.commissionTurnaround && (
                      <span className="text-indigo-600 ml-1">
                        (Est: {selectedDesigner.commissionTurnaround})
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    placeholder={selectedDesigner.commissionTurnaround 
                      ? `Designer's estimated turnaround: ${selectedDesigner.commissionTurnaround}`
                      : "e.g., 2 weeks, By March 15"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Physical vs Digital Commission */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPhysical}
                    onChange={(e) => setIsPhysical(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Physical Item Commission</span>
                    <p className="text-sm text-gray-500">
                      Check this if you&apos;re requesting a physical item (clothing, accessories, etc.) that needs to be delivered to you
                    </p>
                  </div>
                </label>
              </div>

              {/* Delivery Address (only for physical commissions) */}
              {isPhysical && (
                <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Delivery Address
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    The completed item will be collected by our team from the designer and delivered to this address.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.name}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, name: e.target.value})}
                        placeholder="Recipient name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={deliveryAddress.phone}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                        placeholder="+1 234 567 8900"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.address}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, address: e.target.value})}
                      placeholder="123 Main Street, Apt 4B"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.city}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                        placeholder="City"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.state}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                        placeholder="State"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.country}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, country: e.target.value})}
                        placeholder="Country"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.postalCode}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, postalCode: e.target.value})}
                        placeholder="12345"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Files
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Upload images, videos, documents, or any reference files to help the designer
                  understand your vision.
                </p>

                {/* Upload Area */}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        Images, videos, PDFs, documents up to 50MB
                      </span>
                    </>
                  )}
                </label>

                {/* Uploaded Files */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="text-gray-500">{getFileIcon(file.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          aria-label={`Remove attachment ${file.name}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !title || !description}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Commission Request'
                )}
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-500 text-center">
              Your request will be reviewed by our team and forwarded to the designer.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CommissionRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <CommissionRequestContent />
    </Suspense>
  );
}
