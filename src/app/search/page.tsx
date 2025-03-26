'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
// DO NOT import global.css here - it's in layout.tsx
import Link from 'next/link';

// --- Helper Function for Nepali Numerals ---
const toNepaliNumber = (num: number | string): string => {
  const nepaliDigits: { [key: string]: string } = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  return String(num).split('').map(digit => nepaliDigits[digit] || digit).join('');
};

// --- Generate Options ---
const currentYearBS = new Date().getFullYear() + 57; // Adjust based on current BS year if needed
const years = Array.from({ length: 80 }, (_, i) => toNepaliNumber(currentYearBS - i)).reverse();
const months = Array.from({ length: 12 }, (_, i) => toNepaliNumber(i + 1));
const days = Array.from({ length: 32 }, (_, i) => toNepaliNumber(i + 1)); // Note: Days 30, 31, 32 might be invalid for some months
const ankaOptions = Array.from({ length: 12 }, (_, i) => toNepaliNumber(i + 1));

// --- ScrollPicker Component (Inlined - unchanged) ---
interface ScrollPickerProps {
  options: string[];
  placeholder?: string;
  onSelect?: (selectedOption: string) => void;
  value?: string;
  label?: string;
  className?: string;
  ariaLabel?: string;
}

const ScrollPicker: React.FC<ScrollPickerProps> = ({
  options,
  placeholder = '-- छान्नुहोस् --',
  onSelect,
  value: controlledValue,
  label,
  className = '',
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState('');
  const selected = controlledValue !== undefined ? controlledValue : internalSelected;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
      if (controlledValue !== undefined) {
          setInternalSelected(controlledValue);
      }
  }, [controlledValue]);

  const handleSelectOption = (option: string) => {
    if (controlledValue === undefined) {
        setInternalSelected(option);
    }
    setIsOpen(false); // Close instantly
    if (onSelect) {
      onSelect(option);
    }
  };

  const handleToggleOpen = (event?: React.MouseEvent | React.KeyboardEvent) => {
    // Prevent nested pickers from closing parent when toggling
    if (event) event.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const accessibleName = ariaLabel || label || placeholder;

  return (
    <div
      ref={containerRef}
      className={`scroll-picker-container ${isOpen ? 'expanded' : ''} ${className}`}
      onClick={handleToggleOpen}
      role="listbox"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); handleToggleOpen(e);} else if (e.key === 'Escape') {setIsOpen(false);}}}
      aria-label={accessibleName}
    >
      <div className="scroll-picker-text">
        {selected || placeholder}
      </div>
      <ul className="scroll-picker-list">
        {options.map((option) => (
          <li
            key={option}
            onClick={(e) => { e.stopPropagation(); handleSelectOption(option); }}
            role="option"
            aria-selected={selected === option}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleSelectOption(option); } }}
            tabIndex={isOpen ? 0 : -1} // Only focusable when open
          >
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- Main Search Page Component ---
export default function SearchPage() {
  const [formData, setFormData] = useState({
    muddaNo: '', nirnayaNo: '', nyayadhish: '', muddhakoKisim: '',
    ijalashkoNaam: '', faisalakoKisim: '', muddhakoNaam: '', pakshya: '',
    vipakshya: '', faisalaMitiFromYear: '', faisalaMitiFromMonth: '',
    faisalaMitiFromDay: '', faisalaMitiToYear: '', faisalaMitiToMonth: '',
    faisalaMitiToDay: '', shabdabata: '', nekapaBhag: '', nekapaSaal: '',
    nekapaMahina: '', nekapaAnka: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelect = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const searchPlaceholder = ". . .";
  const selectPlaceholder = "- - -";
  const datePlaceholders = { year: "वर्ष", month: "महिना", day: "दिन" };

  // --- Options Data (unchanged) ---
  const muddhakoKisimOptions = ['दुनियाबादी देवानी', 'सरकारबादी देवानी', 'दुनियावादी फौजदारी', 'सरकारवादी फौजदारी', 'रिट', 'निवेदन', 'विविध'];
  const ijalashkoNaamOptions = ['सिङ्गल बेञ्च इजलास', 'एक न्यायाधीशको इजलास', 'फूल बेन्च इजलास', 'डिभिजन वेन्च इजलास', 'स्पेशल बेञ्च इजलास', 'तीन न्यायाधीशको इजलास', 'एकल इजलास', 'संयुक्त इजलास', 'पूर्ण इजलास', 'विशेष इजलास', 'वृहद पूर्ण इजलास'];
  const faisalakoKisimOptions = ['जारी', 'खारेज', 'सदर', 'उल्टी', 'बदर', '१८८ को राय बदर', 'केही उल्टी', 'अन्य', 'विविध', 'भविश्यमा सरकारी जिम्मेवारीको पद नदिन लेखी पठाउने', 'सुरू सदर', 'पुनरावेदन अदालतमा फिर्ता', 'सुरू जिल्ला अदालतमा फिर्ता', 'निर्देशन जारी', 'सुरू कार्यालयमा पठाउने', 'रूलिङ कायम', 'डिभिजन वेञ्चमा पेस गर्नु'];
  const originalMuddhaKoNaamOptions = ['अंश', 'अंश जालसाजी', 'अंशबन्डा', 'अग्नि बिमा दाबी', 'अधिकार पत्र बदर', 'अनियमितता', 'अपुताली', 'अपुताली धनमाल', 'अबन्डा जग्गा बन्डा', 'अबन्डा धन बन्डा गराई पाउँ', 'अर्को लिखत गराइपाऊँ', 'अवैध रूपमा भवन निर्माण', 'आदेश जारी गरी पाऊँ', 'आदेश बदर', 'आदेश बदर गरी हाजिर गराई पाउँ', 'आम्दानी खर्च', 'आयस्ता दिलाई पाऊँ', 'आयस्ता वाली', 'आर्य समाजी', 'इन्साफ जाँच', 'उखडा जग्गा', 'उपयुक्त आदेश जारी गरी पाऊँ', 'क. ख. समेत', 'कम्पनी सम्बन्धी', 'करारकर्म थकाली', 'कागज सच्यायो', 'कित्ताकाट', 'कित्ताकाट ट्रायल चेक', 'किलास खिचोला', 'किल्ला बदर', 'कुत दिलाई मोही निष्काशन गरी पाउा', 'कुत बाली', 'कुलो पानी', 'कुलो पानी', 'क्षतिपुर्ति', 'क्षेत्रफल सुधार', 'खान लाउन दिलाई पाऊँ', 'खानी लाइसेन्स बदर', 'खिचोला', 'खिचोला दर्ता बदर', 'खिचोला पर्चा बदर गुठी', 'खिचोला मेटाई', 'खिचोला हक कायम', 'गुठी सम्बन्धी', 'गोश्वारा दर्ता कायम', 'घर जग्गासम्बन्धी', 'घर भत्काई पाऊँ', 'घर भत्काई बाटो खुलाई', 'घर भवन सम्बन्धी', 'घरेलु हिंसा', 'चलन चलाई पाऊँ', 'चिकित्सकको रूपमा दर्ता गराइपाऊँ', 'जग्गा खिचोला', 'जग्गा जालसाजी', 'जग्गा दर्ता नामसारी', 'जग्गा निखनाई पाउँ', 'जग्गा बाली', 'जग्गा सम्बन्धी', 'जातक मार्‍यो', 'जायजात बेहिसाब', 'जिउनी जग्गा', 'जिमिदारी नामसारी', 'जिरायत', 'जोत कट्टा', 'जोत कायम', 'जोत बदर', 'झुक्याई कागज गरायो', 'टिकटको रूपैयाँ दिलाइ पाउँ', 'ट्रेडमार्क दर्ता', 'ट्रेडमार्क संशोधन', 'ठेक्का रकम', 'डाक रोकी पाउँ', 'तलब दिलाई पाउँ', 'तायदाती फैसला बदर', 'तालुकी', 'तिरो बुझाई पाऊँ', 'थकाली लूय गरिपाऊँ', 'थैली बुझाई पाउँ', 'दर्ता कायम', 'दर्ता गरी पाउँ', 'दर्ता बदर', 'दर्ता बदर', 'नामसारी', 'दाइजो पेवा', 'दाखिल खारेज', 'दामासाही गरिपाऊँ', 'दुनियावादी देवानी विविध', 'दूषित दर्ता', 'दोहरा लिखत', 'दोहोरो दर्ता श्रेस्ता', 'धनमाल', 'धरौट', 'धर्मपुत्र / पुत्री', 'धर्मपुत्र लिखत बदर', 'धर्मलोप', 'नक्सा पास', 'नक्सा बेगर ढोका गोठ बनाएको भत्काई पाउँ', 'नाता कायम', 'नापी दर्ता बदर दर्ता', 'नामसारी', 'नासो धरौट', 'निखनाई पाऊँ', 'निर्णय दर्ता बदर', 'निर्णय दर्ता बदर हक कायम दर्तासमेत', 'निर्णय बदर समेत', 'निर्वाचन', 'निर्वाचन बदर', 'निवेदन', 'पदमा कायम', 'पर्खाल खिचोला', 'पर्खाल भत्काई सार्वजनिक कुलो कायम', 'पर्चा बदर', 'पर्वते रौजौटा कायम', 'पसलबाट उठाई पाऊँ', 'पाल्ही भट्टि रकम', 'पास गराई पाऊँ', '“पेटेन्ट ,डिजाइन,ट्रेडमार्क”', 'पैनी तोडी दियो', 'पोत दिलाई पाऊँ', 'फट्टा दिलाई पाउँ भन्ने', 'फिल्डबुक सच्याएको दर्ता', 'फैसला वदर', 'बकस जग्गा', 'बकसपत्र', 'बच्चा जिम्मा लगाई पाउँ', 'बन्डापत्र', 'बन्धकी', 'बन्धकी थैली', 'बर्खास्ती बदर', 'बहाल बुझाई पाउँ', 'बहाल भराई पाउँ', 'बाँध काट्यो', 'बाटो खुलाई पाऊँ', 'बालीसम्बन्धी', 'बिक्री बदर', 'बिक्रीकर निर्धारण', 'बिगो असुल', 'बिमा दाबी', 'बेहिसावको नालिस खारेज', 'बैक ग्यारेन्टी', 'ब्याज भराई पाउँ', 'भत्काई पाऊँ', 'भरेङ बाटो कायम गरिपाऊँ', 'भरेङ बाटो कायम गरिपाऊँ', 'भाडा दिलाई घर खाली', 'मध्यस्थता', 'मानाचामल', 'मिलापत्र', 'मुद्दा सकार गरिपाऊँ', 'मोही', 'मोही निष्काशन', 'म्याद तामेली', 'रकम दिलाई भराई पाऊँ', 'रसिद दिलाइ पाउँ', 'राजिनामा दर्ता वदर हक कायम', 'राजिनामा लिखत बदर', 'राजिनामा सम्बन्धी', 'राजीनामा खोसी झुक्याई सही गरायो', 'रोक्का धनमाल हिनामिना', 'रोक्का बदर', 'रोक्का बाली फुकुवा पाउँ', 'लगत सच्याई पाऊँ', 'लिखत जालसाजी', 'लिखत दर्ता बदर', 'लिखत पारित', 'लिखत पास', 'लिखत फिर्ता पाउँ', 'लिखत बदर', 'लिज करारबोजिमको माल वस्तु नउठाउने र पुनः करारको आदेश', 'लिलाम बदर', 'लेनदेन', 'वाटो निकास', 'वाली मोही', 'वाली विगो', 'वाली सम्बन्धी', 'विक्री सम्बन्धि', 'वीमा', 'वैना फिर्ता', 'शेयर कायम गरिपाउँ', 'शेयर सम्बन्धि', 'शेषपछिको बकसपत्र', 'सँधियार कायम गरी पाऊ', 'संशोधन दाखिल खारेज', 'सट्टापट्टा', 'सन्धी सर्पन', 'सफारी चलन', 'समान जफत', 'सम्पत्ति मसौट गरे भने', 'सार्वजनिक जग्गा', 'सार्वजनिक बाटो', 'सावाँ ब्याज भराइपाउा', 'सुन विदेश निकासी', 'सेवाबाट अबकाश', 'स्वीकृत किलोवाट कायम गरी हिसाब गराई पाउं', 'हक कायम', 'हक बेहक', 'हकदार कायम', 'हकसफा', 'हद फुकाई पाउँ', 'हदबन्दी', 'हरण भएको जिमिदारी नम्बरी', 'हरहिसाब गराइपाऊँ', 'हर्जना दिलाई', 'हाल आवादी', 'हुण्डाबाली', 'हेर्न नहुने मुद्दा हेर्‍यो', '७ नं. फाँटवारी'];
  const muddhakoNaamOptions = [...new Set(originalMuddhaKoNaamOptions)]; // Ensure unique values


  const handleSearch = () => {
    // --- Replace with your actual search logic ---
    console.log("Searching with data:", formData);
    alert('खोज कार्य सुरु गरियो! (कन्सोलमा डाटा हेर्नुहोस्)');
    // Example: Fetch data from an API using formData
    // --- End of example search logic ---
   };

  const handleClear = () => {
    setFormData({
        muddaNo: '', nirnayaNo: '', nyayadhish: '', muddhakoKisim: '',
        ijalashkoNaam: '', faisalakoKisim: '', muddhakoNaam: '', pakshya: '',
        vipakshya: '', faisalaMitiFromYear: '', faisalaMitiFromMonth: '',
        faisalaMitiFromDay: '', faisalaMitiToYear: '', faisalaMitiToMonth: '',
        faisalaMitiToDay: '', shabdabata: '', nekapaBhag: '', nekapaSaal: '',
        nekapaMahina: '', nekapaAnka: '',
       });
       console.log("Form cleared");
   };

  return (
    // Use the .container class from global.css
    <div className="container">

      {/* --- NEW: Header with Back Button and Title --- */}
      <div className="page-header">
         <Link href="/home" className="back-button" aria-label="गृहपृष्ठमा फर्कनुहोस्">
             ←
         </Link>
         <h1 className="page-title">नेपाल कानून पत्रीका खोज</h1>
      </div>
      {/* --- END: New Header --- */}


      {/* Grid wrapper for spacing rows */}
      <div className="grid">

        {/* Row 1 */}
        <div className="row">
          <div>
            <label htmlFor="muddaNo" className="field-label">मुद्दा नं:</label>
            <input type="text" id="muddaNo" name="muddaNo" className="search-box" placeholder={searchPlaceholder} value={formData.muddaNo} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="nirnayaNo" className="field-label">निर्णय नं:</label>
            <input type="text" id="nirnayaNo" name="nirnayaNo" className="search-box" placeholder={searchPlaceholder} value={formData.nirnayaNo} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="nyayadhish" className="field-label">न्यायाधीश:</label>
            <input type="text" id="nyayadhish" name="nyayadhish" className="search-box" placeholder={searchPlaceholder} value={formData.nyayadhish} onChange={handleChange} />
          </div>
        </div>

        {/* Row 2 */}
        <div className="row">
          <div>
              <label className="field-label">मुद्दाको किसिम:</label>
              <ScrollPicker options={muddhakoKisimOptions} placeholder={selectPlaceholder} value={formData.muddhakoKisim} onSelect={(v) => handleSelect('muddhakoKisim', v)} ariaLabel="मुद्दाको किसिम" />
          </div>
           <div>
               <label className="field-label">इजलासको नाम:</label>
              <ScrollPicker options={ijalashkoNaamOptions} placeholder={selectPlaceholder} value={formData.ijalashkoNaam} onSelect={(v) => handleSelect('ijalashkoNaam', v)} ariaLabel="इजलासको नाम" />
          </div>
          <div>
              <label className="field-label">फैसलाको किसिम:</label>
              <ScrollPicker options={faisalakoKisimOptions} placeholder={selectPlaceholder} value={formData.faisalakoKisim} onSelect={(v) => handleSelect('faisalakoKisim', v)} ariaLabel="फैसलाको किसिम" />
          </div>
        </div>

         {/* Row 3 */}
         <div className="row">
           <div>
              <label className="field-label">मुद्दाको नाम:</label>
              <ScrollPicker options={muddhakoNaamOptions} placeholder={selectPlaceholder} value={formData.muddhakoNaam} onSelect={(v) => handleSelect('muddhakoNaam', v)} ariaLabel="मुद्दाको नाम" />
          </div>
          <div>
            <label htmlFor="pakshya" className="field-label">पक्ष:</label>
            <input type="text" id="pakshya" name="pakshya" className="search-box" placeholder={searchPlaceholder} value={formData.pakshya} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="vipakshya" className="field-label">विपक्ष:</label>
            <input type="text" id="vipakshya" name="vipakshya" className="search-box" placeholder={searchPlaceholder} value={formData.vipakshya} onChange={handleChange} />
          </div>
        </div>

        {/* Row 4 (Two Columns with Combined Date Picker) */}
        <div className="row-two-col">
          {/* Combined Date Range Picker */}
          <div>
            <label className="field-label">फैसला मिति:</label>
            <div className="date-range-picker">
              {/* From Date - Combined Look */}
              <div className="date-part-combined">
                  <ScrollPicker options={years} placeholder={datePlaceholders.year} ariaLabel="सुरुको वर्ष" value={formData.faisalaMitiFromYear} onSelect={(v) => handleSelect('faisalaMitiFromYear', v)} />
                  <span className="date-picker-separator">/</span>
                  <ScrollPicker options={months} placeholder={datePlaceholders.month} ariaLabel="सुरुको महिना" value={formData.faisalaMitiFromMonth} onSelect={(v) => handleSelect('faisalaMitiFromMonth', v)} />
                  <span className="date-picker-separator">/</span>
                  <ScrollPicker options={days} placeholder={datePlaceholders.day} ariaLabel="सुरुको दिन" value={formData.faisalaMitiFromDay} onSelect={(v) => handleSelect('faisalaMitiFromDay', v)} />
              </div>
              <span className="date-range-label">देखि</span>
              {/* To Date - Combined Look */}
              <div className="date-part-combined">
                   <ScrollPicker options={years} placeholder={datePlaceholders.year} ariaLabel="अन्त्यको वर्ष" value={formData.faisalaMitiToYear} onSelect={(v) => handleSelect('faisalaMitiToYear', v)} />
                   <span className="date-picker-separator">/</span>
                   <ScrollPicker options={months} placeholder={datePlaceholders.month} ariaLabel="अन्त्यको महिना" value={formData.faisalaMitiToMonth} onSelect={(v) => handleSelect('faisalaMitiToMonth', v)} />
                   <span className="date-picker-separator">/</span>
                   <ScrollPicker options={days} placeholder={datePlaceholders.day} ariaLabel="अन्त्यको दिन" value={formData.faisalaMitiToDay} onSelect={(v) => handleSelect('faisalaMitiToDay', v)} />
              </div>
              <span className="date-range-label">सम्म</span>
            </div>
          </div>

          {/* Shabdabata */}
          <div>
             <label htmlFor="shabdabata" className="field-label">शब्दबाट:</label>
             <input type="text" id="shabdabata" name="shabdabata" className="search-box" placeholder="खोज चाहेको शब्द नेपाली युनिकोडमा टाइप गर्नुहोस्" value={formData.shabdabata} onChange={handleChange} />
          </div>
        </div>

        {/* Row 5 (Ne.Ka.Paa Vivaran) - This div now acts as a grid item */}
        <div>
          <label className="field-label">ने.का.प विवरण:</label>
          <div className="nekapa-vivaran">
              <label className="field-label" htmlFor="nekapaBhag">भाग</label>
              <input type="text" id="nekapaBhag" name="nekapaBhag" className="small-input" value={formData.nekapaBhag} onChange={handleChange} />
              <label className="field-label">साल</label>
              <ScrollPicker options={years} placeholder={selectPlaceholder} ariaLabel="नेकाप साल" value={formData.nekapaSaal} onSelect={(v) => handleSelect('nekapaSaal', v)} />
              <label className="field-label">महिना</label>
              <ScrollPicker options={months} placeholder={selectPlaceholder} ariaLabel="नेकाप महिना" value={formData.nekapaMahina} onSelect={(v) => handleSelect('nekapaMahina', v)} />
              <label className="field-label">अंक</label>
              <ScrollPicker options={ankaOptions} placeholder={selectPlaceholder} ariaLabel="नेकाप अंक" value={formData.nekapaAnka} onSelect={(v) => handleSelect('nekapaAnka', v)} />
          </div>
        </div>

      </div> {/* End of Grid Wrapper */}


      {/* Button Row */}
      <div className="button-container">
        <button className="button button-clear" onClick={handleClear}>खाली गर्नुहोस्</button>
        <button className="button button-search" onClick={handleSearch}>खोज्नुहोस्</button>
      </div>

       {/* --- REMOVED: Optional Link back to homepage ---
       <p style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link href="/home">go to homepage</Link>
       </p>
       */}

    </div> // End of container
  );
}

// Optional: Add metadata specific to the search page
// import type { Metadata } from 'next';
// export const metadata: Metadata = {
//   title: 'कानून खोज - नेपाल कानून पत्रीका',
//   description: 'नेपाल कानून पत्रीका खोज्नका लागि फारम।',
// };