import React, { useState, useEffect } from 'react';
import { ISite, ICMS } from '../../types/sites';

interface NewSiteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: ISite) => void;
  initialData?: ISite | null;
}

const CMS_OPTIONS: ICMS[] = [
  { id: 1, name: 'Drupal', version: '' },
  { id: 2, name: 'WordPress', version: '' },
  { id: 3, name: 'Joomla', version: '' },
];

const NewSiteForm: React.FC<NewSiteFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<ISite>({
    id: Date.now(),
    user_id: 1,
    cms: CMS_OPTIONS[0],
    site_name: '',
    site_url: '', // Initialize with empty string
    description: '',
    mysql_file_url: undefined,
    status: 'active',
    is_active: true,
    company_id: undefined,
    migration_ids: undefined,
    tags: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: Date.now(),
        user_id: 1,
        cms: CMS_OPTIONS[0],
        site_name: '',
        site_url: '', // Reset to empty string
        description: '',
        mysql_file_url: undefined,
        status: 'active',
        is_active: true,
        company_id: undefined,
        migration_ids: undefined,
        tags: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }, [initialData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFormData({ 
        ...formData, 
        mysql_file_url: URL.createObjectURL(file) 
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      updated_at: new Date().toISOString()
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-[#2D3748] w-96 h-full p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Site' : 'Add New Site'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Site Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Site Name *</label>
            <input
              type="text"
              value={formData.site_name}
              onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
              className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
              required
            />
          </div>

          {/* Site URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Site URL *</label>
            <input
              type="url"
              value={formData.site_url}
              onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
              placeholder="https://example.com"
              className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
              required
            />
          </div>

          {/* CMS Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">CMS Type *</label>
            <select
              value={formData.cms.name}
              onChange={(e) => {
                const selected = CMS_OPTIONS.find(opt => opt.name === e.target.value) || CMS_OPTIONS[0];
                setFormData({ ...formData, cms: selected });
              }}
              className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
              required
            >
              {CMS_OPTIONS.map((cms) => (
                <option key={cms.id} value={cms.name}>
                  {cms.name}
                </option>
              ))}
            </select>
          </div>

          {/* Version */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Version</label>
            <input
              type="text"
              value={formData.cms.version || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                cms: { ...formData.cms, version: e.target.value } 
              })}
              placeholder="e.g. 7.0, 5.8.2"
              className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Description <span className="text-gray-400 text-xs">(Max 100 chars)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={100}
              className="w-full bg-[#1A202C] border border-gray-600 rounded-md p-2 h-20"
            />
          </div>

          {/* MySQL File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">MySQL Database File</label>
            <div className="border-2 border-dashed border-gray-600 rounded-md p-6 text-center">
              <input
                type="file"
                id="mysql-upload"
                accept=".sql,.gz"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="mysql-upload" className="cursor-pointer">
                {formData.mysql_file_url ? (
                  <span className="text-green-400">File selected ✓</span>
                ) : (
                  <>
                    <p>Drag & drop SQL file here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {initialData ? 'Update Site' : 'Save Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSiteForm;