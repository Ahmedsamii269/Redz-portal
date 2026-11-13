import { Candidate, JobOffer } from '../types';

export interface EligibilityResult {
  isEligible: boolean;
  warnings: string[];
  successes: string[];
  extractedAge?: number;
  extractedBirthDate?: string;
}

/**
 * Extracts candidate age and birthdate from Egyptian 14-digit National ID
 * Formula:
 * 1st digit: Century (2 = 1900-1999, 3 = 2000-2099)
 * 2nd & 3rd digit: Year of birth
 * 4th & 5th digit: Month of birth
 * 6th & 7th digit: Day of birth
 */
export function extractDataFromNationalId(idNumber?: string): { age?: number; birthDateStr?: string } {
  if (!idNumber || idNumber.trim().length !== 14 || !/^\d{14}$/.test(idNumber.trim())) {
    return {};
  }

  const clean = idNumber.trim();
  const century = clean.charAt(0);
  const yy = parseInt(clean.substring(1, 3), 10);
  const mm = parseInt(clean.substring(3, 5), 10);
  const dd = parseInt(clean.substring(5, 7), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return {};
  }

  let birthYear = 0;
  if (century === '2') {
    birthYear = 1900 + yy;
  } else if (century === '3') {
    birthYear = 2000 + yy;
  } else {
    return {};
  }

  const birthDate = new Date(birthYear, mm - 1, dd);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return {
    age,
    birthDateStr: `${birthYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  };
}

/**
 * Performs automated eligibility check for candidate against selected company rules
 */
export function checkCandidateEligibility(params: {
  company: string;
  language?: string;
  graduateStatus: 'Graduate' | 'Not graduate' | 'Student';
  hasExperience: boolean;
  experienceDuration?: string;
  experienceTypes?: string[];
  area?: string;
  idNumber?: string;
  manualAge?: number;
}): EligibilityResult {
  const warnings: string[] = [];
  const successes: string[] = [];

  const comp = params.company.toLowerCase();
  const lang = (params.language || 'English').toLowerCase();

  // 1. Age Resolution (from National ID or manual input)
  const idData = extractDataFromNationalId(params.idNumber);
  const effectiveAge = params.manualAge ?? idData.age;

  if (idData.age) {
    successes.push(`Age auto-verified from National ID: ${idData.age} years`);
  }

  // 2. Company-specific Age Limits
  if (effectiveAge !== undefined) {
    if (comp.includes('total trip')) {
      if (effectiveAge > 30) {
        warnings.push(`Total Trip max age is 30. Candidate is ${effectiveAge} years old.`);
      } else {
        successes.push(`Age (${effectiveAge}) meets Total Trip maximum age (30).`);
      }
    } else if (comp.includes('lts')) {
      if (effectiveAge > 35 || effectiveAge < 18) {
        warnings.push(`LTS age requirement is 18 to 35. Candidate is ${effectiveAge} years old.`);
      } else {
        successes.push(`Age (${effectiveAge}) is within LTS limits (18-35).`);
      }
    } else if (comp.includes('eclerx')) {
      if (effectiveAge > 35) {
        warnings.push(`eClerx max age is 35. Candidate is ${effectiveAge} years old.`);
      } else {
        successes.push(`Age (${effectiveAge}) meets eClerx age limit (35).`);
      }
    } else if (comp.includes('alorica')) {
      if (effectiveAge > 40) {
        warnings.push(`Alorica max age is 40. Candidate is ${effectiveAge} years old.`);
      } else {
        successes.push(`Age (${effectiveAge}) meets Alorica age limit (40).`);
      }
    } else if (comp.includes('ttec') || comp.includes('teleperformance')) {
      if (effectiveAge > 45) {
        warnings.push(`${params.company} max age is 45. Candidate is ${effectiveAge} years old.`);
      } else {
        successes.push(`Age (${effectiveAge}) is within ${params.company} limit (45).`);
      }
    }
  }

  // 3. Education / Graduation Status Rules
  if (comp.includes('ttec')) {
    if (params.graduateStatus !== 'Graduate') {
      warnings.push(`TTEC strictly requires University Graduates. Candidate is marked as "${params.graduateStatus}".`);
    } else {
      successes.push(`Education status matches TTEC requirement (Graduates only).`);
    }
  } else if (comp.includes('teleperformance')) {
    if (params.graduateStatus !== 'Graduate') {
      warnings.push(`Teleperformance requires Graduates only. Candidate is "${params.graduateStatus}".`);
    } else {
      successes.push(`Education status matches Teleperformance (Graduates only).`);
    }
  } else if (comp.includes('eclerx')) {
    if (params.graduateStatus !== 'Graduate') {
      warnings.push(`eClerx requires University Graduates only.`);
    } else {
      successes.push(`Education status matches eClerx requirement.`);
    }
  } else if (comp.includes('alorica')) {
    if (params.graduateStatus === 'Student') {
      warnings.push(`Alorica accepts Graduates and Dropped Out, but students are NOT accepted.`);
    } else {
      successes.push(`Education status is accepted by Alorica.`);
    }
  } else if (comp.includes('total trip') || comp.includes('dial expert') || comp.includes('lts') || comp.includes('global results')) {
    successes.push(`${params.company} accepts both Graduates and Undergraduates.`);
  }

  // 4. Experience Requirements
  if (comp.includes('ttec') && lang.includes('french')) {
    if (!params.hasExperience) {
      warnings.push(`TTEC French Sales Account requires minimum 1 year sales experience.`);
    } else {
      successes.push(`Prior sales experience provided for TTEC French.`);
    }
  } else if (comp.includes('ttec') && comp.includes('outbound')) {
    if (!params.hasExperience) {
      warnings.push(`TTEC Outbound Sales requires 1-2 years experience in Sales.`);
    } else {
      successes.push(`Candidate has experience for TTEC Outbound.`);
    }
  } else if (comp.includes('eclerx')) {
    if (!params.hasExperience) {
      warnings.push(`eClerx requires previous BPO / Customer Service experience.`);
    } else {
      successes.push(`Candidate has prior BPO experience for eClerx.`);
    }
  } else if (comp.includes('creative basket')) {
    if (!params.hasExperience) {
      warnings.push(`Creative Basket requires minimum 3 months sales experience.`);
    } else {
      successes.push(`Prior sales experience provided for Creative Basket.`);
    }
  }

  // 5. Geographic Location / Residence Check
  const areaLower = (params.area || '').toLowerCase();
  if (comp.includes('creative basket')) {
    const isEastCairo =
      areaLower.includes('new cairo') ||
      areaLower.includes('tagamoa') ||
      areaLower.includes('madinaty') ||
      areaLower.includes('rehab') ||
      areaLower.includes('sherouk') ||
      areaLower.includes('nasr city') ||
      areaLower.includes('makram');
    if (params.area && !isEastCairo) {
      warnings.push(`Creative Basket prefers residents of New Cairo / Madinaty / Rehab / Sherouk / Nasr City.`);
    }
  } else if (comp.includes('global results') || comp.includes('total trip')) {
    if (
      params.area &&
      (areaLower.includes('alex') ||
        areaLower.includes('mansoura') ||
        areaLower.includes('tanta') ||
        areaLower.includes('assiut') ||
        areaLower.includes('ismailia'))
    ) {
      warnings.push(`${params.company} strictly requires Greater Cairo residents.`);
    }
  }

  return {
    isEligible: warnings.length === 0,
    warnings,
    successes,
    extractedAge: effectiveAge,
    extractedBirthDate: idData.birthDateStr
  };
}
