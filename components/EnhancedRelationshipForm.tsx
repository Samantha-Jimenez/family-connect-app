"use client";
import React, { useState, useEffect } from 'react';
import { 
  RelationshipType, 
  FamilyMember, 
  addFamilyRelationship, 
  validateRelationship,
  suggestPossibleRelationships,
  getAllFamilyMembers 
} from '@/hooks/dynamoDB';
import LoadSpinner from './LoadSpinner';

interface EnhancedRelationshipFormProps {
  onRelationshipCreated?: () => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

interface RelationshipSuggestion {
  relationshipType: RelationshipType;
  confidence: number;
  reason: string;
}

const RELATIONSHIP_CATEGORIES = {
  'Direct Family': ['parent', 'child', 'sibling'],
  'Spousal': ['spouse', 'ex_spouse', 'partner'],
  'Extended Family': ['grandparent', 'grandchild', 'great_grandparent', 'great_grandchild'],
  'Aunts & Uncles': ['aunt', 'uncle', 'niece', 'nephew'],
  'Cousins': ['cousin', 'second_cousin', 'cousin_once_removed'],
  'Step Family': ['step_parent', 'step_child', 'step_sibling'],
  'In-Laws': ['parent_in_law', 'child_in_law', 'sibling_in_law', 'son_in_law', 'daughter_in_law', 'father_in_law', 'mother_in_law', 'brother_in_law', 'sister_in_law'],
  'Other': ['guardian', 'ward', 'godparent', 'godchild']
};

export default function EnhancedRelationshipForm({ onRelationshipCreated, showToast }: EnhancedRelationshipFormProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedPersonA, setSelectedPersonA] = useState<string>('');
  const [selectedPersonB, setSelectedPersonB] = useState<string>('');
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType>('sibling');
  const [relationshipSubtype, setRelationshipSubtype] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const members = await getAllFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error fetching family members:', error);
        showToast?.('Error loading family members', 'error');
      }
    };

    fetchFamilyMembers();
  }, [showToast]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (selectedPersonA && selectedPersonB && selectedPersonA !== selectedPersonB) {
        try {
          const relationshipSuggestions = await suggestPossibleRelationships(selectedPersonA, selectedPersonB);
          setSuggestions(relationshipSuggestions);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [selectedPersonA, selectedPersonB]);

  useEffect(() => {
    const validateCurrentRelationship = async () => {
      if (selectedPersonA && selectedPersonB && selectedRelationshipType && selectedPersonA !== selectedPersonB) {
        setValidating(true);
        try {
          const validation = await validateRelationship(selectedPersonA, selectedPersonB, selectedRelationshipType);
          setValidationResult(validation);
        } catch (error) {
          console.error('Validation error:', error);
          setValidationResult({ valid: false, error: 'Error validating relationship' });
        } finally {
          setValidating(false);
        }
      } else {
        setValidationResult(null);
      }
    };

    // Add debounce to prevent too many validation calls
    const timeoutId = setTimeout(() => {
      validateCurrentRelationship();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedPersonA, selectedPersonB, selectedRelationshipType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPersonA || !selectedPersonB || !selectedRelationshipType) {
      showToast?.('Please fill in all required fields', 'error');
      return;
    }

    if (selectedPersonA === selectedPersonB) {
      showToast?.('A person cannot have a relationship with themselves', 'error');
      return;
    }

    setLoading(true);
    try {
      await addFamilyRelationship(selectedPersonA, selectedPersonB, selectedRelationshipType, {
        relationshipSubtype: relationshipSubtype || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes || undefined,
      });

      showToast?.('Relationship created successfully!', 'success');
      
      // Reset form
      setSelectedPersonA('');
      setSelectedPersonB('');
      setSelectedRelationshipType('sibling');
      setRelationshipSubtype('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      setValidationResult(null);
      
      onRelationshipCreated?.();
    } catch (error) {
      console.error('Error creating relationship:', error);
      showToast?.('Error creating relationship', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: RelationshipSuggestion) => {
    setSelectedRelationshipType(suggestion.relationshipType);
  };

  const getPersonName = (personId: string) => {
    const person = familyMembers.find(m => m.family_member_id === personId);
    return person ? `${person.first_name} ${person.last_name}` : '';
  };

  const formatRelationshipType = (type: RelationshipType): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Family Relationship</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Person Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Person *
            </label>
            <select
              value={selectedPersonA}
              onChange={(e) => setSelectedPersonA(e.target.value)}
              className="w-full bg-white p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a family member</option>
              {familyMembers
                .sort((a, b) => {
                  const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                  const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                  return nameA.localeCompare(nameB);
                })
                .map((member) => (
                  <option key={member.family_member_id} value={member.family_member_id}>
                    {member.first_name} {member.last_name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Second Person *
            </label>
            <select
              value={selectedPersonB}
              onChange={(e) => setSelectedPersonB(e.target.value)}
              className="w-full bg-white p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a family member</option>
              {familyMembers
                .filter(member => member.family_member_id !== selectedPersonA)
                .sort((a, b) => {
                  const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                  const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                  return nameA.localeCompare(nameB);
                })
                .map((member) => (
                  <option key={member.family_member_id} value={member.family_member_id}>
                    {member.first_name} {member.last_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Relationship Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-800">Suggested Relationships</h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-3 bg-white rounded-md border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-800">
                      {formatRelationshipType(suggestion.relationshipType)}
                    </span>
                    <span className="text-sm text-blue-600">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Relationship Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(RELATIONSHIP_CATEGORIES).map(([category, types]) => (
              <div key={category} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{category}</h4>
                <div className="space-y-2">
                  {types.map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="radio"
                        name="relationshipType"
                        value={type}
                        checked={selectedRelationshipType === type}
                        onChange={(e) => setSelectedRelationshipType(e.target.value as RelationshipType)}
                        className="mr-2"
                      />
                      <span className="text-sm">{formatRelationshipType(type as RelationshipType)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship Subtype */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Subtype (Optional)
          </label>
          <input
            type="text"
            value={relationshipSubtype}
            onChange={(e) => setRelationshipSubtype(e.target.value)}
            placeholder="e.g., maternal, paternal, adoptive"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information about this relationship..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Validation Result */}
        {validationResult && (
          <div className={`p-4 rounded-lg ${
            validationResult.valid 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {validating ? (
                <LoadSpinner size={20} />
              ) : validationResult.valid ? (
                <span className="text-green-600">✓</span>
              ) : (
                <span className="text-red-600">✗</span>
              )}
              <span className={`ml-2 ${
                validationResult.valid ? 'text-green-800' : 'text-red-800'
              }`}>
                {validationResult.valid 
                  ? 'Relationship is valid' 
                  : validationResult.error
                }
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !validationResult?.valid || selectedPersonA === selectedPersonB}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <LoadSpinner size={20} />
              <span className="ml-2">Creating Relationship...</span>
            </div>
          ) : (
            'Create Relationship'
          )}
        </button>
      </form>
    </div>
  );
}
