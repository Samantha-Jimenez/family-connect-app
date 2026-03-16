/**
 * Static location data for autocomplete in photo upload and other forms.
 * Countries: full list. States: US + Canada. Cities: major North American + world.
 */

const COUNTRIES: string[] = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada',
  'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia',
  'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
  'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro',
  'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay',
  'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Lucia', 'Samoa',
  'San Marino', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const US_STATES_AND_PROVINCES: string[] = [
  // US states
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'District of Columbia',
  // Canadian provinces and territories
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon',
  // Mexico (common)
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'Mexico City', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
  'Yucatán', 'Zacatecas'
];

/** Major cities (US, Canada, Mexico, and a set of international) for autocomplete. */
const CITIES: string[] = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
  'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Boston',
  'Nashville', 'Detroit', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson',
  'Fresno', 'Sacramento', 'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh', 'Miami', 'Long Beach',
  'Virginia Beach', 'Oakland', 'Minneapolis', 'Tulsa', 'Tampa', 'Arlington', 'New Orleans', 'Wichita', 'Cleveland', 'Bakersfield',
  'Aurora', 'Honolulu', 'Anaheim', 'Santa Ana', 'St. Louis', 'Riverside', 'Corpus Christi', 'Lexington', 'Pittsburgh', 'Anchorage',
  'Stockton', 'Cincinnati', 'Saint Paul', 'Newark', 'Plano', 'Henderson', 'Lincoln', 'Buffalo', 'Fort Wayne',
  'Jersey City', 'St. Petersburg', 'Chula Vista', 'Orlando', 'Laredo', 'Norfolk', 'Chandler', 'Madison', 'Lubbock', 'Scottsdale',
  'Reno', 'Durham', 'Gilbert', 'Glendale', 'North Las Vegas', 'Winston-Salem', 'Chesapeake', 'Garland', 'Irving', 'Hialeah',
  'Fremont', 'Boise', 'Richmond', 'Baton Rouge', 'Des Moines', 'Spokane', 'San Bernardino', 'Birmingham', 'Modesto', 'Rochester',
  // Canada
  'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener',
  'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', 'Sherbrooke', 'Barrie', 'Kelowna',
  'Abbotsford', 'Kingston', 'Saguenay', 'Trois-Rivières', 'Guelph', 'Moncton', 'Brantford', 'Saint John', 'Peterborough', 'Thunder Bay',
  // Mexico
  'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan', 'Mérida', 'Cancún',
  'Querétaro', 'Aguascalientes', 'San Luis Potosí', 'Hermosillo', 'Morelia', 'Saltillo', 'Culiacán', 'Chihuahua', 'Toluca', 'Reynosa',
  // International
  'London', 'Paris', 'Tokyo', 'Sydney', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Brussels', 'Vienna',
  'Dublin', 'Lisbon', 'Athens', 'Warsaw', 'Prague', 'Budapest', 'Bucharest', 'Sofia', 'Copenhagen', 'Stockholm',
  'Oslo', 'Helsinki', 'Zurich', 'Barcelona', 'Milan', 'Munich', 'Hamburg', 'Frankfurt', 'Buenos Aires', 'São Paulo',
  'Rio de Janeiro', 'Lima', 'Bogotá', 'Santiago', 'Caracas', 'Lagos', 'Cairo', 'Nairobi', 'Johannesburg', 'Cape Town',
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Singapore', 'Hong Kong', 'Bangkok', 'Seoul', 'Jakarta',
  'Manila', 'Kuala Lumpur', 'Dubai', 'Tel Aviv', 'Istanbul', 'Moscow', 'Beijing', 'Shanghai'
];

function toSelectOptions(items: string[]): { value: string; label: string }[] {
  return items.map((item) => ({ value: item, label: item }));
}

export const countryOptions = toSelectOptions(COUNTRIES);
export const stateOptions = toSelectOptions(US_STATES_AND_PROVINCES);
export const cityOptions = toSelectOptions(CITIES);
