// Product attributes configuration by category/subcategory
// Defines what custom attributes each product type should collect

export type AttributeFieldType = 'text' | 'number' | 'select' | 'multiline' | 'comma-separated';

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  helpText?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface ProductAttributeConfig {
  [categorySlug: string]: {
    label: string;
    icon: string;
    fields: AttributeField[];
  };
}

/**
 * Product-specific attributes that go into customAttributes JSON
 * Each category can have its own set of fields
 */
export const PRODUCT_ATTRIBUTES: ProductAttributeConfig = {
  perfumes: {
    label: 'Perfume Details',
    icon: '💐',
    fields: [
      {
        key: 'volume',
        label: 'Volume (ml)',
        type: 'number',
        placeholder: '100',
        required: true,
        min: 1,
        max: 500,
      },
      {
        key: 'fragranceType',
        label: 'Fragrance Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Eau de Parfum (EdP)', value: 'EdP' },
          { label: 'Eau de Toilette (EdT)', value: 'EdT' },
          { label: 'Eau de Cologne (EdC)', value: 'EdC' },
          { label: 'Eau Fraiche', value: 'EauFraiche' },
          { label: 'Body Mist', value: 'Mist' },
          { label: 'Solid Fragrance', value: 'Solid' },
        ],
      },
      {
        key: 'fragranceFamily',
        label: 'Fragrance Family',
        type: 'text',
        placeholder: 'e.g., Floral, Oriental, Woody, Fresh',
      },
      {
        key: 'topNotes',
        label: 'Top Notes (Opening scents)',
        type: 'comma-separated',
        placeholder: 'e.g., Bergamot, Lemon, Grapefruit',
        helpText: 'Comma-separated list',
      },
      {
        key: 'middleNotes',
        label: 'Middle Notes (Heart)',
        type: 'comma-separated',
        placeholder: 'e.g., Rose, Jasmine, Vanilla',
        helpText: 'Comma-separated list',
      },
      {
        key: 'baseNotes',
        label: 'Base Notes (Lasting)',
        type: 'comma-separated',
        placeholder: 'e.g., Musk, Sandalwood, Amber',
        helpText: 'Comma-separated list',
      },
      {
        key: 'sillage',
        label: 'Sillage',
        type: 'select',
        helpText: 'How far the scent projects',
        options: [
          { label: 'Soft', value: 'Soft' },
          { label: 'Moderate', value: 'Moderate' },
          { label: 'Strong', value: 'Strong' },
          { label: 'Very Strong', value: 'Very Strong' },
        ],
      },
      {
        key: 'longevity',
        label: 'Longevity',
        type: 'text',
        placeholder: 'e.g., 6-8 hours',
        helpText: 'How long the fragrance lasts',
      },
      {
        key: 'seasonality',
        label: 'Best Season',
        type: 'select',
        options: [
          { label: 'Spring', value: 'Spring' },
          { label: 'Summer', value: 'Summer' },
          { label: 'Fall', value: 'Fall' },
          { label: 'Winter', value: 'Winter' },
          { label: 'Year-round', value: 'Year-round' },
        ],
      },
      {
        key: 'concentration',
        label: 'Concentration (%)',
        type: 'number',
        placeholder: '20',
        min: 0,
        max: 100,
        helpText: 'Percentage of fragrance oil',
      },
    ],
  },

  'body-mists': {
    label: 'Body Mist Details',
    icon: '💨',
    fields: [
      {
        key: 'volume',
        label: 'Volume (ml)',
        type: 'number',
        placeholder: '250',
        required: true,
        min: 1,
        max: 500,
      },
      {
        key: 'fragranceFamily',
        label: 'Fragrance Family',
        type: 'text',
        placeholder: 'e.g., Floral, Fresh, Fruity',
      },
      {
        key: 'coverage',
        label: 'Scent Coverage',
        type: 'select',
        options: [
          { label: 'Light', value: 'Light' },
          { label: 'Medium', value: 'Medium' },
          { label: 'Heavy', value: 'Heavy' },
        ],
      },
    ],
  },

  jewelry: {
    label: 'Jewelry Details',
    icon: '💍',
    fields: [
      {
        key: 'ringSize',
        label: 'Ring Sizes Available',
        type: 'comma-separated',
        placeholder: 'e.g., 5, 6, 7, 8, 9, 10',
        helpText: 'Comma-separated US ring sizes',
      },
      {
        key: 'metalType',
        label: 'Metal Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Gold', value: 'Gold' },
          { label: 'Silver', value: 'Silver' },
          { label: 'Platinum', value: 'Platinum' },
          { label: 'Rose Gold', value: 'Rose Gold' },
          { label: 'White Gold', value: 'White Gold' },
          { label: 'Stainless Steel', value: 'Stainless Steel' },
          { label: 'Mixed Metals', value: 'Mixed Metals' },
        ],
      },
      {
        key: 'metalPurity',
        label: 'Metal Purity',
        type: 'text',
        placeholder: 'e.g., 18K gold, 925 sterling silver',
      },
      {
        key: 'gemstones',
        label: 'Gemstones',
        type: 'comma-separated',
        placeholder: 'e.g., Diamond, Emerald, Ruby, Sapphire',
        helpText: 'Comma-separated list if any',
      },
      {
        key: 'weight',
        label: 'Weight (grams)',
        type: 'number',
        placeholder: '5',
        helpText: 'Approximate weight',
      },
    ],
  },

  'head-gear': {
    label: 'Headwear Details',
    icon: '👒',
    fields: [
      {
        key: 'size',
        label: 'Size/Fit',
        type: 'select',
        required: true,
        options: [
          { label: 'One Size (Adjustable)', value: 'One Size' },
          { label: 'Small', value: 'S' },
          { label: 'Medium', value: 'M' },
          { label: 'Large', value: 'L' },
          { label: 'XL', value: 'XL' },
        ],
      },
      {
        key: 'fitType',
        label: 'Fit Type',
        type: 'select',
        options: [
          { label: 'Fixed Size', value: 'Fixed' },
          { label: 'Adjustable', value: 'Adjustable' },
          { label: 'One Size Fits All', value: 'OneSize' },
        ],
      },
      {
        key: 'material',
        label: 'Material',
        type: 'text',
        placeholder: 'e.g., Cotton, Wool, Silk',
      },
      {
        key: 'interiorLining',
        label: 'Interior Lining',
        type: 'text',
        placeholder: 'e.g., Satin, Cotton, Silk',
      },
    ],
  },

  cosmetics: {
    label: 'Cosmetics Details',
    icon: '💄',
    fields: [
      {
        key: 'productType',
        label: 'Cosmetic Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Foundation', value: 'Foundation' },
          { label: 'Concealer', value: 'Concealer' },
          { label: 'Lipstick', value: 'Lipstick' },
          { label: 'Eyeshadow', value: 'Eyeshadow' },
          { label: 'Blush', value: 'Blush' },
          { label: 'Powder', value: 'Powder' },
          { label: 'Mascara', value: 'Mascara' },
          { label: 'Eyeliner', value: 'Eyeliner' },
          { label: 'Nail Polish', value: 'Nail Polish' },
          { label: 'Lip Gloss', value: 'Lip Gloss' },
        ],
      },
      {
        key: 'skinTones',
        label: 'Suitable Skin Tones',
        type: 'comma-separated',
        placeholder: 'e.g., Fair, Medium, Deep, All Tones',
        helpText: 'Comma-separated list',
      },
      {
        key: 'skintypeCompatibility',
        label: 'Skin Type',
        type: 'comma-separated',
        placeholder: 'e.g., Oily, Dry, Combination, Sensitive',
        helpText: 'Comma-separated list',
      },
      {
        key: 'finish',
        label: 'Finish',
        type: 'select',
        options: [
          { label: 'Matte', value: 'Matte' },
          { label: 'Glossy', value: 'Glossy' },
          { label: 'Shimmer', value: 'Shimmer' },
          { label: 'Metallic', value: 'Metallic' },
          { label: 'Satin', value: 'Satin' },
        ],
      },
      {
        key: 'ingredients',
        label: 'Key Ingredients',
        type: 'comma-separated',
        placeholder: 'e.g., Vitamin E, Hyaluronic Acid',
        helpText: 'Comma-separated list',
      },
    ],
  },

  skincare: {
    label: 'Skincare Details',
    icon: '🧴',
    fields: [
      {
        key: 'productType',
        label: 'Skincare Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Cleanser', value: 'Cleanser' },
          { label: 'Toner', value: 'Toner' },
          { label: 'Moisturizer', value: 'Moisturizer' },
          { label: 'Serum', value: 'Serum' },
          { label: 'Face Mask', value: 'FaceMask' },
          { label: 'Sunscreen', value: 'Sunscreen' },
          { label: 'Eye Cream', value: 'EyeCream' },
          { label: 'Face Wash', value: 'FaceWash' },
        ],
      },
      {
        key: 'skinType',
        label: 'For Skin Type',
        type: 'comma-separated',
        placeholder: 'e.g., Oily, Dry, Combination, Sensitive',
        required: true,
        helpText: 'Comma-separated list',
      },
      {
        key: 'keyIngredients',
        label: 'Key Ingredients',
        type: 'comma-separated',
        placeholder: 'e.g., Vitamin C, Retinol, Niacinamide',
        helpText: 'Comma-separated list',
      },
      {
        key: 'spf',
        label: 'SPF (if sunscreen)',
        type: 'text',
        placeholder: 'e.g., SPF 30, SPF 50',
      },
    ],
  },

  shampoo: {
    label: 'Shampoo Details',
    icon: '🧴',
    fields: [
      {
        key: 'volume',
        label: 'Volume (ml)',
        type: 'number',
        placeholder: '250',
        required: true,
        min: 50,
        max: 1000,
      },
      {
        key: 'hairType',
        label: 'Best For Hair Type',
        type: 'multiline',
        placeholder: 'e.g., All types, Oily, Dry, Curly, Damaged',
        helpText: 'Select applicable hair types',
      },
      {
        key: 'ingredients',
        label: 'Key Ingredients',
        type: 'comma-separated',
        placeholder: 'e.g., Argan oil, Keratin, Biotin, Tea tree',
        helpText: 'Comma-separated list of main ingredients',
      },
      {
        key: 'fragrance',
        label: 'Scent',
        type: 'text',
        placeholder: 'e.g., Floral, Fruity, Minty, Coconut',
      },
      {
        key: 'benefits',
        label: 'Benefits',
        type: 'comma-separated',
        placeholder: 'e.g., Strengthening, Anti-dandruff, Moisturizing, Volumizing',
        helpText: 'What the shampoo helps with',
      },
      {
        key: 'sulfateFree',
        label: 'Sulfate Free',
        type: 'select',
        options: [
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' },
          { label: 'Mild Sulfates', value: 'Mild' },
        ],
      },
      {
        key: 'parabenfree',
        label: 'Paraben Free',
        type: 'select',
        options: [
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' },
        ],
      },
    ],
  },

  conditioner: {
    label: 'Conditioner Details',
    icon: '🧴',
    fields: [
      {
        key: 'volume',
        label: 'Volume (ml)',
        type: 'number',
        placeholder: '250',
        required: true,
        min: 50,
        max: 1000,
      },
      {
        key: 'hairType',
        label: 'Best For Hair Type',
        type: 'multiline',
        placeholder: 'e.g., All types, Oily, Dry, Curly, Straight',
      },
      {
        key: 'ingredients',
        label: 'Key Ingredients',
        type: 'comma-separated',
        placeholder: 'e.g., Argan oil, Keratin, Conditioning agents, Hydrolyzed silk',
        helpText: 'Main conditioning ingredients',
      },
      {
        key: 'benefits',
        label: 'Benefits',
        type: 'comma-separated',
        placeholder: 'e.g., Moisturizing, Smoothing, Frizz control, Shine-enhancing',
      },
      {
        key: 'leaveInType',
        label: 'Type',
        type: 'select',
        options: [
          { label: 'Rinse-Off', value: 'RinseOff' },
          { label: 'Leave-In', value: 'LeaveIn' },
          { label: 'Both', value: 'Both' },
        ],
      },
    ],
  },

  'hair-treatments': {
    label: 'Hair Treatment Details',
    icon: '✨',
    fields: [
      {
        key: 'volume',
        label: 'Volume (ml)',
        type: 'number',
        placeholder: '200',
        required: true,
        min: 50,
        max: 500,
      },
      {
        key: 'treatmentType',
        label: 'Treatment Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Hair Mask', value: 'Mask' },
          { label: 'Deep Conditioning', value: 'DeepConditioning' },
          { label: 'Protein Treatment', value: 'ProteinTreatment' },
          { label: 'Scalp Treatment', value: 'ScalpTreatment' },
          { label: 'Intensive Serum', value: 'Serum' },
          { label: 'Repair Treatment', value: 'RepairTreatment' },
        ],
      },
      {
        key: 'ingredients',
        label: 'Key Ingredients',
        type: 'comma-separated',
        placeholder: 'e.g., Keratin, Collagen, Hydrolyzed wheat protein, Argan oil',
      },
      {
        key: 'benefits',
        label: 'Target Concerns',
        type: 'comma-separated',
        placeholder: 'e.g., Breakage, Dryness, Damage repair, Frizz, Color protection',
      },
      {
        key: 'applicationMethod',
        label: 'How to Apply',
        type: 'text',
        placeholder: 'e.g., Apply to damp hair, leave for 10-20 minutes',
      },
      {
        key: 'usageFrequency',
        label: 'Usage Frequency',
        type: 'select',
        options: [
          { label: 'Weekly', value: 'Weekly' },
          { label: 'Bi-weekly', value: 'BiWeekly' },
          { label: 'Monthly', value: 'Monthly' },
          { label: 'As needed', value: 'AsNeeded' },
        ],
      },
    ],
  },

  'hair-oils': {
    label: 'Hair Oil Details',
    icon: '💧',
    fields: [
      {
        key: 'volume',
        label: 'Volume (ml)',
        type: 'number',
        placeholder: '100',
        required: true,
        min: 20,
        max: 500,
      },
      {
        key: 'oilType',
        label: 'Oil Type',
        type: 'select',
        options: [
          { label: 'Coconut Oil', value: 'Coconut' },
          { label: 'Argan Oil', value: 'Argan' },
          { label: 'Jojoba Oil', value: 'Jojoba' },
          { label: 'Castor Oil', value: 'Castor' },
          { label: 'Olive Oil', value: 'Olive' },
          { label: 'Mustard Oil', value: 'Mustard' },
          { label: 'Blend', value: 'Blend' },
        ],
      },
      {
        key: 'ingredients',
        label: 'Oil Blend Components',
        type: 'comma-separated',
        placeholder: 'e.g., Coconut oil, Almond oil, Hibiscus extract',
      },
      {
        key: 'benefits',
        label: 'Benefits',
        type: 'comma-separated',
        placeholder: 'e.g., Scalp nourishment, Hair growth, Conditioning, Shine',
      },
      {
        key: 'bestFor',
        label: 'Best For',
        type: 'text',
        placeholder: 'e.g., Dry scalp, Thinning hair, Color-treated hair',
      },
      {
        key: 'pureOil',
        label: 'Pure/100% Oil',
        type: 'select',
        options: [
          { label: 'Pure (100%)', value: 'Pure' },
          { label: 'Infused', value: 'Infused' },
          { label: 'Blend', value: 'Blend' },
        ],
      },
    ],
  },

  'hair-styling': {
    label: 'Hair Styling Product Details',
    icon: '💈',
    fields: [
      {
        key: 'volume',
        label: 'Volume (ml/oz)',
        type: 'number',
        placeholder: '150',
        required: true,
      },
      {
        key: 'productType',
        label: 'Product Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Hair Gel', value: 'Gel' },
          { label: 'Hair Spray', value: 'Spray' },
          { label: 'Pomade', value: 'Pomade' },
          { label: 'Mousse', value: 'Mousse' },
          { label: 'Hair Wax', value: 'Wax' },
          { label: 'Hair Paste', value: 'Paste' },
          { label: 'Styling Cream', value: 'Cream' },
        ],
      },
      {
        key: 'holdStrength',
        label: 'Hold Strength',
        type: 'select',
        options: [
          { label: 'Light', value: 'Light' },
          { label: 'Medium', value: 'Medium' },
          { label: 'Strong', value: 'Strong' },
          { label: 'Extra Strong', value: 'ExtraStrong' },
        ],
      },
      {
        key: 'finish',
        label: 'Finish Type',
        type: 'select',
        options: [
          { label: 'Matte', value: 'Matte' },
          { label: 'Shiny', value: 'Shiny' },
          { label: 'Natural', value: 'Natural' },
          { label: 'Wet Look', value: 'WetLook' },
        ],
      },
      {
        key: 'washability',
        label: 'Washability',
        type: 'select',
        options: [
          { label: 'Easily washes out', value: 'Easy' },
          { label: 'Washes with shampoo', value: 'Shampoo' },
          { label: 'Water-soluble', value: 'WaterSoluble' },
        ],
      },
    ],
  },

  'hair-color': {
    label: 'Hair Color Product Details',
    icon: '🎨',
    fields: [
      {
        key: 'colorType',
        label: 'Color Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Permanent', value: 'Permanent' },
          { label: 'Semi-permanent', value: 'SemiPermanent' },
          { label: 'Temporary', value: 'Temporary' },
          { label: 'Demi-permanent', value: 'DemiPermanent' },
          { label: 'Hair Chalk', value: 'Chalk' },
          { label: 'Spray-on', value: 'Spray' },
        ],
      },
      {
        key: 'color',
        label: 'Color(s) Available',
        type: 'comma-separated',
        placeholder: 'e.g., Black, Brown, Blonde, Red, Burgundy, Ash',
        required: true,
      },
      {
        key: 'ammoniafree',
        label: 'Ammonia Free',
        type: 'select',
        options: [
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' },
        ],
      },
      {
        key: 'coverage',
        label: 'Gray Coverage',
        type: 'select',
        options: [
          { label: 'Partial', value: 'Partial' },
          { label: 'Full', value: 'Full' },
          { label: 'N/A (Fashion color)', value: 'NA' },
        ],
      },
      {
        key: 'instructions',
        label: 'Key Instructions',
        type: 'text',
        placeholder: 'e.g., Best for previously colored hair, 30-45 min processing time',
      },
    ],
  },
};

/**
 * Get attributes for a specific category slug
 */
export function getAttributesForCategory(
  categorySlug: string
): ProductAttributeConfig[string] | null {
  return PRODUCT_ATTRIBUTES[categorySlug] || null;
}

/**
 * Check if a category has custom attributes
 */
export function hasCustomAttributes(categorySlug: string): boolean {
  return categorySlug in PRODUCT_ATTRIBUTES;
}
