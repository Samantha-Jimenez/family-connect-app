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
import { getCurrentUser } from 'aws-amplify/auth';
import LoadSpinner from './LoadSpinner';
import { DEMO_FAMILY_GROUP, REAL_FAMILY_GROUP } from '@/utils/demoConfig';

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
  'Grand Aunts & Uncles': ['grand_aunt', 'grand_uncle', 'grand_niece', 'grand_nephew'],
  'Great Grand Aunts & Uncles': ['great_grand_aunt', 'great_grand_uncle', 'great_grand_niece', 'great_grand_nephew'],
  'Cousins': ['cousin', 'second_cousin', 'cousin_once_removed'],
  'Step Family': ['step_parent', 'step_child', 'step_sibling'],
  'In-Laws': ['parent_in_law', 'child_in_law', 'sibling_in_law', 'son_in_law', 'daughter_in_law', 'father_in_law', 'mother_in_law', 'brother_in_law', 'sister_in_law', 'uncle_in_law', 'aunt_in_law', 'niece_in_law', 'nephew_in_law', 'cousin_in_law', 'grandchild_in_law', 'grandparent_in_law'],
  'Other': ['guardian', 'ward', 'godparent', 'godchild']
};

// Gender-specific relationship mappings for better clarity
const GENDER_SPECIFIC_RELATIONSHIPS = {
  'aunt': ['niece', 'nephew'],
  'uncle': ['niece', 'nephew'],
  'niece': ['aunt', 'uncle'],
  'nephew': ['aunt', 'uncle'],
  'grand_aunt': ['grand_niece', 'grand_nephew'],
  'grand_uncle': ['grand_niece', 'grand_nephew'],
  'grand_niece': ['grand_aunt', 'grand_uncle'],
  'grand_nephew': ['grand_aunt', 'grand_uncle'],
  'great_grand_aunt': ['great_grand_niece', 'great_grand_nephew'],
  'great_grand_uncle': ['great_grand_niece', 'great_grand_nephew'],
  'great_grand_niece': ['great_grand_aunt', 'great_grand_uncle'],
  'great_grand_nephew': ['great_grand_aunt', 'great_grand_uncle'],
  'sister_in_law': ['brother_in_law', 'sister_in_law'],
  'brother_in_law': ['sister_in_law', 'brother_in_law'],
  'parent_in_law': ['daughter_in_law', 'son_in_law'],
  'father_in_law': ['daughter_in_law', 'son_in_law'],
  'mother_in_law': ['daughter_in_law', 'son_in_law'],
  'uncle_in_law': ['niece_in_law', 'nephew_in_law'],
  'aunt_in_law': ['niece_in_law', 'nephew_in_law'],
  'niece_in_law': ['uncle_in_law', 'aunt_in_law'],
  'nephew_in_law': ['uncle_in_law', 'aunt_in_law'],
  'grandchild_in_law': ['grandparent_in_law'],
  'grandparent_in_law': ['grandchild_in_law']
};

export default function EnhancedRelationshipForm({ onRelationshipCreated, showToast }: EnhancedRelationshipFormProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [allFamilyMembers, setAllFamilyMembers] = useState<FamilyMember[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
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
  const [genderSpecificRelationship, setGenderSpecificRelationship] = useState<string>('');

  // Fetch all family members once on mount
  useEffect(() => {
    const fetchAllFamilyMembers = async () => {
      try {
        const user = await getCurrentUser();
        // Fetch all family members (both real and demo) to enable toggling
        const allMembers = await getAllFamilyMembers(user?.userId, true);
        setAllFamilyMembers(allMembers);
      } catch (error) {
        console.error('Error fetching family members:', error);
        showToast?.('Error loading family members', 'error');
      }
    };

    fetchAllFamilyMembers();
  }, [showToast]);

  // Filter family members based on toggle state
  useEffect(() => {
    const filteredMembers = allFamilyMembers.filter(member => {
      const memberGroup = member.family_group || REAL_FAMILY_GROUP;
      return isDemoMode ? memberGroup === DEMO_FAMILY_GROUP : memberGroup === REAL_FAMILY_GROUP;
    });
    setFamilyMembers(filteredMembers);
    
    // Clear selections when switching modes if they don't belong to the current group
    setSelectedPersonA(prev => {
      if (prev) {
        const personAGroup = allFamilyMembers.find(m => m.family_member_id === prev)?.family_group || REAL_FAMILY_GROUP;
        const currentGroup = isDemoMode ? DEMO_FAMILY_GROUP : REAL_FAMILY_GROUP;
        return personAGroup === currentGroup ? prev : '';
      }
      return prev;
    });
    
    setSelectedPersonB(prev => {
      if (prev) {
        const personBGroup = allFamilyMembers.find(m => m.family_member_id === prev)?.family_group || REAL_FAMILY_GROUP;
        const currentGroup = isDemoMode ? DEMO_FAMILY_GROUP : REAL_FAMILY_GROUP;
        return personBGroup === currentGroup ? prev : '';
      }
      return prev;
    });
  }, [isDemoMode, allFamilyMembers]);

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

  // Clear gender-specific relationship when relationship type changes
  useEffect(() => {
    setGenderSpecificRelationship('');
  }, [selectedRelationshipType]);

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

    // Check if gender-specific relationship is required but not selected
    if (needsGenderSpecificOptions(selectedRelationshipType) && !genderSpecificRelationship) {
      showToast?.('Please specify the gender-specific relationship', 'error');
      return;
    }

    setLoading(true);
    try {
      // For gender-specific relationships, create both directions with appropriate types
      if (needsGenderSpecificOptions(selectedRelationshipType)) {

        // Create relationship A -> B with the selected type
        await addFamilyRelationship(selectedPersonA, selectedPersonB, selectedRelationshipType, {
          relationshipSubtype: relationshipSubtype || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          notes: notes || undefined,
        });

        // Create relationship B -> A with the gender-specific type
        await addFamilyRelationship(selectedPersonB, selectedPersonA, genderSpecificRelationship as RelationshipType, {
          relationshipSubtype: relationshipSubtype || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          notes: notes || undefined,
        });
      } else {
        // For regular relationships, create the relationship normally
        await addFamilyRelationship(selectedPersonA, selectedPersonB, selectedRelationshipType, {
          relationshipSubtype: relationshipSubtype || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          notes: notes || undefined,
        });
      }

      showToast?.('Relationship created successfully!', 'success');
      
      // Reset form
      setSelectedPersonA('');
      setSelectedPersonB('');
      setSelectedRelationshipType('sibling');
      setRelationshipSubtype('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      setGenderSpecificRelationship('');
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
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Check if the selected relationship type needs gender-specific options
  const needsGenderSpecificOptions = (relationshipType: RelationshipType): boolean => {
    return ['aunt', 'uncle', 'niece', 'nephew', 'grand_aunt', 'grand_uncle', 'grand_niece', 'grand_nephew', 'great_grand_aunt', 'great_grand_uncle', 'great_grand_niece', 'great_grand_nephew', 'sister_in_law', 'brother_in_law', 'parent_in_law', 'father_in_law', 'mother_in_law', 'uncle_in_law', 'aunt_in_law', 'niece_in_law', 'nephew_in_law', 'grandchild_in_law', 'grandparent_in_law'].includes(relationshipType);
  };

  // Get the available gender-specific options for a relationship type
  const getGenderSpecificOptions = (relationshipType: RelationshipType): string[] => {
    return GENDER_SPECIFIC_RELATIONSHIPS[relationshipType as keyof typeof GENDER_SPECIFIC_RELATIONSHIPS] || [];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Family Relationship</h2>
      
      {/* Toggle between Real and Demo Family Members */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Family Group:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsDemoMode(false);
              setSelectedPersonA('');
              setSelectedPersonB('');
            }}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              !isDemoMode
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Real
          </button>
          <button
            type="button"
            onClick={() => {
              setIsDemoMode(true);
              setSelectedPersonA('');
              setSelectedPersonB('');
            }}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              isDemoMode
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Demo
          </button>
        </div>
      </div>
      
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

        {/* Gender-Specific Relationship Selection */}
        {needsGenderSpecificOptions(selectedRelationshipType) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-yellow-800">
              Specify Gender-Specific Relationship
            </h3>
            <p className="text-sm text-yellow-700 mb-3">
              Since you selected "{formatRelationshipType(selectedRelationshipType)}", please specify the gender-specific relationship for the other person.
            </p>
            <div className="space-y-2">
              {getGenderSpecificOptions(selectedRelationshipType).map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="genderSpecificRelationship"
                    value={option}
                    checked={genderSpecificRelationship === option}
                    onChange={(e) => {
                      setGenderSpecificRelationship(e.target.value);
                    }}
                    className="mr-2"
                    required
                  />
                  <span className="text-sm">{formatRelationshipType(option as RelationshipType)}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Debug: Selected relationship type: {selectedRelationshipType}, Gender-specific: {genderSpecificRelationship}
            </div>
          </div>
        )}

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
