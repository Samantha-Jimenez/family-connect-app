'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { getUserData } from '@/hooks/dynamoDB';
import Select from 'react-select';
import emailjs from '@emailjs/browser';
import { isDemoUser } from '@/utils/demoConfig';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubjectOption {
  value: string;
  label: string;
}

// Helper function to get the preferred display name
const getDisplayName = (userData: {
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
  use_first_name: boolean;
  use_middle_name: boolean;
  use_nick_name: boolean;
}): string => {
  let preferredFirstName = userData.first_name;
  if (userData.use_nick_name && userData.nick_name && userData.nick_name.trim() !== '') {
    preferredFirstName = userData.nick_name;
  } else if (userData.use_middle_name && userData.middle_name && userData.middle_name.trim() !== '') {
    preferredFirstName = userData.middle_name;
  }
  return `${preferredFirstName} ${userData.last_name}`;
};

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { user } = useAuthenticator();
  const [formData, setFormData] = useState({
    name: '',
    preferredContactMethod: '' as 'email' | 'text' | '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [savedPhone, setSavedPhone] = useState<string>('');
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<SubjectOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingName, setIsLoadingName] = useState(false);

  // Initialize EmailJS
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    if (publicKey) {
      emailjs.init({
        publicKey,
      });
    } else {
      console.error('EmailJS public key is not configured');
    }
  }, []);

  const subjectOptions: SubjectOption[] = [
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'add-information', label: 'Request to Add Information' },
    { value: 'update-information', label: 'Request to Update Information' },
    { value: 'bug-report', label: 'Bug Report' },
    { value: 'other', label: 'Other' },
  ];

  // Clear form data when modal closes for demo users
  useEffect(() => {
    if (!isOpen && user?.userId && isDemoUser(user.userId)) {
      // Clear all form data for demo users when modal closes
      setFormData({
        name: '',
        preferredContactMethod: '' as 'email' | 'text' | '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
      setSavedEmail('');
      setSavedPhone('');
      setSelectedSubjectOption(null);
    }
  }, [isOpen, user?.userId]);

  // Fetch logged-in user's name and contact info when modal opens
  useEffect(() => {
    if (isOpen && user?.userId) {
      // Skip loading user info for demo users - they should fill in their own info
      if (isDemoUser(user.userId)) {
        setIsLoadingName(false);
        // Ensure form is cleared when opening for demo users
        setFormData({
          name: '',
          preferredContactMethod: '' as 'email' | 'text' | '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
        setSavedEmail('');
        setSavedPhone('');
        setSelectedSubjectOption(null);
        return;
      }

      const loadUserInfo = async () => {
        try {
          setIsLoadingName(true);
          const userData = await getUserData(user.userId);
          if (userData) {
            const displayName = getDisplayName(userData);
            setFormData(prev => ({
              ...prev,
              name: displayName,
            }));
            
            // Store saved email and phone
            setSavedEmail(userData.email || '');
            setSavedPhone(userData.phone_number || '');
          }
        } catch (error) {
          console.error('Error loading user information:', error);
          showToast('Failed to load user information', 'error');
        } finally {
          setIsLoadingName(false);
        }
      };
      loadUserInfo();
    } else if (isOpen && !user?.userId) {
      showToast('Please log in to submit a contact form', 'error');
      onClose();
    }
  }, [isOpen, user?.userId, showToast, onClose]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubjectChange = (selectedOption: SubjectOption | null) => {
    setSelectedSubjectOption(selectedOption);
    setFormData(prev => ({
      ...prev,
      subject: selectedOption ? selectedOption.value : '',
    }));
  };

  const handleContactMethodChange = (method: 'email' | 'text') => {
    setFormData(prev => ({
      ...prev,
      preferredContactMethod: prev.preferredContactMethod === method ? '' : method,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.message.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Require a contact method to be selected
    if (!formData.preferredContactMethod) {
      showToast('Please select a contact method (Email or Text)', 'error');
      return;
    }

    // Validate email if email method is selected
    if (formData.preferredContactMethod === 'email') {
      const emailToValidate = savedEmail || formData.email;
      if (!emailToValidate.trim()) {
        showToast('Please provide an email address', 'error');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailToValidate.trim())) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
    }

    // Validate phone if text method is selected
    if (formData.preferredContactMethod === 'text') {
      const phoneToValidate = savedPhone || formData.phone;
      if (!phoneToValidate.trim()) {
        showToast('Please provide a phone number', 'error');
        return;
      }
      // Basic phone validation (allows various formats)
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(phoneToValidate.trim()) || phoneToValidate.trim().replace(/\D/g, '').length < 10) {
        showToast('Please enter a valid phone number', 'error');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare contact information
      const contactEmail = formData.preferredContactMethod === 'email' 
        ? (savedEmail || formData.email) 
        : '';
      const contactPhone = formData.preferredContactMethod === 'text' 
        ? (savedPhone || formData.phone) 
        : '';
      
      // Prepare EmailJS template parameters
      // Combine subject and message into the message field
      const combinedMessage = formData.subject 
        ? `${formData.subject}: ${formData.message}`
        : formData.message;
      
      const templateParams = {
        from_name: formData.name,
        reply_to: contactEmail || contactPhone || 'No contact method provided',
        subject: formData.subject || 'No subject',
        message: combinedMessage,
        preferred_contact_methods: formData.preferredContactMethod,
        contact_email: contactEmail || 'N/A',
        contact_phone: contactPhone || 'N/A',
        site_name: 'Family Connect App',
      };

      // Send email using EmailJS
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      // Debug: Log which variables are missing
      if (!serviceId || !templateId || !publicKey) {
        const missing = [];
        if (!serviceId) missing.push('NEXT_PUBLIC_EMAILJS_SERVICE_ID');
        if (!templateId) missing.push('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID');
        if (!publicKey) missing.push('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY');
        console.error('Missing EmailJS environment variables:', missing);
        throw new Error(`EmailJS configuration is missing: ${missing.join(', ')}`);
      }

      await emailjs.send(
        serviceId,
        templateId,
        templateParams,
        { publicKey }
      );

      showToast('Thank you for your message! We\'ll get back to you soon.', 'success');
      
      // Reset form (but keep the name since it's the logged-in user)
      const currentName = formData.name;
      setFormData({
        name: currentName,
        preferredContactMethod: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
      setSelectedSubjectOption(null);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      showToast('Failed to send message. Please try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg p-6 shadow-lg max-w-md w-11/12 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Contact</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none font-light"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Have a suggestion or want to request adding or updating information on the site? 
          I'd love to hear from you!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            {isDemoUser(user?.userId) ? (
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                disabled={isSubmitting}
                placeholder="Enter your name"
              />
            ) : (
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                disabled={isSubmitting || isLoadingName}
                placeholder={isLoadingName ? 'Loading...' : ''}
              />
            )}
            {isLoadingName && !isDemoUser(user?.userId) && (
              <p className="text-xs text-gray-500 mt-1">Loading your information...</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-0.5">
              If a response is required, how should I contact you? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">(Select one option)</p>
            
            <div className="space-y-1">
              {/* Email Option */}
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="contact-email"
                  name="preferredContactMethod"
                  value="email"
                  checked={formData.preferredContactMethod === 'email'}
                  onChange={() => handleContactMethodChange('email')}
                  className="radio radio-success radio-sm mt-1"
                  disabled={isSubmitting}
                />
                <div className="flex-1">
                  <label htmlFor="contact-email" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Email
                  </label>
                  {savedEmail && !isDemoUser(user?.userId) ? (
                    <p className="text-xs text-gray-600">Saved: {savedEmail}</p>
                  ) : (
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                      disabled={isSubmitting || formData.preferredContactMethod !== 'email'}
                    />
                  )}
                </div>
              </div>

              {/* Text Option */}
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="contact-text"
                  name="preferredContactMethod"
                  value="text"
                  checked={formData.preferredContactMethod === 'text'}
                  onChange={() => handleContactMethodChange('text')}
                  className="radio radio-success radio-sm mt-1 [--chkfg:white]"
                  disabled={isSubmitting}
                />
                <div className="flex-1">
                  <label htmlFor="contact-text" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Text
                  </label>
                  {savedPhone && !isDemoUser(user?.userId) ? (
                    <p className="text-xs text-gray-600">Saved: {savedPhone}</p>
                  ) : (
                    <input
                      type="tel"
                      autoComplete="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                      disabled={isSubmitting || formData.preferredContactMethod !== 'text'}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <Select
              id="subject"
              inputId="subject"
              options={subjectOptions}
              value={selectedSubjectOption}
              onChange={handleSubjectChange}
              placeholder="Select a subject..."
              isClearable
              className="text-black"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: 'white',
                  borderColor: '#d1d5db',
                  '&:hover': {
                    borderColor: '#3b82f6',
                  },
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
              isDisabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
              disabled={isSubmitting}
              placeholder="Please provide details about your suggestion or request..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-dark-spring-green rounded-md hover:bg-plantain-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
